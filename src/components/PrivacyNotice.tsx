import { Alert } from './ui/Alert';

export const PrivacyNotice = () => (
  <Alert tone="brand">
    <strong>Privacy:</strong> Files, PDFs, previews, and ZIPs are created in your browser. AI
    actions use the Cloudflare backend OpenAI proxy. Backend draft autosave stores project fields
    and session assets in Cloudflare D1/R2 while you work.
  </Alert>
);
