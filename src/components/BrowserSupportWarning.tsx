import type { BrowserSupportResult } from '../types';

type BrowserSupportWarningProps = {
  result: BrowserSupportResult;
};

export const BrowserSupportWarning = ({ result }: BrowserSupportWarningProps) => {
  if (result.supported) {
    return null;
  }

  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-950">
      <strong>Browser support warning:</strong> Missing {result.missingFeatures.join(', ')}. File
      upload, browser storage, preview generation, PDF generation, or ZIP export may not work.
    </div>
  );
};
