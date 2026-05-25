import { Alert } from './ui/Alert';

export const PrivacyNotice = () => (
  <Alert tone="brand">
    <strong>Privacy:</strong> Files, PDFs, previews, and ZIP exports are processed in your browser.
    When you generate images, this app sends the selected text prompt to OpenAI using the session
    key you pasted. The key is never saved to localStorage or exports.
  </Alert>
);
