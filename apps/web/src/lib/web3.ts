// @file apps/web/src/lib/web3.ts
//
// Compatibility constants, UI status names, dan USDC formatter.
//
// Contract address, USDC address, chain ID, serta USDC decimals berasal dari
// package canonical @paralel/contracts.

import {
  formatUnits,
} from 'viem';

import {
  ARBITRUM_SEPOLIA_CHAIN_ID,
  USDC_DECIMALS as CANONICAL_USDC_DECIMALS,
  getParalelContractAddress,
  getParalelDeployment,
  getParalelUsdcAddress,
} from '@paralel/contracts';

export const CHAIN_ID =
  ARBITRUM_SEPOLIA_CHAIN_ID;

export const CONTRACT_ADDRESS =
  getParalelContractAddress(CHAIN_ID);

export const AUCTION_CONTRACT_ADDRESS =
  CONTRACT_ADDRESS;

export const USDC_ADDRESS =
  getParalelUsdcAddress(CHAIN_ID);

export const USDC_DECIMALS =
  CANONICAL_USDC_DECIMALS;

export const PARALEL_DEPLOYMENT =
  getParalelDeployment(CHAIN_ID);

/**
 * EIP-2612 domain milik USDC Arbitrum Sepolia.
 *
 * Nilai ini bukan milik ParalelAuction contract sehingga tetap berada pada
 * web integration layer.
 */
export const USDC_PERMIT_DOMAIN_NAME =
  'USD Coin' as const;

export const USDC_PERMIT_DOMAIN_VERSION =
  '2' as const;

/**
 * Nama enum Status on-chain.
 *
 * Urutan wajib sama dengan deployed ParalelAuction v1:
 *
 * 0 SCHEDULED
 * 1 OPEN
 * 2 CLOSED
 * 3 AWARDING
 * 4 COLLECTION
 * 5 CLAIM_PERIOD
 * 6 SETTLED
 * 7 PASSED_IN
 * 8 WITHDRAWN
 */
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

export type StatusName =
  (typeof STATUS_NAMES)[number];

/**
 * Status on-chain yang boleh muncul pada public auction feed.
 */
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

export type DbFeedStatus =
  (typeof DB_FEED_STATUSES)[number];

/**
 * Status pre-chain dan off-chain yang tidak ditampilkan di public feed.
 */
export const DB_HIDDEN_STATUSES = [
  'CREATED',
  'PENDING',
  'REJECTED',
  'CANCELED',
] as const;

export type DbHiddenStatus =
  (typeof DB_HIDDEN_STATUSES)[number];

/**
 * Mengubah contract status ID menjadi nama status.
 *
 * Unknown ID tidak boleh diam-diam dianggap SCHEDULED karena itu dapat
 * menyembunyikan ABI atau deployment mismatch.
 */
export function statusNameFromId(
  id: number,
): StatusName {
  const status = STATUS_NAMES[id];

  if (!status) {
    throw new Error(
      `Unknown ParalelAuction status ID: ${id}`,
    );
  }

  return status;
}

/**
 * Format USDC smallest units menjadi string dengan minimal dua decimal.
 */
export function fmtUSDC(
  value:
    | bigint
    | string
    | null
    | undefined,
): string {
  if (
    value === null ||
    value === undefined
  ) {
    return '0.00';
  }

  const amount =
    typeof value === 'string'
      ? BigInt(value)
      : value;

  const formatted = formatUnits(
    amount,
    USDC_DECIMALS,
  );

  const [integerPart, fraction = ''] =
    formatted.split('.');

  const trimmedFraction =
    fraction.replace(/0+$/, '');

  const normalizedFraction =
    trimmedFraction.length < 2
      ? trimmedFraction.padEnd(2, '0')
      : trimmedFraction;

  return `${integerPart}.${normalizedFraction}`;
}

/**
 * Parse user-facing USDC input menjadi smallest units.
 *
 * Maksimum enam decimal mengikuti USDC decimals.
 */
export function parseUSDC(
  input: string,
): bigint {
  const cleaned = input.trim();

  if (!/^\d+(\.\d{0,6})?$/.test(cleaned)) {
    throw new Error(
      'Invalid USDC amount',
    );
  }

  const [integerPart, fraction = ''] =
    cleaned.split('.');

  const paddedFraction =
    fraction.padEnd(
      USDC_DECIMALS,
      '0',
    );

  return (
    BigInt(integerPart) *
      10n ** BigInt(USDC_DECIMALS) +
    BigInt(paddedFraction)
  );
}
