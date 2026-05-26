# Etsy Masks Admin

Static React admin panel for preparing printable paper mask bundles for Etsy. The production app
runs on Cloudflare Pages so the free `*.pages.dev` domain can serve both the React app and the
same-origin `/api/*` backend.

## Features

- Product brief editor for title, theme, audience, marketplace, style, description, tags, safety
  note, printing instructions, license, and refund policy.
- Initial idea prompt that drafts the listing fields and mask topic list through the backend OpenAI
  proxy when the Worker is configured.
- Mask topic list and copyable AI image prompts with expected filenames.
- Default prompts target realistic, front-view printable masks with clear eye holes, a white
  background, and no shadows.
- OpenAI Images API generation through Cloudflare Pages Functions. The frontend never stores OpenAI
  keys, Worker URLs, or backend tokens.
- Approximate OpenAI image cost estimates for one mask, missing images, and the full bundle.
- Image preview, dimension reading, approval/rejection, review notes, and topic mapping.
- Browser-only PDF generation with jsPDF for A4 and US Letter printable files.
- Browser canvas generation for Etsy marketplace preview PNGs.
- QA readiness panel with critical, warning, and informational checks.
- JSZip export for a full review archive plus nested Etsy upload ZIP.
- localStorage persistence for project metadata.
- Project JSON export/import for metadata backup.
- Cloudflare Pages Functions backend with D1 project metadata, R2 file backups, and a Cloud saves
  sidebar page for saved-run restore.

## Privacy

Most packaging work happens in your browser. Generated files are not sent anywhere except when you
generate through the backend OpenAI proxy, back up to Cloudflare, or export files from the browser.

OpenAI credentials and backend access policy live only in Cloudflare Pages configuration. The
frontend calls same-origin `/api/*` endpoints and does not contain browser-entered API keys, Worker
URLs, or admin tokens.

Generated binary files are kept in browser memory and backend saves when Cloudflare is reachable.
Export the archive or restore a backend run if files are missing after refreshing the page.

## Local Setup

```bash
npm install
npm run dev
```

Open the local Vite URL printed by the dev server.

## Build

```bash
npm run build
npm run preview
```

The app is static and must work from the built `dist` folder.

## Quality Checks

```bash
npm run lint
npm run format:check
npm run typecheck
npm run test
npm run test:e2e
```

## Cloudflare Pages Deployment

The repository includes `.github/workflows/deploy.yml` for deploying the full app to Cloudflare
Pages. This is the recommended production target because it works on the free `*.pages.dev` domain
without buying a custom domain.

For a beginner-friendly production checklist with Cloudflare Pages, cost notes, and smoke
tests, read [Production Setup Guide For Beginners](docs/production-guide-for-dummies.md).

Production URL shape:

```text
https://etsy-masks-admin.pages.dev/       -> React app
https://etsy-masks-admin.pages.dev/api/*  -> Pages Function backend
```

Create the Cloudflare Pages project once:

```bash
npm run pages:project:create
```

Then configure D1/R2, set the OpenAI Pages secret, and deploy:

```bash
npm run pages:migrate:remote
npm run pages:deploy
```

GitHub Pages can still host a browser-only/static fallback, but backend features require
Cloudflare Pages or another same-origin `/api/*` host.

## Cloudflare Pages Backend

The Cloudflare Pages backend provides:

- `GET /api/health` for Worker capability checks.
- `GET /api/runs` and `POST /api/runs` for selectable saved run history by idea.
- `GET /api/runs/:runId` and `DELETE /api/runs/:runId` for one saved run.
- `PUT /api/runs/:runId/files/:id` and `GET /api/runs/:runId/files/:id` for R2-backed files.
- `GET /api/project` for latest-run compatibility and `DELETE /api/project` for deleting all
  backend data.
- `POST /api/openai/brief` and `POST /api/openai/images` as authenticated OpenAI proxy endpoints.

The first implementation intentionally uses direct uploads up to 50 MB per file. Chunked uploads are
deferred until real backups hit that limit or unreliable network conditions make retries necessary.

### Cloudflare setup

Install dependencies first:

```bash
npm install
```

Create the free-tier Cloudflare resources:

```bash
npx wrangler d1 create etsy_masks_admin
npx wrangler r2 bucket create etsy-masks-admin-backups
```

Copy the returned D1 `database_id` into the root `wrangler.jsonc`. The older standalone Worker
config in `worker/wrangler.toml` is kept only for direct Worker development.

Create the Cloudflare Pages project and OpenAI secret:

```bash
npm run pages:project:create
npm run pages:secret:openai
```

Configure Cloudflare Access for the Pages backend in production:

