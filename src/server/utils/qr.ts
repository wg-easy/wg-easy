// ! Auto Imports are not supported in this file

import type { ErrorCorrection } from 'qr';
import { encodeQR } from 'qr';

export function encodeQRCode(config: string): string {
  return tryECCModes((ecc) => {
    return encodeQR(config, 'svg', {
      ecc,
      scale: 2,
      encoding: 'byte',
    });
  });
}

export function encodeQRCodeTerm(config: string): string {
  return tryECCModes((ecc) => {
    return encodeQR(config, 'term', {
      ecc,
      encoding: 'byte',
    });
  });
}

function tryECCModes<T>(callback: (ecc: ErrorCorrection) => T): T {
  // defined manually, as qr's ECMode is in wrong order
  const ECMode = ['high', 'quartile', 'medium', 'low'] as const;
  for (const ecc of ECMode) {
    try {
      return callback(ecc);
    } catch (err) {
      if (!(err instanceof Error && err.message === 'Capacity overflow')) {
        throw err;
      }
      // retry with lower ecc
    }
  }
  throw new Error(
    'Failed to generate QR code: Capacity overflow at all ECC levels'
  );
}
