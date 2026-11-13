// @file packages/domain/test/fee-snapshot.test.ts

import assert from 'node:assert/strict';
import {
  describe,
  it,
} from 'node:test';

import type {
  Address,
} from 'viem';

import {
  WITHDRAW_FEE,
  ZERO_ADDRESS,
} from '@paralel/contracts';

import {
  BASIS_POINTS_DENOMINATOR,
  CANONICAL_CONSIGNOR_BPS,
  CANONICAL_DEFAULT_FEE_BPS,
  CANONICAL_GUARANTOR_BPS,
  CANONICAL_NOTARY_BPS,
  CANONICAL_PLATFORM_BPS,
  CANONICAL_TAX_BPS,
  areFeeSnapshotsEqual,
  assertFeeSnapshotUnchanged,
  calculateBpsAmount,
  calculateDefaultFee,
  calculateFeeDistribution,
  createFeeSnapshot,
  validateFeeSnapshot,
  type FeeSnapshot,
  type FeeSnapshotInput,
} from '../src/fee-snapshot';

import {
  DomainError,
} from '../src/errors';

const PLATFORM_WALLET =
  '0x1111111111111111111111111111111111111111' as Address;

const GUARANTOR_WALLET =
  '0x2222222222222222222222222222222222222222' as Address;

const NOTARY_WALLET =
  '0x3333333333333333333333333333333333333333' as Address;

const TAX_WALLET =
  '0x4444444444444444444444444444444444444444' as Address;

function canonicalInput(
  overrides:
    Partial<FeeSnapshotInput> = {},
): FeeSnapshotInput {
  return {
    platformBps:
      CANONICAL_PLATFORM_BPS,
    guarantorBps:
      CANONICAL_GUARANTOR_BPS,
    notaryBps:
      CANONICAL_NOTARY_BPS,
    taxBps:
      CANONICAL_TAX_BPS,
    platformWallet:
      PLATFORM_WALLET,
    guarantorWallet:
      GUARANTOR_WALLET,
    notaryWallet:
      NOTARY_WALLET,
    taxWallet:
      TAX_WALLET,
    configurationVersion:
      'fee-v1',
    ...overrides,
  };
}

function canonicalSnapshot(
  overrides:
    Partial<FeeSnapshotInput> = {},
): FeeSnapshot {
  return createFeeSnapshot(
    canonicalInput(overrides),
  );
}

function expectDomainError(
  action: () => unknown,
  expectedCode: DomainError['code'],
): void {
  assert.throws(
    action,
    (
      error: unknown,
    ) => {
      assert.equal(
        error instanceof DomainError,
        true,
      );

      if (
        !(error instanceof DomainError)
      ) {
        return false;
      }

      assert.equal(
        error.code,
        expectedCode,
      );

      return true;
    },
  );
}

