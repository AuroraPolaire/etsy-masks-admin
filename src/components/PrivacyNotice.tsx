export const PrivacyNotice = () => (
  <div className="rounded-lg border border-teal-200 bg-teal-50 p-4 text-sm text-teal-950">
    <strong>Privacy:</strong> Files, PDFs, previews, and ZIP exports are processed in your browser.
    When you generate images, this app sends the selected text prompt to OpenAI using the session key
    you pasted. The key is never saved to localStorage or exports.
  </div>
);
