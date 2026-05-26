# Production Setup Guide For Beginners

This guide explains how to publish Etsy Masks Admin with the Cloudflare backend enabled.

The short version:

- The website stays on GitHub Pages.
- The backend runs on Cloudflare Worker.
- Saved runs use Cloudflare D1 for metadata and Cloudflare R2 for files.
- OpenAI keys live only in Cloudflare, never in the browser.
- The frontend talks to the backend through same-origin `/api/*` URLs.

## Is It Free?

Mostly, but not completely.

| Item                           | Free?                                | Notes                                                                                                   |
| ------------------------------ | ------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| GitHub repository              | Yes, if public                       | GitHub Pages is available for public repos on GitHub Free. Private repo Pages needs a paid GitHub plan. |
| GitHub Pages hosting           | Yes, if public repo                  | Good for the static frontend.                                                                           |
| GitHub Actions deploy workflow | Usually yes for this public-repo use | Keep an eye on GitHub account limits if the repo is private or heavily used.                            |
| Cloudflare account             | Yes                                  | The Free plan is enough for this project to start.                                                      |
| Cloudflare DNS and SSL         | Yes                                  | Requires using a domain on Cloudflare.                                                                  |
| Cloudflare Worker              | Yes within Free limits               | Cloudflare lists Free Workers requests and CPU limits. This personal admin tool should fit.             |
| Cloudflare D1                  | Yes within Free limits               | Free D1 quotas are enough for normal saved-run metadata.                                                |
| Cloudflare R2                  | Yes within Free limits               | Free Standard R2 includes storage and operation quotas. Very large saved files can exceed free usage.   |
| Cloudflare Access              | Yes for small teams                  | Cloudflare Zero Trust Free is listed for teams under 50 users.                                          |
| Custom domain                  | No, unless you already own one       | You need a real domain for same-origin `/api/*` routing. A new domain usually costs money every year.   |
| OpenAI API                     | No                                   | Image and brief generation cost money. Manual uploads are free.                                         |

Official references checked on 2026-05-26:

- GitHub Pages availability: https://docs.github.com/en/pages/getting-started-with-github-pages/about-github-pages
- Cloudflare pricing and Free plan limits: https://www.cloudflare.com/plans/
- Cloudflare Workers pricing: https://developers.cloudflare.com/workers/platform/pricing/
- Cloudflare R2 pricing and free tier: https://developers.cloudflare.com/r2/pricing/
- OpenAI API pricing: https://platform.openai.com/docs/pricing

## What You Need Before Starting

You need accounts for:

1. GitHub
2. Cloudflare
3. OpenAI platform

For the recommended GitHub Pages production setup, you also need one domain name, for example:

```text
yourdomain.com
```

You can use a subdomain for the app:

```text
masks-admin.yourdomain.com
```

If you do not already own a domain, this is the main non-free infrastructure requirement.

## Can I Avoid Paying For A Custom Domain?

Yes, but there is a tradeoff.

### Option A: Keep GitHub Pages As The Public Website

If the public app URL is:

```text
https://aurorapolaire.github.io/etsy-masks-admin/
```

then backend features cannot be production-ready with the current same-origin architecture.

Reason: GitHub Pages cannot route:

```text
https://aurorapolaire.github.io/api/*
```

to a Cloudflare Worker.

You can still use the GitHub Pages URL for the browser-only/manual workflow:

- manually fill listing copy
- manually upload images
- generate PDFs/previews in the browser
- export ZIP

But these backend features will not work there:

- backend brief generation
- backend image generation
- Cloud saves
- saved-run restore from R2

### Option B: Use The Free `workers.dev` URL

Cloudflare gives Workers a free `workers.dev` URL, like:

```text
https://etsy-masks-admin-api.your-subdomain.workers.dev/
```

This can avoid buying a custom domain.

To make this production-usable, we would change the Worker so it serves both:

```text
/       -> static frontend
/api/*  -> backend API
```

That keeps the same-origin rule without a paid domain.

Tradeoffs:

- The app URL is a Cloudflare `workers.dev` URL, not a branded domain.
- GitHub Pages is no longer the public user-facing host. It can still be the static build source or
  backup host.
- Cloudflare documents `workers.dev` as intended for personal or hobby projects and recommends a
  route or custom domain for production Workers.
- This needs extra implementation in the Worker because the current Worker only handles `/api/*`.

This is the best zero-domain-cost path for personal/admin usage.

### Option C: Move Static Hosting To Cloudflare Pages

Cloudflare Pages gives a free `*.pages.dev` URL, like:

```text
https://etsy-masks-admin.pages.dev/
```

This can also avoid buying a custom domain, but it stops using GitHub Pages as the frontend host.

This is probably cleaner than proxying GitHub Pages through a Worker, but it changes the deployment
architecture more.

### Recommendation

Use this decision:

| Goal                                                     | Best choice                                        |
| -------------------------------------------------------- | -------------------------------------------------- |
| Keep GitHub Pages as public host and use backend         | Buy/use a custom domain                            |
| Pay nothing for a domain and keep backend                | Use `workers.dev` and let the Worker serve the app |
| Pay nothing for a domain and simplify Cloudflare hosting | Move frontend to Cloudflare Pages                  |
| Pay nothing and keep GitHub Pages only                   | Use browser-only/manual workflow, no backend       |

## Important Concept

The app must use the same domain for the frontend and backend.

Good production shape:

```text
https://masks-admin.yourdomain.com/       -> GitHub Pages static app
https://masks-admin.yourdomain.com/api/*  -> Cloudflare Worker backend
```

Bad production shape:

```text
https://aurorapolaire.github.io/etsy-masks-admin/
https://some-worker-name.workers.dev/api/*
```

The bad shape is not supported by this app because the frontend intentionally does not store a
Worker URL or token. The backend is the single source of truth.

## Step 1: Merge The Backend PR

Merge the Cloudflare backend PR into `main`.

Current PR:

```text
https://github.com/AuroraPolaire/etsy-masks-admin/pull/5
```

After merging, pull the latest `main` locally:

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

## Step 2: Put Your Domain On Cloudflare

In Cloudflare:

1. Open the Cloudflare dashboard.
2. Add your domain.
3. Follow Cloudflare's instructions to change your domain nameservers at your domain registrar.
4. Wait until Cloudflare says the domain is active.

This can take minutes or a few hours.

## Step 3: Choose The Production URL

Pick the final app URL.

Recommended:

```text
masks-admin.yourdomain.com
```

This guide uses that example. Replace it with your real domain.

## Step 4: Configure GitHub Pages

In GitHub:

1. Open the repository.
2. Go to **Settings**.
3. Go to **Pages**.
4. Set **Build and deployment** source to **GitHub Actions**.
5. Set the custom domain to:

```text
masks-admin.yourdomain.com
```

GitHub may ask you to verify the domain. Follow the prompt if it appears.

## Step 5: Update The Frontend Base Path

For a custom domain at the root path, the Vite base path must be `/`.

Open:

```text
.github/workflows/deploy.yml
```

Find:

```yaml
VITE_BASE_PATH: '/etsy-masks-admin/'
```

Change it to:

```yaml
VITE_BASE_PATH: '/'
```

Commit and push:

```bash
git add .github/workflows/deploy.yml
git commit -m "Configure production custom domain base path"
git push origin main
```

## Step 6: Create Cloudflare D1 Database

From the repo root, run:

```bash
npx wrangler login
npx wrangler d1 create etsy_masks_admin
```

Wrangler prints output that includes a `database_id`.

Copy that ID.

Open:

```text
worker/wrangler.toml
```

Find:

```toml
database_id = "replace-with-d1-database-id"
```

Replace it with your real D1 database ID.

Commit and push:

```bash
git add worker/wrangler.toml
git commit -m "Configure production D1 database"
git push origin main
```

## Step 7: Create Cloudflare R2 Bucket

Run:

```bash
npx wrangler r2 bucket create etsy-masks-admin-backups
```

The repo already expects this bucket name in:

```text
worker/wrangler.toml
```

If you choose a different bucket name, update `bucket_name` in `worker/wrangler.toml`.

## Step 8: Set The OpenAI Secret In Cloudflare

Create an OpenAI API key in the OpenAI platform dashboard.

Then run:

```bash
npx wrangler secret put OPENAI_API_KEY --config worker/wrangler.toml
```

Paste the OpenAI API key when prompted.

Do not put the OpenAI key in:

- `.env`
- React code
- GitHub Pages settings
- localStorage
- browser fields

Only Cloudflare Worker should have it.

## Step 9: Configure Cloudflare Access

Cloudflare Access protects the admin backend.

In Cloudflare Zero Trust:

1. Go to **Access**.
2. Create an application.
3. Choose **Self-hosted**.
4. Use this application domain:

```text
masks-admin.yourdomain.com
```

5. Add a policy that allows only your email address.
6. Save the application.

Cloudflare will show an **Application Audience (AUD)** value. Copy it.

Also note your Cloudflare team domain. It usually looks like:

```text
your-team.cloudflareaccess.com
```

## Step 10: Set Worker Access Variables

Set these Cloudflare Worker variables:

```text
CLOUDFLARE_ACCESS_TEAM_DOMAIN
CLOUDFLARE_ACCESS_AUD
CLOUDFLARE_ACCESS_ALLOWED_EMAILS
```

You can set them in the Cloudflare dashboard or in `worker/wrangler.toml`.

For one-user production use, values look like:

```toml
CLOUDFLARE_ACCESS_TEAM_DOMAIN = "your-team.cloudflareaccess.com"
CLOUDFLARE_ACCESS_AUD = "your-access-application-aud"
CLOUDFLARE_ACCESS_ALLOWED_EMAILS = "you@example.com"
```

