# Production Setup Guide For Beginners

This guide explains how to publish Etsy Masks Admin on Cloudflare Pages without buying a custom
domain.

The short version:

- Cloudflare Pages hosts the React website.
- Cloudflare Pages gives you a free URL like `https://etsy-masks-admin.pages.dev/`.
- Pages Functions handle `/api/*` on the same free domain.
- Saved runs use Cloudflare D1 for metadata and Cloudflare R2 for files.
- OpenAI keys live only in Cloudflare, never in the browser.

## Is It Free?

Mostly, but not completely.

| Item                           | Free?                                | Notes                                                                        |
| ------------------------------ | ------------------------------------ | ---------------------------------------------------------------------------- |
| GitHub repository              | Yes, if public                       | Private repos may need a paid GitHub plan depending on your GitHub usage.    |
| GitHub Actions deploy workflow | Usually yes for this public-repo use | Keep an eye on GitHub account limits if the repo is private or heavily used. |
| Cloudflare account             | Yes                                  | The Free plan is enough for this project to start.                           |
| Cloudflare Pages hosting       | Yes within Free limits               | The app can live at `*.pages.dev`, so no paid domain is required.            |
| Cloudflare Pages Functions     | Yes within Free limits               | Used for `/api/*`. Normal personal/admin usage should fit.                   |
| Cloudflare D1                  | Yes within Free limits               | Stores saved-run metadata.                                                   |
| Cloudflare R2                  | Yes within Free limits               | Stores saved-run files. Very large backups can exceed free usage.            |
| Cloudflare Access              | Yes for small teams                  | Cloudflare Zero Trust Free is listed for teams under 50 users.               |
| Custom domain                  | Not required                         | You can add one later for branding, but the backend works on `*.pages.dev`.  |
| OpenAI API                     | No                                   | Brief and image generation cost money. Manual uploads are free.              |

Official references checked on 2026-05-26:

- Cloudflare Pages Functions setup and routing: https://developers.cloudflare.com/pages/functions/get-started/
- Cloudflare Pages Functions configuration and bindings: https://developers.cloudflare.com/pages/functions/wrangler-configuration/
- Cloudflare Pages direct upload with Wrangler: https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/
- Cloudflare Pages routing and `_routes.json`: https://developers.cloudflare.com/pages/functions/routing/
- Cloudflare pricing and Free plan limits: https://www.cloudflare.com/plans/
- Cloudflare R2 pricing and free tier: https://developers.cloudflare.com/r2/pricing/
- OpenAI API pricing: https://platform.openai.com/docs/pricing

## What You Need Before Starting

You need accounts for:

1. GitHub
2. Cloudflare
3. OpenAI platform

You do not need to buy a domain for this setup.

## Production Shape

The production app uses one free Cloudflare Pages origin:

```text
https://etsy-masks-admin.pages.dev/       -> React app
https://etsy-masks-admin.pages.dev/api/*  -> Pages Function backend
```

This matters because the frontend intentionally does not store:

- Worker URL
- admin token
- OpenAI API key

The backend is the single source of truth.

## Step 1: Merge The Backend PR

Merge the Cloudflare backend PR into `main`.

Current PR:

```text
https://github.com/AuroraPolaire/etsy-masks-admin/pull/5
```

After merging, pull latest `main` locally:

```bash
git checkout main
git pull origin main
npm install
```

Run checks:

```bash
npm run lint
npm run format:check
npm run typecheck
npm run test
npm run build
```

Expected result: all commands pass.

## Step 2: Log In To Cloudflare From Terminal

Run:

```bash
npx wrangler login
```

Your browser opens. Log in to Cloudflare and approve Wrangler.

## Step 3: Create The Cloudflare Pages Project

Run:

```bash
npm run pages:project:create
```

This creates a Pages project named:

```text
etsy-masks-admin
```

The future production URL will be similar to:

```text
https://etsy-masks-admin.pages.dev/
```

## Step 4: Create The D1 Database

Run:

```bash
npx wrangler d1 create etsy_masks_admin
```

Wrangler prints output with a `database_id`.

Copy that ID.