1. Create a Cloudflare Access application that protects the Pages app or `/api/*`.
2. Keep `AUTH_MODE=access` in the root `wrangler.jsonc`.
3. Set `CLOUDFLARE_ACCESS_TEAM_DOMAIN` and `CLOUDFLARE_ACCESS_AUD` in root `wrangler.jsonc`.
4. Set `CLOUDFLARE_ACCESS_ALLOWED_EMAILS` to the same comma-separated admin email allowlist you use in Cloudflare Access.

The Pages Function verifies the `Cf-Access-Jwt-Assertion` JWT. There is no browser-managed backend
token.

For local Pages development, build the app and start Pages dev:

```bash
npm run pages:migrate:local
npm run pages:dev
```

The Pages dev server serves the built app and Pages Function backend from the same local origin.

Standalone Worker development is still available for backend-only debugging:

```bash
npm run worker:migrate:local
npm run worker:dev
```

Deploy manually when ready:

```bash
npm run pages:migrate:remote
npm run pages:deploy
```

For GitHub Actions deployment, add repository secrets:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

The workflow validates every `main` push. Cloudflare deployment steps run only after those secrets
exist and the root `wrangler.jsonc` has a real D1 `database_id`. Manual workflow runs fail fast if
that setup is incomplete.

### Frontend backend connection

The frontend always calls same-origin `/api/*` routes. It does not accept a Worker URL or token.

Cloudflare Pages satisfies this requirement for free because `*.pages.dev` serves both the static app
and Pages Functions from one origin.

## Image Generation Workflow

1. Configure the Cloudflare Pages OpenAI proxy.
2. Paste an initial bundle idea and fill the product brief with backend AI, or write the brief
   manually.
3. Edit the product brief, then add or adjust mask topics in the image step.
4. Generate one topic image or generate all missing color masks.
5. Review each color mask; approving it auto-generates the matching coloring page when the backend
   OpenAI proxy is ready.
6. Add review notes or explicitly confirm reviewed images.

## Etsy Archive Workflow

1. Generate A4 and US Letter PDFs.
2. Generate marketplace preview images.
3. Review the QA panel.
4. Export the ZIP archive.
5. Open the PDFs and print one sample page.
6. Confirm mask size, eye-hole placement, file count, digital download copy, and IP safety.
7. Manually upload files and listing copy to Etsy.

## Limitations

- Generated files persist after refresh when Cloud saves are configured and reachable.
- OpenAI brief and image generation require a configured Cloudflare Pages OpenAI secret.
- Backend features require a same-origin `/api/*` route. Cloudflare Pages provides this through
  Pages Functions on the free `*.pages.dev` URL.
- Cloudflare direct backup uploads are capped by the Pages `MAX_FILE_BYTES` setting, defaulting to 50
  MB per file.
- Large browser ZIP/PDF generation can be slow or fail if generated files are very large.
- Etsy upload ZIPs over 20MB are marked as a blocking QA issue and may need manual splitting or
  smaller source images.
- The default OpenAI background mode is opaque/white because it tends to match print-ready mask
  examples. Switch to transparent only when you specifically need cutout PNG or WEBP mask assets.
- The default OpenAI image model is `gpt-image-2` with low quality to keep routine generation
  cost-efficient. Switch models or quality only when a specific run needs it.
- OpenAI image costs shown in the app are approximate estimates based on common size/quality
  combinations. Actual billing can vary with token usage and pricing changes.
- `gpt-image-2` currently does not support transparent backgrounds; use GPT Image 1.x models when
  transparent output is required.
- Image dimensions below 2000x2000 are warned because they may print poorly.
- Generated previews are utility marketplace graphics and should still be reviewed manually.
- The app does not validate Etsy policy compliance beyond the included checklist and blocked-term
  scan.

## Troubleshooting

- Blank page after deployment usually means the Vite `base` path is wrong. Cloudflare Pages should
  use `VITE_BASE_PATH="/"`.
- Files disappear after refresh because binary files are not persisted.
- Cloud backup fails with 401 when Cloudflare Access does not provide a valid Access JWT.
- Cloud backup fails with 503 when `AUTH_MODE=access` is enabled but Access vars are missing.
- Cloud backup fails with 413 when a file is larger than the Worker `MAX_FILE_BYTES` setting.
- If OpenAI generation fails, check the Worker `OPENAI_API_KEY`, model access, Access policy, and
  selected transparency/model settings.
- Large ZIP generation can be slow in the browser. Reduce image dimensions or split the upload.
- If image dimensions are too small for print, regenerate at 3000x3000 or higher.
- If the generated Etsy upload ZIP is over 20MB, reduce image sizes or split files manually before
  uploading to Etsy.
