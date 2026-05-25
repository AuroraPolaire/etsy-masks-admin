import { Alert } from './ui/Alert';

export const PrivacyNotice = () => (
  <Alert tone="brand">
    <strong>Privacy:</strong> Files, PDFs, previews, and ZIPs are created in your browser. AI
    actions send only the active idea or image prompt to OpenAI with your session key. The key is
    never saved or exported.
  </Alert>
);
