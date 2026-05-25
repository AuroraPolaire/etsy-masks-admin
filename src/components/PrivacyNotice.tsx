import { Alert } from './ui/Alert';

export const PrivacyNotice = () => (
  <Alert tone="brand">
    <strong>Privacy:</strong> Files, PDFs, previews, and ZIPs are created in your browser. AI
    actions use your session key or the optional Cloudflare proxy. Cloud backup uploads project data
    only when you explicitly request it.
  </Alert>
);
