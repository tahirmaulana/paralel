// @file apps/web/src/lib/web3.ts — Constants + formatter + status list
import { formatUnits } from 'viem';

export const CONTRACT_ADDRESS =
  '0x80db02BfB4d0163a2dbd7f096178BF7AE5A66d2c' as const;

export const USDC_ADDRESS =
  '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d' as const;

export const USDC_DECIMALS = 6;
export const USDC_PERMIT_DOMAIN_NAME = 'USD Coin';
export const USDC_PERMIT_DOMAIN_VERSION = '2';

// Nama enum Status di smart contract (urutan WAJIB sama dengan ParalelAuction.sol)
export const STATUS_NAMES = [
  'SCHEDULED',
  'OPEN',
  'CLOSED',
  'AWARDING',
  'COLLECTION',
  'CLAIM_PERIOD',
  'SETTLED',
  'PASSED_IN',
  'WITHDRAWN',
] as const;

export type StatusName = (typeof STATUS_NAMES)[number];

// Semua status on-chain yang ditampilkan di home (feed).
// Setiap status di bawah pasti sudah melewati registerAuction, jadi aman ditampilkan.
// Urutan: SCHEDULED → WITHDRAWN (mengikuti urutan enum).
export const DB_FEED_STATUSES = [
  'SCHEDULED',
  'OPEN',
  'CLOSED',
  'AWARDING',
  'COLLECTION',
  'CLAIM_PERIOD',
  'SETTLED',
  'PASSED_IN',
  'WITHDRAWN',
] as const;

export type DbFeedStatus = (typeof DB_FEED_STATUSES)[number];

// Hidden dari home sesuai spec §9.1 + §18:
//  - CREATED, PENDING: pre-on-chain (belum registerAuction)
//  - REJECTED, CANCELED: off-chain only, "tidak pernah muncul di feed"
export const DB_HIDDEN_STATUSES = [
  'CREATED',
  'PENDING',
  'REJECTED',
  'CANCELED',
] as const;

export function statusNameFromId(id: number): StatusName {
  return STATUS_NAMES[id] ?? 'SCHEDULED';
}

export function fmtUSDC(value: bigint | string | null | undefined): string {
  if (value === null || value === undefined) return '0';
  const big = typeof value === 'string' ? BigInt(value) : value;
  const s = formatUnits(big, USDC_DECIMALS);
  const [int, frac = ''] = s.split('.');
  const trimmed = frac.replace(/0+$/, '');
  const padded = trimmed.length < 2 ? trimmed.padEnd(2, '0') : trimmed;
  return `${int}.${padded}`;
}

export function parseUSDC(input: string): bigint {
  const cleaned = input.trim();
  if (!/^\d+(\.\d{0,6})?$/.test(cleaned)) {
    throw new Error('Invalid USDC amount');
  }
  const [int, frac = ''] = cleaned.split('.');
  const fracPadded = frac.padEnd(6, '0');
  return BigInt(int) * 1_000_000n + BigInt(fracPadded);
}