describe(
  'canonical fee configuration',
  () => {
    it(
      'uses a 10,000 BPS denominator',
      () => {
        assert.equal(
          BASIS_POINTS_DENOMINATOR,
          10_000,
        );
      },
    );

    it(
      'locks the canonical settlement percentages',
      () => {
        assert.equal(
          CANONICAL_PLATFORM_BPS,
          250,
        );

        assert.equal(
          CANONICAL_GUARANTOR_BPS,
          150,
        );

        assert.equal(
          CANONICAL_NOTARY_BPS,
          100,
        );

        assert.equal(
          CANONICAL_TAX_BPS,
          1_000,
        );

        assert.equal(
          CANONICAL_CONSIGNOR_BPS,
          8_500,
        );
      },
    );

    it(
      'locks the candidate default fee at 5 percent',
      () => {
        assert.equal(
          CANONICAL_DEFAULT_FEE_BPS,
          500,
        );
      },
    );

    it(
      'keeps the fixed withdrawal fee at 2.5 USDC',
      () => {
        assert.equal(
          WITHDRAW_FEE,
          2_500_000n,
        );
      },
    );

    it(
      'creates the canonical immutable snapshot',
      () => {
        const snapshot =
          canonicalSnapshot();

        assert.deepEqual(
          snapshot,
          {
            platformBps:
              250,
            guarantorBps:
              150,
            notaryBps:
              100,
            taxBps:
              1_000,
            consignorBps:
              8_500,
            totalRecipientBps:
              1_500,
            totalDistributionBps:
              10_000,
            platformWallet:
              PLATFORM_WALLET,
            guarantorWallet:
              GUARANTOR_WALLET,
            notaryWallet:
              NOTARY_WALLET,
            taxWallet:
              TAX_WALLET,
            configurationVersion:
              'fee-v1',
          },
        );

        assert.equal(
          Object.isFrozen(snapshot),
          true,
        );
      },
    );

    it(
      'normalizes recipient wallets to lowercase',
      () => {
        const snapshot =
          createFeeSnapshot(
            canonicalInput({
              platformWallet:
                PLATFORM_WALLET.toUpperCase() as Address,
              guarantorWallet:
                GUARANTOR_WALLET.toUpperCase() as Address,
              notaryWallet:
                NOTARY_WALLET.toUpperCase() as Address,
              taxWallet:
                TAX_WALLET.toUpperCase() as Address,
            }),
          );

        assert.equal(
          snapshot.platformWallet,
          PLATFORM_WALLET,
        );

        assert.equal(
          snapshot.guarantorWallet,
          GUARANTOR_WALLET,
        );

        assert.equal(
          snapshot.notaryWallet,
          NOTARY_WALLET,
        );

        assert.equal(
          snapshot.taxWallet,
          TAX_WALLET,
        );
      },
    );

    it(
      'normalizes a numeric configuration version to string',
      () => {
        const snapshot =
          canonicalSnapshot({
            configurationVersion:
              7,
          });

        assert.equal(
          snapshot.configurationVersion,
          '7',
        );
      },
    );

    it(
      'rejects an empty configuration version',
      () => {
        expectDomainError(
          () =>
            canonicalSnapshot({
              configurationVersion:
                '   ',
            }),
          'INVALID_INPUT',
        );
      },
    );

    it(
      'rejects a non-integer BPS value',
      () => {
        expectDomainError(
          () =>
            canonicalSnapshot({
              platformBps:
                250.5,
            }),
          'INVALID_INPUT',
        );
      },
    );

    it(
      'rejects a negative BPS value',
      () => {
        expectDomainError(
          () =>
            canonicalSnapshot({
              notaryBps:
                -1,
            }),
          'INVALID_INPUT',
        );
      },
    );

    it(
      'rejects BPS above 10,000',
      () => {
        expectDomainError(
          () =>
            canonicalSnapshot({
              taxBps:
                10_001,
            }),
          'INVALID_INPUT',
        );
      },
    );

    it(
      'rejects total recipient BPS above 10,000',
      () => {
        expectDomainError(
          () =>
            createFeeSnapshot(
              {
                ...canonicalInput(),
                platformBps:
                  4_000,
                guarantorBps:
                  3_000,
                notaryBps:
                  2_000,
                taxBps:
                  2_000,
              },
              {
                requireCanonicalDistribution:
                  false,
              },
            ),
          'INVALID_INPUT',
        );
      },
    );

    it(
      'rejects a non-canonical distribution by default',
      () => {
        expectDomainError(
          () =>
            canonicalSnapshot({
              platformBps:
                300,
            }),
          'INVALID_INPUT',
        );
      },
    );

    it(
      'allows a valid custom distribution only when explicitly requested',
      () => {
        const snapshot =
          createFeeSnapshot(
            {
              ...canonicalInput(),
              platformBps:
                300,
              guarantorBps:
                200,
              notaryBps:
                100,
              taxBps:
                1_000,
              configurationVersion:
                'custom-v1',
            },
            {
              requireCanonicalDistribution:
                false,
            },
          );

        assert.equal(
          snapshot.platformBps,
          300,
        );

        assert.equal(
          snapshot.guarantorBps,
          200,
        );

        assert.equal(
          snapshot.notaryBps,
          100,
        );

        assert.equal(
          snapshot.taxBps,
          1_000,
        );

        assert.equal(
          snapshot.consignorBps,
          8_400,
        );

        assert.equal(
          snapshot.totalRecipientBps,
          1_600,
        );
      },
    );

    it(
      'rejects zero recipient wallets',
      () => {
        expectDomainError(
          () =>
            canonicalSnapshot({
              platformWallet:
                ZERO_ADDRESS,
            }),
          'INVALID_INPUT',
        );

        expectDomainError(
          () =>
            canonicalSnapshot({
              guarantorWallet:
                ZERO_ADDRESS,
            }),
          'INVALID_INPUT',
        );

        expectDomainError(
          () =>
            canonicalSnapshot({
              notaryWallet:
                ZERO_ADDRESS,
            }),
          'INVALID_INPUT',
        );

        expectDomainError(
          () =>
            canonicalSnapshot({
              taxWallet:
                ZERO_ADDRESS,
            }),
          'INVALID_INPUT',
        );
      },
    );

    it(
      'allows duplicate recipient wallets by default',
      () => {
        assert.doesNotThrow(
          () =>
            canonicalSnapshot({
              taxWallet:
                PLATFORM_WALLET,
            }),
        );
      },
    );

    it(
      'rejects duplicate recipient wallets when strict separation is required',
      () => {
        expectDomainError(
          () =>
            createFeeSnapshot(
              canonicalInput({
                taxWallet:
                  PLATFORM_WALLET,
              }),
              {
                requireDistinctRecipientWallets:
                  true,
              },
            ),
          'INVALID_INPUT',
        );
      },
    );

    it(
      'validates a canonical snapshot',
      () => {
        const snapshot =
          canonicalSnapshot();

        assert.doesNotThrow(
          () =>
            validateFeeSnapshot(
              snapshot,
            ),
        );
      },
    );

    it(
      'rejects an internally inconsistent consignor BPS',
      () => {
        const valid =
          canonicalSnapshot();

        const invalid = {
          ...valid,
          consignorBps:
            8_499,
        } as FeeSnapshot;

        expectDomainError(
          () =>
            validateFeeSnapshot(
              invalid,
            ),
          'INVALID_INPUT',
        );
      },
    );

    it(
      'rejects an invalid total distribution BPS',
      () => {
        const valid =
          canonicalSnapshot();

        const invalid = {
          ...valid,
          totalDistributionBps:
            9_999,
        } as unknown as FeeSnapshot;

        expectDomainError(
          () =>
            validateFeeSnapshot(
              invalid,
            ),
          'INVALID_INPUT',
        );
      },
    );
  },
);

