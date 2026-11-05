// @file packages/shared/relay/sign.ts
// Helper EIP-712 — kompatibel dengan _verifySig di ParalelAuction.sol.

import {
  keccak256,
  encodeAbiParameters,
  parseAbiParameters,
  toBytes,
  type Hex,
} from 'viem';

// uint8..uint32 di viem v2 di-map ke `number`, bukan `bigint`.
const PARAMS_TYPES = parseAbiParameters(
  'uint128 startingBid, uint128 bidIncrement, uint64 openAt, uint16 durationHours'
);

export function computeParamsHash(
  startingBid: bigint,
  bidIncrement: bigint,
  openAt: bigint,
  durationHours: number,
): Hex {
  return keccak256(
    encodeAbiParameters(PARAMS_TYPES, [
      startingBid,
      bidIncrement,
      openAt,
      durationHours,
    ]),
  );
}

export function computeConfirmationCodeHash(code: string): Hex {
  return keccak256(toBytes(code));
}

export function computeAuctionKey(auctionCode: string): Hex {
  return keccak256(toBytes(auctionCode));
}

export function eip712Domain(
  chainId: number,
  verifyingContract: `0x${string}`,
) {
  return {
    name: 'ParalelAuction',
    version: '1',
    chainId,
    verifyingContract,
  } as const;
}

export const NOTARY_APPROVAL_TYPES = {
  NotaryApproval: [
    { name: 'auctionKey', type: 'bytes32' },
    { name: 'paramsHash', type: 'bytes32' },
    { name: 'confirmationCodeHash', type: 'bytes32' },
    { name: 'nonce', type: 'uint256' },
    { name: 'expiry', type: 'uint256' },
  ],
} as const;

export const CONSIGNOR_CONFIRM_TYPES = {
  ConsignorConfirm: [
    { name: 'auctionKey', type: 'bytes32' },
    { name: 'confirmationCodeHash', type: 'bytes32' },
    { name: 'nonce', type: 'uint256' },
    { name: 'expiry', type: 'uint256' },
  ],
} as const;

export const AWARD_SIGN_TYPES = {
  AwardSign: [
    { name: 'auctionKey', type: 'bytes32' },
    { name: 'roundNo', type: 'uint16' },
    { name: 'rank', type: 'uint8' },
    { name: 'nonce', type: 'uint256' },
    { name: 'expiry', type: 'uint256' },
  ],
} as const;

export const COLLECTED_TYPES = {
  Collected: [
    { name: 'auctionKey', type: 'bytes32' },
    { name: 'roundNo', type: 'uint16' },
    { name: 'nonce', type: 'uint256' },
    { name: 'expiry', type: 'uint256' },
  ],
} as const;

export const WITHDRAWN_TYPES = {
  Withdrawn: [
    { name: 'auctionKey', type: 'bytes32' },
    { name: 'roundNo', type: 'uint16' },
    { name: 'nonce', type: 'uint256' },
    { name: 'expiry', type: 'uint256' },
  ],
} as const;

export const WITHDRAW_REQUEST_TYPES = {
  WithdrawRequest: [
    { name: 'auctionKey', type: 'bytes32' },
    { name: 'roundNo', type: 'uint16' },
    { name: 'wallet', type: 'address' },
    { name: 'nonce', type: 'uint256' },
    { name: 'expiry', type: 'uint256' },
  ],
} as const;

export function splitSignature(signature: Hex): {
  v: number;
  r: Hex;
  s: Hex;
} {
  if (signature.length !== 132) {
    throw new Error('Signature must be 65 bytes (132 hex chars including 0x)');
  }

  const r = `0x${signature.slice(2, 66)}` as Hex;
  const s = `0x${signature.slice(66, 130)}` as Hex;

  let v = parseInt(signature.slice(130, 132), 16);
  if (v < 27) v += 27;

  return { v, r, s };
}

// ─── Guarantor (off-chain only types) ────────────────────────
// Ref: PARALEL.md Lampiran D12.3
//
// GuarantorApproval/GuarantorRejection tidak ada di kontrak — diverifikasi
// backend via verifyTypedData, tidak pernah disubmit on-chain.

export const GUARANTOR_APPROVAL_TYPES = {
  GuarantorApproval: [
    { name: 'auctionKey', type: 'bytes32' },
    { name: 'specHash', type: 'bytes32' },
    { name: 'nonce', type: 'uint256' },
    { name: 'expiry', type: 'uint256' },
  ],
} as const;

export const GUARANTOR_REJECTION_TYPES = {
  GuarantorRejection: [
    { name: 'auctionKey', type: 'bytes32' },
    { name: 'reasonHash', type: 'bytes32' },
    { name: 'nonce', type: 'uint256' },
    { name: 'expiry', type: 'uint256' },
  ],
} as const;

/**
 * reasonHash = keccak256(toBytes(reason)) — dipakai di EIP-712
 * GuarantorRejection. Plaintext reason disimpan di attestations.payload.
 */
export function computeReasonHash(reason: string): Hex {
  return keccak256(toBytes(reason));
}