Open:

```text
wrangler.jsonc
```

Find:

```jsonc
"database_id": "replace-with-d1-database-id"
```

Replace it with your real D1 database ID.

Commit and push:

```bash
git add wrangler.jsonc
git commit -m "Configure Cloudflare Pages D1 database"
git push origin main
```

## Step 5: Create The R2 Bucket

Run:

```bash
npx wrangler r2 bucket create etsy-masks-admin-backups
```

The root `wrangler.jsonc` already expects this bucket name:

```jsonc
"bucket_name": "etsy-masks-admin-backups"
```

If you choose a different bucket name, update `wrangler.jsonc`.

## Step 6: Set The OpenAI Secret

Create an OpenAI API key in the OpenAI platform dashboard.

Then run:

```bash
npm run pages:secret:openai
```

Paste the OpenAI API key when prompted.

Do not put the OpenAI key in:

- `.env`
- React code
- GitHub settings
- localStorage
- browser fields

Only Cloudflare Pages should have it.

## Step 7: Configure Cloudflare Access

Cloudflare Access protects the admin app.

In Cloudflare Zero Trust:

1. Go to **Access**.
2. Create an application.
3. Choose **Self-hosted**.
4. Use this application domain:

```text
etsy-masks-admin.pages.dev
```

5. Add a policy that allows only your email address.
6. Save the application.

Cloudflare will show an **Application Audience (AUD)** value. Copy it.

Also note your Cloudflare team domain. It usually looks like:

```text
your-team.cloudflareaccess.com
```

## Step 8: Set Access Variables

Open:

```text
wrangler.jsonc
```

Set these variables:

```jsonc
"CLOUDFLARE_ACCESS_TEAM_DOMAIN": "your-team.cloudflareaccess.com",
"CLOUDFLARE_ACCESS_AUD": "your-access-application-aud",
"CLOUDFLARE_ACCESS_ALLOWED_EMAILS": "you@example.com,helper@example.com"
```

Keep this production value:

```jsonc
"AUTH_MODE": "access"
```

Do not use this in production:

```jsonc
"AUTH_MODE": "none"
```

Commit and push:

```bash
git add wrangler.jsonc
git commit -m "Configure Cloudflare Access for Pages"
git push origin main
```

## Step 9: Add GitHub Secrets For Deployment

In GitHub:

1. Open the repository.
2. Go to **Settings**.
3. Go to **Secrets and variables**.
4. Go to **Actions**.
5. Add these repository secrets:

```text
CLOUDFLARE_API_TOKEN
CLOUDFLARE_ACCOUNT_ID
```

The token must be allowed to deploy Cloudflare Pages and apply D1 migrations.

The GitHub workflow always runs code checks on `main`. It runs the Cloudflare deployment steps only
after these secrets exist and `wrangler.jsonc` contains your real D1 `database_id`. If you run the
workflow manually before that setup is done, it fails early with a clear message.

## Step 10: Run Remote D1 Migrations

Run locally once:

```bash
npm run pages:migrate:remote
```

Expected result: migrations apply successfully.

The GitHub workflow also runs this before deployment.

## Step 11: Deploy To Cloudflare Pages

Option A: GitHub Actions

1. Open GitHub **Actions**.
2. Run **Deploy to Cloudflare Pages** manually.
3. Confirm the workflow did not stop at the Cloudflare deploy config check.

Option B: local terminal

```bash
npm run build
npm run pages:functions:build
npm run pages:deploy
```

Expected result:

```text
https://etsy-masks-admin.pages.dev/
```

loads the app.

## Step 12: Test The Backend Health Endpoint

Open:

```text
https://etsy-masks-admin.pages.dev/api/health
```

If Cloudflare Access is enabled, you may be asked to log in.

Expected JSON includes:

```json
{
  "ok": true,
  "openaiProxyReady": true
}
```

If `openaiProxyReady` is false, Cloudflare Pages does not have `OPENAI_API_KEY`.

## Step 13: Production Smoke Test

Open:

```text
https://etsy-masks-admin.pages.dev/
```

Then test this exact flow:

