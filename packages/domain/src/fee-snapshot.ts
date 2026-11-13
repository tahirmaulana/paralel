// @file packages/domain/src/fee-snapshot.ts

/**
 * Canonical fee-snapshot rules for PARALEL.
 *
 * Seluruh fee settlement menggunakan basis points:
 *
 * 10,000 BPS = 100%
 *
 * Canonical distribution:
 *
 * Platform  :  250 BPS =  2.5%
 * Guarantor :  150 BPS =  1.5%
 * Notary    :  100 BPS =  1.0%
 * Tax       : 1000 BPS = 10.0%
 * Consignor : 8500 BPS = 85.0%
 *
 * Snapshot harus dibekukan per auction sebelum registerAuction disubmit.
 * Active configuration yang berubah kemudian tidak boleh mengubah snapshot
 * auction yang sudah REGISTERING, SCHEDULED, atau lebih lanjut.
 *
 * File ini murni dan tidak bergantung pada database, RPC, React, Next.js,
 * Drizzle, atau Cloudflare Workers.
 */

import type {
  Address,
} from 'viem';

import {
  ZERO_ADDRESS,
} from '@paralel/contracts';

import {
  assertDomain,
} from './errors';

export const BASIS_POINTS_DENOMINATOR =
  10_000 as const;

export const CANONICAL_PLATFORM_BPS =
  250 as const;

export const CANONICAL_GUARANTOR_BPS =
  150 as const;

export const CANONICAL_NOTARY_BPS =
  100 as const;

export const CANONICAL_TAX_BPS =
  1_000 as const;

export const CANONICAL_CONSIGNOR_BPS =
  8_500 as const;

/**
 * Default fee ketika candidate AWARDING gagal memenuhi kewajibannya.
 *
 * Nilai ini terpisah dari settlement distribution BPS.
 */
export const CANONICAL_DEFAULT_FEE_BPS =
  500 as const;

export type FeeSnapshotInput = {
  platformBps: number;
  guarantorBps: number;
  notaryBps: number;
  taxBps: number;

  platformWallet: Address;
  guarantorWallet: Address;
  notaryWallet: Address;
  taxWallet: Address;

  configurationVersion:
    | string
    | number;
};

export type FeeSnapshot = Readonly<{
  platformBps: number;
  guarantorBps: number;
  notaryBps: number;
  taxBps: number;
  consignorBps: number;

  totalRecipientBps: number;
  totalDistributionBps:
    typeof BASIS_POINTS_DENOMINATOR;

  platformWallet: Address;
  guarantorWallet: Address;
  notaryWallet: Address;
  taxWallet: Address;

  configurationVersion: string;
}>;

export type FeeDistribution = Readonly<{
  gross: bigint;

  platformAmount: bigint;
  guarantorAmount: bigint;
  notaryAmount: bigint;
  taxAmount: bigint;
  consignorAmount: bigint;

  distributedAmount: bigint;
  roundingRemainder: bigint;
}>;

export type DefaultFeeCalculation =
  Readonly<{
    grossStake: bigint;
    defaultFeeBps: number;
    defaultFeeAmount: bigint;
    refundableAfterDefaultFee: bigint;
    roundingRemainder: bigint;
  }>;

export type FeeSnapshotValidationOptions = {
  /**
   * True by default.
   *
   * Bila true, BPS wajib sama persis dengan canonical distribution.
   * Bila false, custom distribution diperbolehkan selama total valid.
   */
  requireCanonicalDistribution?: boolean;

  /**
   * Mencegah wallet recipient yang sama menerima lebih dari satu role.
   *
   * Default false karena deployment prototype dapat menggunakan wallet
   * platform yang sama untuk lebih dari satu operational role.
   */
  requireDistinctRecipientWallets?: boolean;
};

function assertBasisPoints(
  value: number,
  field: string,
): void {
  assertDomain(
    Number.isSafeInteger(value),
    'INVALID_INPUT',
    `${field} must be an integer.`,
    {
      details: {
        field,
        value,
      },
    },
  );

  assertDomain(
    value >= 0 &&
      value <=
        BASIS_POINTS_DENOMINATOR,
    'INVALID_INPUT',
    `${field} must be between 0 and ${BASIS_POINTS_DENOMINATOR}.`,
    {
      details: {
        field,
        value,
      },
    },
  );
}