describe(
  'basis-points calculations',
  () => {
    it(
      'calculates 2.5 percent using integer division',
      () => {
        assert.equal(
          calculateBpsAmount(
            100_000_000n,
            250,
          ),
          2_500_000n,
        );
      },
    );

    it(
      'calculates 10 percent tax',
      () => {
        assert.equal(
          calculateBpsAmount(
            100_000_000n,
            1_000,
          ),
          10_000_000n,
        );
      },
    );

    it(
      'returns zero for zero gross',
      () => {
        assert.equal(
          calculateBpsAmount(
            0n,
            250,
          ),
          0n,
        );
      },
    );

    it(
      'uses Solidity-compatible floor division',
      () => {
        assert.equal(
          calculateBpsAmount(
            101n,
            250,
          ),
          2n,
        );
      },
    );

    it(
      'rejects a negative gross value',
      () => {
        expectDomainError(
          () =>
            calculateBpsAmount(
              -1n,
              250,
            ),
          'INVALID_INPUT',
        );
      },
    );

    it(
      'rejects invalid basis points',
      () => {
        expectDomainError(
          () =>
            calculateBpsAmount(
              100_000_000n,
              10_001,
            ),
          'INVALID_INPUT',
        );
      },
    );
  },
);

describe(
  'settlement distribution',
  () => {
    it(
      'distributes exactly 100 USDC using the canonical percentages',
      () => {
        const snapshot =
          canonicalSnapshot();

        const result =
          calculateFeeDistribution(
            100_000_000n,
            snapshot,
          );

        assert.deepEqual(
          result,
          {
            gross:
              100_000_000n,
            platformAmount:
              2_500_000n,
            guarantorAmount:
              1_500_000n,
            notaryAmount:
              1_000_000n,
            taxAmount:
              10_000_000n,
            consignorAmount:
              85_000_000n,
            distributedAmount:
              100_000_000n,
            roundingRemainder:
              0n,
          },
        );
      },
    );

    it(
      'gives the integer rounding remainder to the consignor',
      () => {
        const snapshot =
          canonicalSnapshot();

        const result =
          calculateFeeDistribution(
            100_000_003n,
            snapshot,
          );

        assert.equal(
          result.platformAmount,
          2_500_000n,
        );

        assert.equal(
          result.guarantorAmount,
          1_500_000n,
        );

        assert.equal(
          result.notaryAmount,
          1_000_000n,
        );

        assert.equal(
          result.taxAmount,
          10_000_000n,
        );

        assert.equal(
          result.consignorAmount,
          85_000_003n,
        );

        assert.equal(
          result.roundingRemainder,
          1n,
        );

        assert.equal(
          result.distributedAmount,
          result.gross,
        );
      },
    );

    it(
      'always distributes exactly the gross amount',
      () => {
        const snapshot =
          canonicalSnapshot();

        const grossValues = [
          0n,
          1n,
          2n,
          10n,
          999n,
          1_000_001n,
          100_000_003n,
          999_999_999_999n,
        ];

        for (
          const gross
          of grossValues
        ) {
          const result =
            calculateFeeDistribution(
              gross,
              snapshot,
            );

          assert.equal(
            result.distributedAmount,
            gross,
          );

          assert.equal(
            result.platformAmount +
              result.guarantorAmount +
              result.notaryAmount +
              result.taxAmount +
              result.consignorAmount,
            gross,
          );
        }
      },
    );

    it(
      'supports an explicitly approved custom snapshot',
      () => {
        const customSnapshot =
          createFeeSnapshot(
            {
              ...canonicalInput(),
              platformBps:
                300,
              guarantorBps:
                200,
              notaryBps:
                100,
              taxBps:
                1_000,
              configurationVersion:
                'custom-v1',
            },
            {
              requireCanonicalDistribution:
                false,
            },
          );

        const result =
          calculateFeeDistribution(
            100_000_000n,
            customSnapshot,
          );

        assert.equal(
          result.platformAmount,
          3_000_000n,
        );

        assert.equal(
          result.guarantorAmount,
          2_000_000n,
        );

        assert.equal(
          result.notaryAmount,
          1_000_000n,
        );

        assert.equal(
          result.taxAmount,
          10_000_000n,
        );

        assert.equal(
          result.consignorAmount,
          84_000_000n,
        );

        assert.equal(
          result.distributedAmount,
          100_000_000n,
        );
      },
    );

    it(
      'rejects negative settlement gross',
      () => {
        expectDomainError(
          () =>
            calculateFeeDistribution(
              -1n,
              canonicalSnapshot(),
            ),
          'INVALID_INPUT',
        );
      },
    );
  },
);

