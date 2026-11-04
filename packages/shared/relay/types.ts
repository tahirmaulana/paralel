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
  platformBps: number;
  guarantorBps: number;
  notaryBps: number;
  taxBps: number;
  confirmationCodeHash: Hex;
  notarySig: Hex;
  consignorSig: Hex;
  notaryNonce: bigint;
  notaryExpiry: bigint;
  consignorNonce: bigint;
  consignorExpiry: bigint;
}