function normalizeConfigurationVersion(
  value: string | number,
): string {
  const normalized =
    String(value).trim();

  assertDomain(
    normalized.length > 0,
    'INVALID_INPUT',
    'configurationVersion cannot be empty.',
  );

  return normalized;
}

function normalizeAddress(
  value: Address,
  field: string,
): Address {
  const normalized =
    value.toLowerCase() as Address;

  assertDomain(
    normalized !==
      ZERO_ADDRESS.toLowerCase(),
    'INVALID_INPUT',
    `${field} cannot be the zero address.`,
    {
      details: {
        field,
        value,
      },
    },
  );

  return normalized;
}

function assertDistinctRecipients(
  recipients: ReadonlyArray<{
    role: string;
    wallet: Address;
  }>,
): void {
  const roleByWallet =
    new Map<string, string>();

  for (const recipient of recipients) {
    const normalized =
      recipient.wallet.toLowerCase();

    const existingRole =
      roleByWallet.get(normalized);

    assertDomain(
      existingRole === undefined,
      'INVALID_INPUT',
      `Recipient wallet is duplicated between ${existingRole ?? 'unknown'} and ${recipient.role}.`,
      {
        details: {
          wallet:
            recipient.wallet,
          existingRole:
            existingRole ?? null,
          duplicateRole:
            recipient.role,
        },
      },
    );

    roleByWallet.set(
      normalized,
      recipient.role,
    );
  }
}

/**
 * Membentuk immutable fee snapshot yang sudah tervalidasi.
 */
export function createFeeSnapshot(
  input: FeeSnapshotInput,
  options:
    FeeSnapshotValidationOptions = {},
): FeeSnapshot {
  assertBasisPoints(
    input.platformBps,
    'platformBps',
  );

  assertBasisPoints(
    input.guarantorBps,
    'guarantorBps',
  );

  assertBasisPoints(
    input.notaryBps,
    'notaryBps',
  );

  assertBasisPoints(
    input.taxBps,
    'taxBps',
  );

  const totalRecipientBps =
    input.platformBps +
    input.guarantorBps +
    input.notaryBps +
    input.taxBps;

  assertDomain(
    totalRecipientBps <=
      BASIS_POINTS_DENOMINATOR,
    'INVALID_INPUT',
    'Total recipient BPS cannot exceed 10,000.',
    {
      details: {
        platformBps:
          input.platformBps,
        guarantorBps:
          input.guarantorBps,
        notaryBps:
          input.notaryBps,
        taxBps:
          input.taxBps,
        totalRecipientBps,
      },
    },
  );

  const consignorBps =
    BASIS_POINTS_DENOMINATOR -
    totalRecipientBps;

  const requireCanonicalDistribution =
    options.requireCanonicalDistribution ??
    true;

  if (requireCanonicalDistribution) {
    assertDomain(
      input.platformBps ===
        CANONICAL_PLATFORM_BPS &&
        input.guarantorBps ===
          CANONICAL_GUARANTOR_BPS &&
        input.notaryBps ===
          CANONICAL_NOTARY_BPS &&
        input.taxBps ===
          CANONICAL_TAX_BPS &&
        consignorBps ===
          CANONICAL_CONSIGNOR_BPS,
      'INVALID_INPUT',
      'Fee distribution does not match the canonical PARALEL distribution.',
      {
        details: {
          expected: {
            platformBps:
              CANONICAL_PLATFORM_BPS,
            guarantorBps:
              CANONICAL_GUARANTOR_BPS,
            notaryBps:
              CANONICAL_NOTARY_BPS,
            taxBps:
              CANONICAL_TAX_BPS,
            consignorBps:
              CANONICAL_CONSIGNOR_BPS,
          },
          received: {
            platformBps:
              input.platformBps,
            guarantorBps:
              input.guarantorBps,
            notaryBps:
              input.notaryBps,
            taxBps:
              input.taxBps,
            consignorBps,
          },
        },
      },
    );
  }

  const platformWallet =
    normalizeAddress(
      input.platformWallet,
      'platformWallet',
    );

  const guarantorWallet =
    normalizeAddress(
      input.guarantorWallet,
      'guarantorWallet',
    );

  const notaryWallet =
    normalizeAddress(
      input.notaryWallet,
      'notaryWallet',
    );

  const taxWallet =
    normalizeAddress(
      input.taxWallet,
      'taxWallet',
    );

  if (
    options.requireDistinctRecipientWallets ??
    false
  ) {
    assertDistinctRecipients([
      {
        role: 'PLATFORM',
        wallet: platformWallet,
      },
      {
        role: 'GUARANTOR',
        wallet: guarantorWallet,
      },
      {
        role: 'NOTARY',
        wallet: notaryWallet,
      },
      {
        role: 'TAX',
        wallet: taxWallet,
      },
    ]);
  }

  return Object.freeze({
    platformBps:
      input.platformBps,
    guarantorBps:
      input.guarantorBps,
    notaryBps:
      input.notaryBps,
    taxBps:
      input.taxBps,
    consignorBps,
    totalRecipientBps,
    totalDistributionBps:
      BASIS_POINTS_DENOMINATOR,
    platformWallet,
    guarantorWallet,
    notaryWallet,
    taxWallet,
    configurationVersion:
      normalizeConfigurationVersion(
        input.configurationVersion,
      ),
  });
}

