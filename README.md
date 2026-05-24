# Etsy Masks Admin

Static React admin panel for preparing printable paper mask bundles for Etsy. It runs as a static
browser app: no backend, no database, no Etsy integration, and no stored secrets.

## Features

- Product brief editor for title, theme, audience, marketplace, style, description, tags, safety
  note, printing instructions, license, and refund policy.
- Optional initial idea prompt that drafts the listing fields and animal list locally.
- Animal list and copyable AI image prompts with expected filenames.
- Direct browser-side OpenAI Images API generation with a session-only pasted API key.
- Drag-and-drop multi-file upload for PNG, JPG, JPEG, WEBP, PDF, ZIP, TXT, and JSON.
- Image preview, dimension reading, approval/rejection, review notes, and animal mapping.
- Browser-only PDF generation with jsPDF for A4 and US Letter printable files.
- Browser canvas generation for Etsy marketplace preview PNGs.
- QA readiness panel with critical, warning, and informational checks.
- JSZip export for a full review archive plus nested Etsy upload ZIP.
- localStorage persistence for project metadata.
- Project JSON export/import for metadata backup.

## Privacy

Most processing happens in your browser. Uploaded files are not sent anywhere unless you explicitly
click OpenAI image generation, which sends the generated text prompt to OpenAI's Images API.

The OpenAI API key is stored only in React state for the current tab session. It is not saved to
localStorage, project JSON, ZIP manifests, or exports. The app uses no backend services, no Firebase,
no Supabase, and no serverless functions.

Uploaded binary files are kept in browser memory only and disappear after refresh. Export the archive
or re-upload files after refreshing the page.

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

## Image Generation Workflow

1. Optionally paste an initial bundle idea and fill the product brief.
2. Edit the product brief and animal list.
3. Paste an OpenAI API key for the current session.
4. Generate one animal image or generate all missing images.
5. Review generated files, repair mappings if needed, and approve or reject each image.
6. Add review notes or explicitly confirm reviewed images.

You can still upload externally generated files manually and map them to animals.

## Etsy Archive Workflow

1. Generate A4 and US Letter PDFs.
2. Generate marketplace preview images.
3. Review the QA panel.
4. Export the final ZIP archive.
5. Open the PDFs and print one sample page.
6. Confirm mask size, eye-hole placement, file count, digital download copy, and IP safety.
7. Manually upload files and listing copy to Etsy.

## Limitations

- Uploaded files do not persist after refresh.
- The pasted OpenAI API key does not persist after refresh.
- OpenAI image generation requires a valid API key and network access from the browser.
- Large browser ZIP/PDF generation can be slow or fail if source files are very large.
- Etsy upload ZIPs over 20MB are marked as a blocking QA issue and may need manual splitting or
  smaller source images.
- `gpt-image-2` currently does not support transparent backgrounds; use GPT Image 1.x models for
  transparent PNG or WEBP mask assets.
- Image dimensions below 2000x2000 are warned because they may print poorly.
- Generated previews are utility marketplace graphics and should still be reviewed manually.
- The app does not validate Etsy policy compliance beyond the included checklist and blocked-term
  scan.

## Troubleshooting

- Blank page on GitHub Pages usually means the Vite `base` path is wrong. Set `VITE_BASE_PATH` to
  `"/<REPO>/"`.
- Files disappear after refresh because binary files are not persisted.
- API keys disappear after refresh because they are intentionally session-only.
- If OpenAI generation fails, check the key, model access, browser network access, and selected
  transparency/model settings.
- Large ZIP generation can be slow in the browser. Reduce image dimensions or split the upload.
- If image dimensions are too small for print, regenerate at 3000x3000 or higher.
- If the generated Etsy upload ZIP is over 20MB, reduce image sizes or split files manually before
  uploading to Etsy.