1. Open the app.
2. Go to **Cloud saves**.
3. Confirm it does not ask for Worker URL, token, or OpenAI key.
4. Click **Refresh**.
5. Confirm Cloud saves are reachable.
6. Go to **Home**.
7. Fill a product idea.
8. Generate a brief.
9. Add or confirm topics.
10. Generate one image.
11. Approve the image.
12. Generate PDFs.
13. Generate previews.
14. Confirm the run appears in **Cloud saves**.
15. Refresh the browser.
16. Restore the saved run.
17. Confirm the brief, topics, and files come back.
18. Export the ZIP.

If all of that works, the app is production-ready for personal/admin use.

## Step 14: Add Cost Safety

OpenAI is the easiest place to accidentally spend money.

Do these before heavy use:

1. Set an OpenAI monthly budget or usage alert.
2. Keep Cloudflare Access and Worker allowlists limited to trusted admin emails.
3. Do not share the production URL publicly unless intended.
4. Watch Cloudflare R2 usage if saved runs include many large files.

## Step 15: Keep A Manual Backup Habit

Cloud saves are useful, but still export important work:

1. Export project JSON after important edits.
2. Export ZIP before deleting local files.
3. Keep Etsy upload ZIPs somewhere outside the app.

## Step 16: What Not To Change

Do not add these back to the frontend:

- Session OpenAI API key
- Worker API URL field
- Admin token field
- Browser-side OpenAI fallback

The backend is responsible for secrets, OpenAI calls, authentication, and saved runs.

## Local Full-Stack Test

For local frontend-only development:

```bash
npm run dev
```

For local Cloudflare Pages full-stack testing:

```bash
npm run pages:migrate:local
npm run pages:dev
```

Open the local URL printed by Wrangler. The Pages dev server serves both:

```text
/       -> built React app
/api/*  -> Pages Function backend
```

Local `pages:dev` uses `AUTH_MODE=none` so you do not need Cloudflare Access locally.

## If Something Fails

### Blank page

Most likely cause: wrong Vite base path.

Cloudflare Pages should use:

```yaml
VITE_BASE_PATH: '/'
```

### `/api/health` returns 401

Cloudflare Access is blocking you.

Check:

- You are logged in with the allowed email.
- Access policy includes your email.
- `CLOUDFLARE_ACCESS_ALLOWED_EMAILS` in `wrangler.jsonc` also includes your email.
- Pages Function receives `Cf-Access-Jwt-Assertion`.

### `/api/health` returns 503

Usually missing Pages config.

Check:

- `OPENAI_API_KEY`
- `CLOUDFLARE_ACCESS_TEAM_DOMAIN`
- `CLOUDFLARE_ACCESS_AUD`
- D1 binding
- R2 binding

### Cloud save fails with 413

One file is too large.

Default limit:

```text
50 MB per file
```

Reduce file size or raise `MAX_FILE_BYTES` only if you understand the Pages Function/R2 impact.

### OpenAI generation works locally but not production

Check:

- Cloudflare Pages has `OPENAI_API_KEY`.
- OpenAI account has billing enabled.
- Selected model is available to the account.
- Cloudflare Access is not rejecting the request.

## Production Ready Checklist

Use this as the final launch checklist:

- [ ] PR #5 merged into `main`.
- [ ] Cloudflare Pages project created.
- [ ] D1 database created.
- [ ] D1 `database_id` committed in root `wrangler.jsonc`.
- [ ] R2 bucket created.
- [ ] `OPENAI_API_KEY` stored as Cloudflare Pages secret.
- [ ] Cloudflare Access app created for `etsy-masks-admin.pages.dev`.
- [ ] Access policy allows only trusted email addresses.
- [ ] `"AUTH_MODE": "access"` in production.
- [ ] GitHub secrets added for Cloudflare deployment.
- [ ] D1 migrations applied remotely.
- [ ] Cloudflare Pages deployed.
- [ ] `/api/health` returns `ok: true`.
- [ ] `/api/health` returns `openaiProxyReady: true`.
- [ ] Full smoke test passes.
- [ ] OpenAI budget or usage alert configured.
