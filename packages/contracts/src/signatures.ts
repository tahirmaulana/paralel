import type { Hex } from 'viem';

import type { SplitContractSignature } from './types';

export function splitContractSignature(
  signature: Hex,
): SplitContractSignature {
  if (signature.length !== 132) {
    throw new Error(
      'Signature must be exactly 65 bytes',
    );
  }

  const r = `0x${signature.slice(2, 66)}` as Hex;
  const s = `0x${signature.slice(66, 130)}` as Hex;

  let v = Number.parseInt(
    signature.slice(130, 132),
    16,
  );

  if (v < 27) {
    v += 27;
  }

  if (v !== 27 && v !== 28) {
    throw new Error(
      `Invalid ECDSA recovery value: ${v}`,
    );
  }

  return { v, r, s };
}

/**
 * Temporary compatibility export.
 */
export const splitSignature =
  splitContractSignature;