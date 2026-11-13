import {
  ContractWithdrawalKind,
  ZERO_BYTES32,
} from '@paralel/contracts';
import {
  isAddress,
  isHex,
  type Address,
  type Hex,
} from 'viem';

export type RoundScheduledProjection =
  Readonly<{
    auctionKey: Hex;
    roundNo: number;
    startingBid: bigint;
    bidIncrement: bigint;
    openAt: bigint;
    closeAt: bigint;
    durationHours: number;
    txHash: Hex;
    blockTs: Date;
  }>;

export type SettledProjection =
  Readonly<{
    auctionKey: Hex;
    roundNo: number;
    txHash: Hex;
    blockTs: Date;
  }>;

export type RefundWithdrawalProjection =
  Readonly<{
    auctionKey: Hex;
    roundNo: number;
    wallet: Address;
    gross: bigint;
    fee: bigint;
    net: bigint;
    txHash: Hex;
    blockTs: Date;
  }>;

export type PlatformFeeWithdrawalProjection =
  Readonly<{
    wallet: Address;
    amount: bigint;
    txHash: Hex;
    blockTs: Date;
  }>;

function parseUint(
  value: unknown,
  field: string,
): bigint {
  if (
    typeof value === 'bigint' &&
    value >= 0n
  ) {
    return value;
  }
  if (
    typeof value === 'number' &&
    Number.isSafeInteger(value) &&
    value >= 0
  ) {
    return BigInt(value);
  }
  if (
    typeof value === 'string' &&
    /^(0|[1-9][0-9]*)$/.test(value)
  ) {
    return BigInt(value);
  }
  throw new Error(`Invalid ${field}.`);
}

function parseAuctionKey(value: unknown): Hex {
  if (
    typeof value !== 'string' ||
    !isHex(value) ||
    value.length !== 66
  ) {
    throw new Error('Invalid auction key.');
  }
  return value.toLowerCase() as Hex;
}

function parseTxHash(value: unknown): Hex {
  if (
    typeof value !== 'string' ||
    !isHex(value) ||
    value.length !== 66
  ) {
    throw new Error('Invalid transaction hash.');
  }
  return value.toLowerCase() as Hex;
}

function parseEventArgs(value: unknown): Record<string, unknown> {
  if (
    typeof value !== 'object' ||
    value === null ||
    Array.isArray(value)
  ) {
    throw new Error('Invalid relay projection event arguments.');
  }
  return value as Record<string, unknown>;
}

function validateBlockTimestamp(value: Date): Date {
  if (!Number.isFinite(value.getTime())) {
    throw new Error('Invalid relay projection block timestamp.');
  }
  return new Date(value);
}

function parseRoundNo(value: unknown): number {
  const roundNo = parseUint(value, 'round number');
  if (roundNo < 1n || roundNo > 65_535n) {
    throw new Error('Invalid relay projection round number.');
  }
  return Number(roundNo);
}

export function parseRoundScheduledProjection(input: Readonly<{
  eventName: string;
  args: unknown;
  txHash: unknown;
  blockTs: Date;
}>): RoundScheduledProjection {
  if (input.eventName !== 'RoundScheduled') {
    throw new Error('Event is not RoundScheduled.');
  }
  const args = parseEventArgs(input.args);
  const roundNo = parseRoundNo(args.roundNo);
  const startingBid = parseUint(args.startingBid, 'starting bid');
  const bidIncrement = parseUint(args.bidIncrement, 'bid increment');
  const openAt = parseUint(args.openAt, 'open time');
  const closeAt = parseUint(args.closeAt, 'close time');
  const durationSeconds = closeAt - openAt;

  if (
    startingBid <= 0n ||
    bidIncrement <= 0n ||
    durationSeconds <= 0n ||
    durationSeconds > 65_535n * 3_600n ||
    durationSeconds % 3_600n !== 0n
  ) {
    throw new Error('Invalid RoundScheduled parameters.');
  }

  return Object.freeze({
    auctionKey: parseAuctionKey(args.auctionKey),
    roundNo,
    startingBid,
    bidIncrement,
    openAt,
    closeAt,
    durationHours: Number(durationSeconds / 3_600n),
    txHash: parseTxHash(input.txHash),
    blockTs: validateBlockTimestamp(input.blockTs),
  });
}