describe(
  'candidate default fee',
  () => {
    it(
      'calculates the canonical five-percent default fee',
      () => {
        const result =
          calculateDefaultFee(
            100_000_000n,
          );

        assert.deepEqual(
          result,
          {
            grossStake:
              100_000_000n,
            defaultFeeBps:
              500,
            defaultFeeAmount:
              5_000_000n,
            refundableAfterDefaultFee:
              95_000_000n,
            roundingRemainder:
              0n,
          },
        );
      },
    );

    it(
      'preserves integer rounding in the refundable amount',
      () => {
        const result =
          calculateDefaultFee(
            1_005_000_001n,
          );

        assert.equal(
          result.defaultFeeAmount,
          50_250_000n,
        );

        assert.equal(
          result.refundableAfterDefaultFee,
          954_750_001n,
        );

        assert.equal(
          result.defaultFeeAmount +
            result.refundableAfterDefaultFee,
          result.grossStake,
        );

        assert.equal(
          result.roundingRemainder,
          500n,
        );
      },
    );

    it(
      'supports an explicit valid default fee BPS',
      () => {
        const result =
          calculateDefaultFee(
            100_000_000n,
            250,
          );

        assert.equal(
          result.defaultFeeAmount,
          2_500_000n,
        );

        assert.equal(
          result.refundableAfterDefaultFee,
          97_500_000n,
        );
      },
    );

    it(
      'returns zero fee for zero stake',
      () => {
        const result =
          calculateDefaultFee(
            0n,
          );

        assert.equal(
          result.defaultFeeAmount,
          0n,
        );

        assert.equal(
          result.refundableAfterDefaultFee,
          0n,
        );
      },
    );

    it(
      'rejects a negative gross stake',
      () => {
        expectDomainError(
          () =>
            calculateDefaultFee(
              -1n,
            ),
          'INVALID_INPUT',
        );
      },
    );
  },
);

