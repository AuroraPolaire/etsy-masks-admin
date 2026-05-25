# Etsy Masks Admin

Static React admin panel for preparing printable paper mask bundles for Etsy. The primary app runs
from GitHub Pages, with an optional Cloudflare Worker backend for D1/R2 backups and server-side
OpenAI proxying.

## Features

- Product brief editor for title, theme, audience, marketplace, style, description, tags, safety
  note, printing instructions, license, and refund policy.
- Optional initial idea prompt that drafts the listing fields and mask topic list with OpenAI when
  a session key is pasted, or with a local fallback when no key is present.
- Mask topic list and copyable AI image prompts with expected filenames.
- Default prompts target realistic, front-view printable masks with clear eye holes, a white
  background, and no shadows.
- OpenAI Images API generation with either a session-only pasted API key or the optional
  Cloudflare OpenAI proxy.
- Approximate OpenAI image cost estimates for one mask, missing images, and the full bundle.
- Drag-and-drop multi-file upload for PNG, JPG, JPEG, WEBP, PDF, ZIP, TXT, and JSON.
- Image preview, dimension reading, approval/rejection, review notes, and topic mapping.
- Browser-only PDF generation with jsPDF for A4 and US Letter printable files.
- Browser canvas generation for Etsy marketplace preview PNGs.
- QA readiness panel with critical, warning, and informational checks.
- JSZip export for a full review archive plus nested Etsy upload ZIP.
- localStorage persistence for project metadata.
- Project JSON export/import for metadata backup.
- Optional Cloudflare Worker backend with D1 project metadata, R2 file backups, and a Backend
  sidebar page for data management.

## Privacy

Most processing happens in your browser. Uploaded files are not sent anywhere unless you explicitly
back up to Cloudflare, generate through OpenAI, or export files from the browser.

The session OpenAI API key and backend admin token are stored only in React state for the current tab
session. They are not saved to localStorage, project JSON, ZIP manifests, or exports. The Worker
stores its OpenAI key and admin token as Cloudflare secrets.

Uploaded binary files are kept in browser memory only unless you explicitly use the Backend page to
back up to Cloudflare R2. Export the archive, back up to Cloudflare, or re-upload files after
refreshing the page.

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

## GitHub Pages Deployment

The repository includes `.github/workflows/deploy.yml` using GitHub Actions Pages deployment.

1. Push this repo to GitHub.
2. In repository settings, open **Pages**.
3. Set **Build and deployment** source to **GitHub Actions**.
4. Confirm the workflow `VITE_BASE_PATH` matches your repository name.

For a project page hosted at:

```text
https://<USERNAME>.github.io/<REPO>/
```

set:

```yaml
VITE_BASE_PATH: '/<REPO>/'
```

The workflow currently uses:

```yaml
VITE_BASE_PATH: '/etsy-masks-admin/'
```

Change that value if you deploy the app from a differently named repository.

## Optional Cloudflare Backend

The Cloudflare backend is optional and keeps GitHub Pages as the frontend host. It provides:

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

Copy the returned D1 `database_id` into `worker/wrangler.toml`.

Create Worker secrets:

```bash
npx wrangler secret put ADMIN_TOKEN --config worker/wrangler.toml
npx wrangler secret put OPENAI_API_KEY --config worker/wrangler.toml
```

For local Worker development, copy `worker/.dev.vars.example` to `worker/.dev.vars` and replace the
placeholder values.

Run migrations and start the Worker locally:

```bash
npm run worker:migrate:local
npm run worker:dev
```

Deploy manually when ready:

```bash
npm run worker:migrate:remote
npm run worker:deploy
```

For GitHub Actions deployment, add repository secrets:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

Then run the `Deploy Cloudflare Worker` workflow manually.

### Frontend backend connection

The Backend sidebar page accepts:

- Worker API URL, for example `https://etsy-masks-admin-api.<account>.workers.dev`
- Admin token matching the `ADMIN_TOKEN` Worker secret

The app does not use build-time frontend env variables for backend behavior. The Worker owns backend
capabilities and limits through its bindings, vars, and secrets. The API URL is stored in
localStorage only for browser convenience. The admin token is session-only.

## Image Generation Workflow

1. Optionally paste an OpenAI API key for the current session, or configure the Backend OpenAI
   proxy.
2. Paste an initial bundle idea and fill the product brief with AI, or use the local fallback
   without a key.
3. Edit the product brief and mask topic list.
4. Generate one topic image or generate all missing images.
5. Review generated files, repair mappings if needed, and approve or reject each image.
6. Add review notes or explicitly confirm reviewed images.

You can still upload externally generated files manually and map them to topics.

## Etsy Archive Workflow

1. Generate A4 and US Letter PDFs.
2. Generate marketplace preview images.
3. Review the QA panel.
4. Export the final ZIP archive.
5. Open the PDFs and print one sample page.
6. Confirm mask size, eye-hole placement, file count, digital download copy, and IP safety.
7. Manually upload files and listing copy to Etsy.

## Limitations

- Uploaded files do not persist after refresh unless you explicitly back them up to Cloudflare.
- The pasted OpenAI API key does not persist after refresh.
- The backend admin token does not persist after refresh.
- OpenAI image generation requires a valid browser session key or a configured Worker OpenAI
  secret.
- Cloudflare direct backup uploads are capped by the Worker `MAX_FILE_BYTES` setting, defaulting to
  50 MB per file.
- Large browser ZIP/PDF generation can be slow or fail if source files are very large.
- Etsy upload ZIPs over 20MB are marked as a blocking QA issue and may need manual splitting or
  smaller source images.
- The default OpenAI background mode is opaque/white because it tends to match print-ready mask
  examples. Switch to transparent only when you specifically need cutout PNG or WEBP mask assets.
- OpenAI image costs shown in the app are approximate estimates based on common size/quality
  combinations. Actual billing can vary with token usage and pricing changes.
- `gpt-image-2` currently does not support transparent backgrounds; use GPT Image 1.x models when
  transparent output is required.
- Image dimensions below 2000x2000 are warned because they may print poorly.
- Generated previews are utility marketplace graphics and should still be reviewed manually.
- The app does not validate Etsy policy compliance beyond the included checklist and blocked-term
  scan.

## Troubleshooting

- Blank page on GitHub Pages usually means the Vite `base` path is wrong. Set `VITE_BASE_PATH` to
  `"/<REPO>/"`.
- Files disappear after refresh because binary files are not persisted.
- API keys disappear after refresh because they are intentionally session-only.
- Backend admin tokens disappear after refresh because they are intentionally session-only.
- Cloud backup fails with 401 when the Backend page token does not match the Worker `ADMIN_TOKEN`.
- Cloud backup fails with 413 when a file is larger than the Worker `MAX_FILE_BYTES` setting.
- If OpenAI generation fails, check the key, model access, browser network access, and selected
  transparency/model settings.
- Large ZIP generation can be slow in the browser. Reduce image dimensions or split the upload.
- If image dimensions are too small for print, regenerate at 3000x3000 or higher.
- If the generated Etsy upload ZIP is over 20MB, reduce image sizes or split files manually before
  uploading to Etsy.
