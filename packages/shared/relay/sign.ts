// @file packages/shared/relay/sign.ts

/**
 * Compatibility layer untuk consumer relay lama.
 *
 * Seluruh hashing, EIP-712 typed data, domain, dan signature splitting
 * sekarang bersumber dari package canonical:
 *
 * packages/contracts
 *
 * File ini mempertahankan nama fungsi dan bentuk parameter lama agar
 * consumer existing tidak harus langsung diubah seluruhnya.
 */

import type {
  Address,
  Hex,
} from 'viem';

import {
  AWARD_SIGN_TYPES,
  COLLECTED_TYPES,
  CONSIGNOR_CONFIRM_TYPES,
  GUARANTOR_APPROVAL_TYPES,
  GUARANTOR_REJECTION_TYPES,
  NOTARY_APPROVAL_TYPES,
  WITHDRAWN_TYPES,
  WITHDRAW_REQUEST_TYPES,
  computeAuctionKey as computeCanonicalAuctionKey,
  computeAuctionParamsHash,
  computeConfirmationCodeHash as computeCanonicalConfirmationCodeHash,
  computeReasonHash as computeCanonicalReasonHash,
  getParalelEip712Domain,
  splitContractSignature,
} from '@paralel/contracts';

export {
  AWARD_SIGN_TYPES,
  COLLECTED_TYPES,
  CONSIGNOR_CONFIRM_TYPES,
  GUARANTOR_APPROVAL_TYPES,
  GUARANTOR_REJECTION_TYPES,
  NOTARY_APPROVAL_TYPES,
  WITHDRAWN_TYPES,
  WITHDRAW_REQUEST_TYPES,
};

export const CONSIGNOR_CONFIRM_PRIMARY_TYPE =
  'ConsignorConfirm' as const;

/**
 * Compatibility wrapper.
 *
 * Consumer lama menggunakan empat positional arguments, sedangkan fungsi
 * canonical menggunakan satu object.
 */
export function computeParamsHash(
  startingBid: bigint,
  bidIncrement: bigint,
  openAt: bigint,
  durationHours: number,
): Hex {
  return computeAuctionParamsHash({
    startingBid,
    bidIncrement,
    openAt,
    durationHours,
  });
}

/**
 * Menghasilkan hash confirmation code menggunakan implementasi canonical.
 */
export function computeConfirmationCodeHash(
  code: string,
): Hex {
  return computeCanonicalConfirmationCodeHash(
    code,
  );
}

/**
 * Menghasilkan auctionKey dari auctionCode menggunakan implementasi canonical.
 */
export function computeAuctionKey(
  auctionCode: string,
): Hex {
  return computeCanonicalAuctionKey(
    auctionCode,
  );
}

/**
 * Compatibility wrapper untuk EIP-712 domain lama.
 */
export function eip712Domain(
  chainId: number,
  verifyingContract: Address,
) {
  return getParalelEip712Domain(
    chainId,
    verifyingContract,
  );
}

/**
 * Compatibility wrapper untuk signature splitter lama.
 */
export function splitSignature(
  signature: Hex,
): {
  v: number;
  r: Hex;
  s: Hex;
} {
  return splitContractSignature(
    signature,
  );
}

/**
 * Menghasilkan hash alasan rejection menggunakan implementasi canonical.
 */
export function computeReasonHash(
  reason: string,
): Hex {
  return computeCanonicalReasonHash(
    reason,
  );
}
