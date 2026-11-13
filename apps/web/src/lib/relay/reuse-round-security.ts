import {
  ContractAuctionStatus,
  type AuctionConfigSnapshotState,
  type AuctionContractState,
} from '@paralel/contracts';
import { createDomainError } from '@paralel/domain';
import { isHex, type Hex } from 'viem';

export const REUSE_ROUND_EXPIRY_SECONDS = 3_600n;

export type ReuseRoundRequest = Readonly<{
  auctionKey: Hex;
  startingBid: bigint;
  bidIncrement: bigint;
  openAt: bigint;
  durationHours: number;
  nonce: bigint;
  expiry: bigint;
  signature: Hex;
}>;

function invalid(message: string): never {
  throw createDomainError('INVALID_INPUT', message);
}
function decimal(value: unknown, field: string): bigint {
  if (typeof value !== 'string' || !/^(0|[1-9][0-9]*)$/.test(value)) {
    return invalid(`${field} must be an unsigned decimal integer string.`);
  }
  return BigInt(value);
}
export function parseReuseRound(value: unknown): ReuseRoundRequest {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return invalid('Request body must be a JSON object.');
  }
  const body = value as Record<string, unknown>;
  const allowed = new Set([
    'auctionKey','startingBid','bidIncrement','openAt','durationHours',
    'nonce','expiry','signature',
  ]);
  if (Object.keys(body).some((key) => !allowed.has(key))) {
    return invalid('Request body contains unknown fields.');
  }
  if (typeof body.auctionKey !== 'string' || !isHex(body.auctionKey) || body.auctionKey.length !== 66) {
    return invalid('auctionKey must be a 32-byte hexadecimal value.');
  }
  const durationHours = typeof body.durationHours === 'number'
    ? body.durationHours
    : typeof body.durationHours === 'string' && /^\d+$/.test(body.durationHours)
      ? Number(body.durationHours)
      : Number.NaN;
  if (!Number.isInteger(durationHours) || durationHours < 1 || durationHours > 65_535) {
    return invalid('durationHours is outside the contract range.');
  }
  const startingBid = decimal(body.startingBid, 'startingBid');
  const bidIncrement = decimal(body.bidIncrement, 'bidIncrement');
  const openAt = decimal(body.openAt, 'openAt');
  const nonce = decimal(body.nonce, 'nonce');
  const expiry = decimal(body.expiry, 'expiry');
  if (startingBid <= 0n) return invalid('startingBid must be greater than zero.');
  if (bidIncrement <= 0n) return invalid('bidIncrement must be greater than zero.');
  if (openAt <= 0n) return invalid('openAt must be greater than zero.');
  if (typeof body.signature !== 'string' || !isHex(body.signature) || body.signature.length !== 132) {
    return invalid('signature must be a 65-byte hexadecimal value.');
  }
  return Object.freeze({
    auctionKey: body.auctionKey.toLowerCase() as Hex,
    startingBid, bidIncrement, openAt, durationHours, nonce, expiry,
    signature: body.signature as Hex,
  });
}

export function validateReuseRoundEvidence(input: Readonly<{
  auction: AuctionContractState;
  authenticatedWallet: `0x${string}`;
  currentNonce: bigint;
  request: ReuseRoundRequest;
  blockTimestamp: bigint;
  configSnapshot: AuctionConfigSnapshotState;
  allowedIncrements: readonly bigint[];
}>): void {
  if (input.auction.status !== ContractAuctionStatus.PASSED_IN) {
    throw createDomainError('AUCTION_STATE_CHANGED', 'Contract auction is not PASSED_IN.', { retryable: true });
  }
  if (input.auction.consignor.toLowerCase() !== input.authenticatedWallet.toLowerCase()) {
    throw createDomainError('RESOURCE_FORBIDDEN', 'Authenticated wallet is not the auction Consignor.');
  }
  if (input.currentNonce !== input.request.nonce) {
    throw createDomainError('INVALID_INPUT', 'ConsignorConfirm nonce is stale.', { retryable: true });
  }
  if (input.request.expiry <= input.blockTimestamp) {
    throw createDomainError('SIGNATURE_EXPIRED', 'ConsignorConfirm signature has expired.');
  }
  if (input.request.expiry > input.blockTimestamp + REUSE_ROUND_EXPIRY_SECONDS) {
    throw createDomainError('INVALID_INPUT', 'ConsignorConfirm expiry exceeds the 3600-second signing window.');
  }
  if (!input.allowedIncrements.includes(input.request.bidIncrement)) {
    throw createDomainError('INVALID_INPUT', 'bidIncrement is not allowed by the current contract configuration.');
  }
  if (
    input.request.bidIncrement * 10_000n >
    input.request.startingBid * BigInt(input.configSnapshot.maxIncrementBps)
  ) {
    throw createDomainError('INVALID_INPUT', 'bidIncrement exceeds the current auction increment limit.');
  }
  if (
    input.request.durationHours < input.configSnapshot.minDurationHours ||
    input.request.durationHours > input.configSnapshot.maxDurationHours
  ) {
    throw createDomainError('INVALID_INPUT', 'durationHours is outside the auction configuration snapshot.');
  }
  const minimum = input.blockTimestamp + BigInt(input.configSnapshot.minOpenDelay);
  const maximum = input.blockTimestamp + BigInt(input.configSnapshot.maxOpenDelay);
  if (input.request.openAt < minimum || input.request.openAt > maximum) {
    throw createDomainError('INVALID_INPUT', 'openAt is outside the auction configuration snapshot.');
  }
}
