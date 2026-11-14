import type {
  Hex,
} from "viem";

import type {
  DerivedNotarySigningMaterial,
} from "./approval-snapshot";

export const notaryHexToBytea = (
  value: Hex,
): string =>
  `\\x${value
    .slice(2)
    .toLowerCase()}`;

export const createNotaryApprovalPayload =
  (
    material:
      DerivedNotarySigningMaterial,
  ): Readonly<{
    auctionKey: Hex;
    paramsHash: Hex;
    confirmationCodeHash: Hex;
    nonce: string;
    expiry: string;
    derivation: string;
  }> =>
    Object.freeze({
      auctionKey:
        material.auctionKey,
      paramsHash:
        material.paramsHash,
      confirmationCodeHash:
        material.codeHash,
      nonce:
        material.nonce
          .toString(),
      expiry:
        material.expiry
          .toString(),
      derivation:
        material.derivation,
    });
