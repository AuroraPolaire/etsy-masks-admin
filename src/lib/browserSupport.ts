import type { BrowserSupportResult } from '../types';

const canUseLocalStorage = (): boolean => {
  try {
    const key = '__etsy_masks_admin_support_check__';
    window.localStorage.setItem(key, '1');
    window.localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
};

export const checkBrowserSupport = (): BrowserSupportResult => {
  const missingFeatures: string[] = [];

  if (!('File' in window) || !('FileReader' in window)) {
    missingFeatures.push('File API');
  }

  if (!('fetch' in window)) {
    missingFeatures.push('fetch');
  }

  if (!('Blob' in window)) {
    missingFeatures.push('Blob');
  }

  if (!('URL' in window) || typeof URL.createObjectURL !== 'function') {
    missingFeatures.push('URL.createObjectURL');
  }

  const canvas = document.createElement('canvas');
  if (!canvas.getContext || !canvas.getContext('2d')) {
    missingFeatures.push('canvas');
  }

  if (!canUseLocalStorage()) {
    missingFeatures.push('localStorage');
  }

  return {
    supported: missingFeatures.length === 0,
    missingFeatures,
  };
};