/**
 * Memastikan snapshot existing masih valid.
 */
export function validateFeeSnapshot(
  snapshot: FeeSnapshot,
  options:
    FeeSnapshotValidationOptions = {},
): void {
  const recreated =
    createFeeSnapshot(
      {
        platformBps:
          snapshot.platformBps,
        guarantorBps:
          snapshot.guarantorBps,
        notaryBps:
          snapshot.notaryBps,
        taxBps:
          snapshot.taxBps,
        platformWallet:
          snapshot.platformWallet,
        guarantorWallet:
          snapshot.guarantorWallet,
        notaryWallet:
          snapshot.notaryWallet,
        taxWallet:
          snapshot.taxWallet,
        configurationVersion:
          snapshot.configurationVersion,
      },
      options,
    );

  assertDomain(
    recreated.consignorBps ===
      snapshot.consignorBps,
    'INVALID_INPUT',
    'Snapshot consignorBps does not match the derived value.',
    {
      details: {
        expected:
          recreated.consignorBps,
        received:
          snapshot.consignorBps,
      },
    },
  );

  assertDomain(
    snapshot.totalDistributionBps ===
      BASIS_POINTS_DENOMINATOR,
    'INVALID_INPUT',
    'Snapshot totalDistributionBps must equal 10,000.',
    {
      details: {
        totalDistributionBps:
          snapshot.totalDistributionBps,
      },
    },
  );
}

/**
 * Integer basis-points calculation identical to Solidity floor division.
 */
export function calculateBpsAmount(
  gross: bigint,
  bps: number,
): bigint {
  assertDomain(
    gross >= 0n,
    'INVALID_INPUT',
    'gross cannot be negative.',
    {
      details: {
        gross:
          gross.toString(),
      },
    },
  );

  assertBasisPoints(
    bps,
    'bps',
  );

  return (
    gross *
    BigInt(bps)
  ) /
    BigInt(
      BASIS_POINTS_DENOMINATOR,
    );
}

/**
 * Menghitung settlement distribution.
 *
 * Rounding remainder diberikan kepada Consignor agar distributedAmount selalu
 * sama dengan gross dan tidak ada unit USDC yang hilang dari projection.
 */