describe(
  'fee snapshot immutability',
  () => {
    it(
      'recognizes equal snapshots',
      () => {
        const left =
          canonicalSnapshot();

        const right =
          canonicalSnapshot();

        assert.equal(
          areFeeSnapshotsEqual(
            left,
            right,
          ),
          true,
        );
      },
    );

    it(
      'compares wallet addresses case-insensitively',
      () => {
        const left =
          canonicalSnapshot();

        const right =
          canonicalSnapshot({
            platformWallet:
              PLATFORM_WALLET.toUpperCase() as Address,
          });

        assert.equal(
          areFeeSnapshotsEqual(
            left,
            right,
          ),
          true,
        );
      },
    );

    it(
      'detects a changed BPS value',
      () => {
        const left =
          canonicalSnapshot();

        const right =
          createFeeSnapshot(
            {
              ...canonicalInput(),
              platformBps:
                300,
              configurationVersion:
                'fee-v2',
            },
            {
              requireCanonicalDistribution:
                false,
            },
          );

        assert.equal(
          areFeeSnapshotsEqual(
            left,
            right,
          ),
          false,
        );
      },
    );

    it(
      'detects a changed recipient wallet',
      () => {
        const left =
          canonicalSnapshot();

        const right =
          canonicalSnapshot({
            taxWallet:
              '0x5555555555555555555555555555555555555555',
          });

        assert.equal(
          areFeeSnapshotsEqual(
            left,
            right,
          ),
          false,
        );
      },
    );

    it(
      'detects a changed configuration version',
      () => {
        const left =
          canonicalSnapshot();

        const right =
          canonicalSnapshot({
            configurationVersion:
              'fee-v2',
          });

        assert.equal(
          areFeeSnapshotsEqual(
            left,
            right,
          ),
          false,
        );
      },
    );

    it(
      'assertFeeSnapshotUnchanged accepts an identical snapshot',
      () => {
        assert.doesNotThrow(
          () =>
            assertFeeSnapshotUnchanged(
              canonicalSnapshot(),
              canonicalSnapshot(),
            ),
        );
      },
    );

    it(
      'assertFeeSnapshotUnchanged rejects a changed snapshot',
      () => {
        expectDomainError(
          () =>
            assertFeeSnapshotUnchanged(
              canonicalSnapshot(),
              canonicalSnapshot({
                configurationVersion:
                  'fee-v2',
              }),
            ),
          'AUCTION_STATE_CHANGED',
        );
      },
    );
  },
);
