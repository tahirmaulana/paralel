// @file packages/shared/relay/types.ts
import type { Hex } from 'viem';

export interface RegisterAuctionInput {
  auctionKey: Hex;
  consignor: `0x${string}`;
  guarantor: `0x${string}`;
  notary: `0x${string}`;
  category: number;
  specHash: Hex;
  startingBid: bigint;
  bidIncrement: bigint;
  openAt: bigint;
  durationHours: number;
  confirmationCodeHash: Hex;
  notarySig: Hex;
  consignorSig: Hex;
  notaryNonce: bigint;
  notaryExpiry: bigint;
  consignorNonce: bigint;
  consignorExpiry: bigint;
}

export interface SubmitAwardSignatureInput {
  auctionKey: Hex;
  roundNo: number;
  rank: number;
  nonce: bigint;
  expiry: bigint;
  signature: Hex;
}

export interface WithdrawRefundInput {
  auctionKey: Hex;
  roundNo: number;
  bidder: `0x${string}`;
  nonce: bigint;
  expiry: bigint;
  signature: Hex;
}

// ─── Guarantor ───────────────────────────────────────────────

export interface SubmitGuarantorApprovalInput {
  auctionKey: Hex;
  specHash: Hex;
  guarantorWallet: `0x${string}`;
  nonce: bigint;
  expiry: bigint;
  signature: Hex;
  auctionId: string;
}

export interface SubmitGuarantorRejectionInput {
  auctionKey: Hex;
  guarantorWallet: `0x${string}`;
  nonce: bigint;
  expiry: bigint;
  reason: string;
  signature: Hex;
  auctionId: string;
}

export interface SubmitCollectedInput {
  auctionKey: Hex;
  roundNo: number;
  guarantorWallet: `0x${string}`;
  nonce: bigint;
  expiry: bigint;
  signature: Hex;
  auctionId: string;
}

export interface SubmitWithdrawnInput {
  auctionKey: Hex;
  roundNo: number;
  guarantorWallet: `0x${string}`;
  nonce: bigint;
  expiry: bigint;
  signature: Hex;
  auctionId: string;
}