Keep this production setting:

```toml
AUTH_MODE = "access"
```

Do not use this in production:

```toml
AUTH_MODE = "none"
```

## Step 11: Add GitHub Secrets For Worker Deployment

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

The API token must be allowed to deploy Workers and apply D1 migrations.

## Step 12: Deploy The Worker

Option A: GitHub Actions

1. Open GitHub **Actions**.
2. Run **Deploy Cloudflare Worker** manually.

Option B: local terminal

```bash
npm run worker:migrate:remote
npm run worker:deploy
```

Expected result:

- D1 migrations apply successfully.
- Worker deploy succeeds.

## Step 13: Route `/api/*` To The Worker

In Cloudflare:

1. Open your domain.
2. Go to **Workers Routes**.
3. Add a route:

```text
masks-admin.yourdomain.com/api/*
```

4. Select the Worker:

```text
etsy-masks-admin-api
```

This is the key step that makes same-origin backend calls work.

## Step 14: Route The Website To GitHub Pages

In Cloudflare DNS, create a CNAME record:

```text
Name: masks-admin
Target: aurorapolaire.github.io
Proxy status: Proxied
```

In GitHub Pages, confirm the custom domain is:

```text
masks-admin.yourdomain.com
```

Wait until HTTPS is active.

## Step 15: Deploy The Frontend

Push to `main`, or manually run the GitHub Pages workflow:

```text
Deploy to GitHub Pages
```

Expected result:

```text
https://masks-admin.yourdomain.com/
```

loads the app.

## Step 16: Test The Backend Health Endpoint

Open:

```text
https://masks-admin.yourdomain.com/api/health
```

If Cloudflare Access is enabled, you may be asked to log in.

Expected JSON includes:

```json
{
  "ok": true,
  "openaiProxyReady": true
}
```

If `openaiProxyReady` is false, the Worker does not have `OPENAI_API_KEY`.

## Step 17: Production Smoke Test

Open the app:

```text
https://masks-admin.yourdomain.com/
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
14. Save the run in **Cloud saves**.
15. Refresh the browser.
16. Restore the saved run.
17. Confirm the brief, topics, and files come back.
18. Export the final ZIP.

If all of that works, the app is production-ready for personal/admin use.

## Step 18: Add Cost Safety

OpenAI is the easiest place to accidentally spend money.

Do these before heavy use:

1. Set an OpenAI monthly budget or usage alert.
2. Keep Cloudflare Access allowlist limited to your email.
3. Do not share the production URL publicly unless intended.
4. Watch Cloudflare R2 usage if saved runs include many large files.

## Step 19: Keep A Manual Backup Habit

Cloud saves are useful, but still export important work:

1. Export project JSON after important edits.
2. Export final ZIP before deleting local files.
3. Keep final Etsy upload ZIPs somewhere outside the app.

## Step 20: What Not To Change

Do not add these back to the frontend:

- Session OpenAI API key
- Worker API URL field
- Admin token field
- Browser-side OpenAI fallback

The backend is responsible for secrets, OpenAI calls, authentication, and saved runs.

## If Something Fails

### Blank page

Most likely cause: wrong `VITE_BASE_PATH`.

For custom domain root:

```yaml
VITE_BASE_PATH: '/'
```

### `/api/health` returns 401

Cloudflare Access is blocking you.

Check:

- You are logged in with the allowed email.
- Access policy includes your email.
- Worker receives `Cf-Access-Jwt-Assertion`.

### `/api/health` returns 503

Usually missing Worker config.

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

Reduce file size or raise `MAX_FILE_BYTES` only if you understand the Worker/R2 impact.

### OpenAI generation works locally but not production

Check:

- Production Worker has `OPENAI_API_KEY`.
- OpenAI account has billing enabled.
- Selected model is available to the account.
- Cloudflare Access is not rejecting the request.

## Production Ready Checklist

Use this as the final launch checklist:

- [ ] PR #5 merged into `main`.
- [ ] Custom domain active in Cloudflare.
- [ ] GitHub Pages custom domain configured.
- [ ] `VITE_BASE_PATH` set to `/` for custom domain root.
- [ ] D1 database created.
- [ ] D1 `database_id` committed in `worker/wrangler.toml`.
- [ ] R2 bucket created.
- [ ] `OPENAI_API_KEY` stored as Worker secret.
- [ ] Cloudflare Access app created.
- [ ] Access policy allows only trusted email addresses.
- [ ] `AUTH_MODE = "access"` in production.
- [ ] GitHub secrets added for Worker deploy.
- [ ] D1 migrations applied remotely.
- [ ] Worker deployed.
- [ ] Cloudflare route sends `/api/*` to Worker.
- [ ] Frontend deployed to GitHub Pages.
- [ ] `/api/health` returns `ok: true`.
- [ ] `/api/health` returns `openaiProxyReady: true`.
- [ ] Full smoke test passes.
- [ ] OpenAI budget or usage alert configured.