export function calculateFeeDistribution(
  gross: bigint,
  snapshot: FeeSnapshot,
): FeeDistribution {
  validateFeeSnapshot(
    snapshot,
    {
      requireCanonicalDistribution:
        false,
    },
  );

  assertDomain(
    gross >= 0n,
    'INVALID_INPUT',
    'gross cannot be negative.',
    {
      details: {
        gross:
          gross.toString(),
      },
    },
  );

  const platformAmount =
    calculateBpsAmount(
      gross,
      snapshot.platformBps,
    );

  const guarantorAmount =
    calculateBpsAmount(
      gross,
      snapshot.guarantorBps,
    );

  const notaryAmount =
    calculateBpsAmount(
      gross,
      snapshot.notaryBps,
    );

  const taxAmount =
    calculateBpsAmount(
      gross,
      snapshot.taxBps,
    );

  const consignorFloorAmount =
    calculateBpsAmount(
      gross,
      snapshot.consignorBps,
    );

  const floorDistributedAmount =
    platformAmount +
    guarantorAmount +
    notaryAmount +
    taxAmount +
    consignorFloorAmount;

  const roundingRemainder =
    gross -
    floorDistributedAmount;

  assertDomain(
    roundingRemainder >= 0n,
    'AUCTION_STATE_CHANGED',
    'Fee distribution exceeds gross amount.',
    {
      details: {
        gross:
          gross.toString(),
        floorDistributedAmount:
          floorDistributedAmount.toString(),
      },
    },
  );

  const consignorAmount =
    consignorFloorAmount +
    roundingRemainder;

  const distributedAmount =
    platformAmount +
    guarantorAmount +
    notaryAmount +
    taxAmount +
    consignorAmount;

  assertDomain(
    distributedAmount === gross,
    'AUCTION_STATE_CHANGED',
    'Final fee distribution does not equal gross amount.',
    {
      details: {
        gross:
          gross.toString(),
        distributedAmount:
          distributedAmount.toString(),
      },
    },
  );

  return Object.freeze({
    gross,
    platformAmount,
    guarantorAmount,
    notaryAmount,
    taxAmount,
    consignorAmount,
    distributedAmount,
    roundingRemainder,
  });
}

/**
 * Menghitung default fee candidate.
 *
 * Default fee terpisah dari settlement distribution.
 * Remainder tetap berada pada refundable amount.
 */
export function calculateDefaultFee(
  grossStake: bigint,
  defaultFeeBps:
    number =
      CANONICAL_DEFAULT_FEE_BPS,
): DefaultFeeCalculation {
  assertDomain(
    grossStake >= 0n,
    'INVALID_INPUT',
    'grossStake cannot be negative.',
    {
      details: {
        grossStake:
          grossStake.toString(),
      },
    },
  );

  assertBasisPoints(
    defaultFeeBps,
    'defaultFeeBps',
  );

  const defaultFeeAmount =
    calculateBpsAmount(
      grossStake,
      defaultFeeBps,
    );

  const refundableAfterDefaultFee =
    grossStake -
    defaultFeeAmount;

  return Object.freeze({
    grossStake,
    defaultFeeBps,
    defaultFeeAmount,
    refundableAfterDefaultFee,
    roundingRemainder:
      (
        grossStake *
        BigInt(defaultFeeBps)
      ) %
      BigInt(
        BASIS_POINTS_DENOMINATOR,
      ),
  });
}

/**
 * Membandingkan dua snapshot secara literal.
 */
export function areFeeSnapshotsEqual(
  left: FeeSnapshot,
  right: FeeSnapshot,
): boolean {
  return (
    left.platformBps ===
      right.platformBps &&
    left.guarantorBps ===
      right.guarantorBps &&
    left.notaryBps ===
      right.notaryBps &&
    left.taxBps ===
      right.taxBps &&
    left.consignorBps ===
      right.consignorBps &&
    left.platformWallet.toLowerCase() ===
      right.platformWallet.toLowerCase() &&
    left.guarantorWallet.toLowerCase() ===
      right.guarantorWallet.toLowerCase() &&
    left.notaryWallet.toLowerCase() ===
      right.notaryWallet.toLowerCase() &&
    left.taxWallet.toLowerCase() ===
      right.taxWallet.toLowerCase() &&
    left.configurationVersion ===
      right.configurationVersion
  );
}

/**
 * Assertion untuk mencegah snapshot auction diubah setelah dibekukan.
 */
export function assertFeeSnapshotUnchanged(
  expected: FeeSnapshot,
  received: FeeSnapshot,
): void {
  assertDomain(
    areFeeSnapshotsEqual(
      expected,
      received,
    ),
    'AUCTION_STATE_CHANGED',
    'The auction fee snapshot has changed.',
    {
      details: {
        expectedVersion:
          expected.configurationVersion,
        receivedVersion:
          received.configurationVersion,
      },
    },
  );
}