export function parseSettledProjection(input: Readonly<{
  eventName: string;
  args: unknown;
  txHash: unknown;
  blockTs: Date;
}>): SettledProjection {
  if (input.eventName !== 'Settled') {
    throw new Error('Event is not Settled.');
  }
  const args = parseEventArgs(input.args);
  return Object.freeze({
    auctionKey: parseAuctionKey(args.auctionKey),
    roundNo: parseRoundNo(args.roundNo),
    txHash: parseTxHash(input.txHash),
    blockTs: validateBlockTimestamp(input.blockTs),
  });
}

export function parseRefundWithdrawalProjection(input: Readonly<{
  eventName: string;
  args: unknown;
  txHash: unknown;
  blockTs: Date;
  withdrawalFee: bigint;
}>): RefundWithdrawalProjection {
  if (input.eventName !== 'Withdrawal') {
    throw new Error('Event is not Withdrawal.');
  }

  const args = parseEventArgs(input.args);
  const kind = parseUint(args.kind, 'withdrawal kind');
  const gross = parseUint(args.gross, 'withdrawal gross amount');
  const fee = parseUint(args.fee, 'withdrawal fee');
  const net = parseUint(args.net, 'withdrawal net amount');

  if (
    kind !== BigInt(ContractWithdrawalKind.REFUND) ||
    gross <= 0n ||
    fee > gross ||
    net !== gross - fee ||
    input.withdrawalFee < 0n ||
    fee !== (gross < input.withdrawalFee ? gross : input.withdrawalFee) ||
    typeof args.wallet !== 'string' ||
    !isAddress(args.wallet)
  ) {
    throw new Error('Invalid refund Withdrawal parameters.');
  }

  return Object.freeze({
    auctionKey: parseAuctionKey(args.auctionKey),
    roundNo: parseRoundNo(args.roundNo),
    wallet: args.wallet.toLowerCase() as Address,
    gross,
    fee,
    net,
    txHash: parseTxHash(input.txHash),
    blockTs: validateBlockTimestamp(input.blockTs),
  });
}

export function parsePlatformFeeWithdrawalProjection(input: Readonly<{
  eventName: string;
  args: unknown;
  txHash: unknown;
  blockTs: Date;
}>): PlatformFeeWithdrawalProjection {
  if (input.eventName !== 'Withdrawal') {
    throw new Error('Event is not Withdrawal.');
  }

  const args = parseEventArgs(input.args);
  const kind = parseUint(args.kind, 'withdrawal kind');
  const roundNo = parseUint(args.roundNo, 'withdrawal round number');
  const gross = parseUint(args.gross, 'withdrawal gross amount');
  const fee = parseUint(args.fee, 'withdrawal fee');
  const net = parseUint(args.net, 'withdrawal net amount');

  if (
    kind !== BigInt(ContractWithdrawalKind.FEE_BALANCE) ||
    parseAuctionKey(args.auctionKey) !== ZERO_BYTES32 ||
    roundNo !== 0n ||
    gross <= 0n ||
    fee !== 0n ||
    net !== gross ||
    typeof args.wallet !== 'string' ||
    !isAddress(args.wallet)
  ) {
    throw new Error('Invalid platform fee Withdrawal parameters.');
  }

  return Object.freeze({
    wallet: args.wallet.toLowerCase() as Address,
    amount: gross,
    txHash: parseTxHash(input.txHash),
    blockTs: validateBlockTimestamp(input.blockTs),
  });
}
