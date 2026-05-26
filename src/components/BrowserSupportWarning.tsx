import { Alert } from './ui/Alert';

import type { BrowserSupportResult } from '../types';

type BrowserSupportWarningProps = {
  result: BrowserSupportResult;
};

export const BrowserSupportWarning = ({ result }: BrowserSupportWarningProps) => {
  if (result.supported) {
    return null;
  }

  return (
    <Alert tone="danger" role="alert">
      <strong>Browser issue:</strong> Missing {result.missingFeatures.join(', ')}. Storage, listing
      PDFs, or ZIP export may not work.
    </Alert>
  );
};
