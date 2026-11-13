// @file packages/domain/src/deadlines.ts

/**
 * Canonical deadline and refund-eligibility rules for PARALEL.
 *
 * Seluruh timestamp berbasis Unix seconds agar konsisten dengan Solidity.
 * File ini tidak membaca blockchain atau database.
 */

import type {
  Address,
} from 'viem';

import {
  CLAIM_WINDOW_SECONDS,
  COLLECTION_WINDOW_SECONDS,
  RANK_SLOTS,
  SIGNING_WINDOW_SECONDS,
  ZERO_ADDRESS,
} from '@paralel/contracts';

import {
  assertDomain,
} from './errors';

export type UnixSeconds = bigint;

export type AuctionDeadlineSet = {
  openAt: UnixSeconds;
  closeAt: UnixSeconds;

  awardingDeadline:
    | UnixSeconds
    | null;

  collectionDeadline:
    | UnixSeconds
    | null;

  claimPeriodEnd:
    | UnixSeconds
    | null;
};

export type RefundEligibilityReason =
  | 'ELIGIBLE_OUTSIDE_TOP_RANKS'
  | 'ELIGIBLE_DEFAULTED'
  | 'ELIGIBLE_AFTER_WINNER_SELECTED'
  | 'ELIGIBLE_PASSED_IN'
  | 'NO_STAKE'
  | 'ALREADY_WITHDRAWN'
  | 'WINNER_CANNOT_REFUND'
  | 'WAITING_FOR_CLOSE'
  | 'WAITING_FOR_AWARDING_RESULT'
  | 'INVALID_RANK'
  | 'UNKNOWN';

export type RefundEligibilityInput = {
  now: UnixSeconds;
  closeAt: UnixSeconds;

  bidder: Address;
  winner: Address | null;

  myBid: bigint;
  withdrawn: boolean;

  /**
   * Rank domain menggunakan 1 sampai 10.
   * Gunakan null untuk bidder di luar top 10.
   */
  rank: number | null;

  defaulted: boolean;
  passedIn: boolean;
};

export type RefundEligibilityResult = {
  eligible: boolean;
  reason: RefundEligibilityReason;
  availableAt: UnixSeconds | null;
};

const MAX_DATE_MILLISECONDS =
  BigInt(8_640_000_000_000_000);

function assertNonNegativeTimestamp(
  value: bigint,
  field: string,
): void {
  assertDomain(
    value >= 0n,
    'INVALID_INPUT',
    `${field} cannot be negative.`,
    {
      details: {
        field,
        value: value.toString(),
      },
    },
  );
}

function normalizeAddress(
  address: Address | null,
): string | null {
  if (!address) {
    return null;
  }

  if (
    address.toLowerCase() ===
    ZERO_ADDRESS.toLowerCase()
  ) {
    return null;
  }

  return address.toLowerCase();
}

export function unixSecondsFromDate(
  value: Date,
): UnixSeconds {
  assertDomain(
    value instanceof Date &&
      !Number.isNaN(value.getTime()),
    'INVALID_INPUT',
    'A valid Date is required.',
  );

  return BigInt(
    Math.floor(
      value.getTime() / 1_000,
    ),
  );
}

export function dateFromUnixSeconds(
  value: UnixSeconds,
): Date {
  assertNonNegativeTimestamp(
    value,
    'timestamp',
  );

  const milliseconds =
    value * 1_000n;

  assertDomain(
    milliseconds <=
      MAX_DATE_MILLISECONDS,
    'INVALID_INPUT',
    'Timestamp is outside the supported Date range.',
    {
      details: {
        timestamp: value.toString(),
      },
    },
  );

  return new Date(
    Number(milliseconds),
  );
}

export function deriveCloseAt(
  openAt: UnixSeconds,
  durationHours: number,
): UnixSeconds {
  assertNonNegativeTimestamp(
    openAt,
    'openAt',
  );

  assertDomain(
    Number.isSafeInteger(
      durationHours,
    ) &&
      durationHours > 0,
    'INVALID_INPUT',
    'durationHours must be a positive integer.',
    {
      details: {
        durationHours,
      },
    },
  );

  return (
    openAt +
    BigInt(durationHours) *
      60n *
      60n
  );
}

export function deriveAwardingDeadline(
  awardingStartedAt: UnixSeconds,
): UnixSeconds {
  assertNonNegativeTimestamp(
    awardingStartedAt,
    'awardingStartedAt',
  );

  return (
    awardingStartedAt +
    SIGNING_WINDOW_SECONDS
  );
}

export function deriveCollectionDeadline(
  awardSignedAt: UnixSeconds,
): UnixSeconds {
  assertNonNegativeTimestamp(
    awardSignedAt,
    'awardSignedAt',
  );

  return (
    awardSignedAt +
    COLLECTION_WINDOW_SECONDS
  );
}

/**
 * Claim period dimulai dari collection deadline untuk auto-issued collection,
 * atau dari timestamp Collected untuk physical handover yang dikonfirmasi.
 */
export function deriveClaimPeriodEnd(
  claimPeriodStartedAt: UnixSeconds,
): UnixSeconds {
  assertNonNegativeTimestamp(
    claimPeriodStartedAt,
    'claimPeriodStartedAt',
  );

  return (
    claimPeriodStartedAt +
    CLAIM_WINDOW_SECONDS
  );
}

export function deriveAutoIssuedClaimPeriodEnd(
  collectionDeadline: UnixSeconds,
): UnixSeconds {
  return deriveClaimPeriodEnd(
    collectionDeadline,
  );
}

export function deriveDeadlineSet(
  input: {
    openAt: UnixSeconds;
    durationHours: number;

    awardingStartedAt?:
      | UnixSeconds
      | null;

    awardSignedAt?:
      | UnixSeconds
      | null;

    claimPeriodStartedAt?:
      | UnixSeconds
      | null;
  },
): AuctionDeadlineSet {
  const closeAt = deriveCloseAt(
    input.openAt,
    input.durationHours,
  );

  const awardingDeadline =
    input.awardingStartedAt === null ||
    input.awardingStartedAt === undefined
      ? null
      : deriveAwardingDeadline(
          input.awardingStartedAt,
        );

  const collectionDeadline =
    input.awardSignedAt === null ||
    input.awardSignedAt === undefined
      ? null
      : deriveCollectionDeadline(
          input.awardSignedAt,
        );

  const claimPeriodEnd =
    input.claimPeriodStartedAt === null ||
    input.claimPeriodStartedAt === undefined
      ? null
      : deriveClaimPeriodEnd(
          input.claimPeriodStartedAt,
        );

  return {
    openAt: input.openAt,
    closeAt,
    awardingDeadline,
    collectionDeadline,
    claimPeriodEnd,
  };
}

export function hasReachedDeadline(
  now: UnixSeconds,
  deadline: UnixSeconds,
): boolean {
  assertNonNegativeTimestamp(
    now,
    'now',
  );

  assertNonNegativeTimestamp(
    deadline,
    'deadline',
  );

  return now >= deadline;
}

export function isAwardingExpired(
  now: UnixSeconds,
  awardingDeadline: UnixSeconds,
): boolean {
  return hasReachedDeadline(
    now,
    awardingDeadline,
  );
}

export function isCollectionExpired(
  now: UnixSeconds,
  collectionDeadline: UnixSeconds,
): boolean {
  return hasReachedDeadline(
    now,
    collectionDeadline,
  );
}

export function isClaimPeriodComplete(
  now: UnixSeconds,
  claimPeriodEnd: UnixSeconds,
): boolean {
  return hasReachedDeadline(
    now,
    claimPeriodEnd,
  );
}

export function secondsUntil(
  now: UnixSeconds,
  deadline: UnixSeconds,
): bigint {
  assertNonNegativeTimestamp(
    now,
    'now',
  );

  assertNonNegativeTimestamp(
    deadline,
    'deadline',
  );

  if (now >= deadline) {
    return 0n;
  }

  return deadline - now;
}

export function validateTopRank(
  rank: number | null,
): void {
  if (rank === null) {
    return;
  }

  assertDomain(
    Number.isSafeInteger(rank) &&
      rank >= 1 &&
      rank <= RANK_SLOTS,
    'INVALID_INPUT',
    `rank must be between 1 and ${RANK_SLOTS}, or null.`,
    {
      details: {
        rank,
      },
    },
  );
}

/**
 * Menentukan refund eligibility pada application layer.
 *
 * Contract simulation tetap menjadi final write preflight.
 *
 * Rules:
 *
 * - Winner tidak pernah menerima refund stake pemenang.
 * - Bidder tanpa stake atau yang sudah withdraw tidak eligible.
 * - Defaulted candidate langsung eligible.
 * - PASSED_IN membuat seluruh non-winner stake eligible.
 * - Bidder di luar top 10 eligible setelah closeAt.
 * - Top 10 non-winner eligible setelah winner dipilih.
 */
export function resolveRefundEligibility(
  input: RefundEligibilityInput,
): RefundEligibilityResult {
  assertNonNegativeTimestamp(
    input.now,
    'now',
  );

  assertNonNegativeTimestamp(
    input.closeAt,
    'closeAt',
  );

  assertDomain(
    input.myBid >= 0n,
    'INVALID_INPUT',
    'myBid cannot be negative.',
    {
      details: {
        myBid:
          input.myBid.toString(),
      },
    },
  );

  validateTopRank(
    input.rank,
  );

  if (input.myBid === 0n) {
    return {
      eligible: false,
      reason: 'NO_STAKE',
      availableAt: null,
    };
  }

  if (input.withdrawn) {
    return {
      eligible: false,
      reason: 'ALREADY_WITHDRAWN',
      availableAt: null,
    };
  }

  const normalizedBidder =
    normalizeAddress(input.bidder);

  const normalizedWinner =
    normalizeAddress(input.winner);

  if (
    normalizedWinner !== null &&
    normalizedBidder === normalizedWinner
  ) {
    return {
      eligible: false,
      reason: 'WINNER_CANNOT_REFUND',
      availableAt: null,
    };
  }

  if (input.defaulted) {
    return {
      eligible: true,
      reason: 'ELIGIBLE_DEFAULTED',
      availableAt: input.now,
    };
  }

  if (input.passedIn) {
    return {
      eligible: true,
      reason: 'ELIGIBLE_PASSED_IN',
      availableAt: input.now,
    };
  }

  if (input.rank === null) {
    if (input.now >= input.closeAt) {
      return {
        eligible: true,
        reason:
          'ELIGIBLE_OUTSIDE_TOP_RANKS',
        availableAt:
          input.closeAt,
      };
    }

    return {
      eligible: false,
      reason: 'WAITING_FOR_CLOSE',
      availableAt:
        input.closeAt,
    };
  }

  if (normalizedWinner !== null) {
    return {
      eligible: true,
      reason:
        'ELIGIBLE_AFTER_WINNER_SELECTED',
      availableAt: input.now,
    };
  }

  return {
    eligible: false,
    reason:
      'WAITING_FOR_AWARDING_RESULT',
    availableAt: null,
  };
}

export function assertRefundEligible(
  input: RefundEligibilityInput,
): void {
  const result =
    resolveRefundEligibility(input);

  assertDomain(
    result.eligible,
    'AUCTION_STATE_CHANGED',
    `Refund is not currently available: ${result.reason}`,
    {
      details: {
        reason:
          result.reason,
        availableAt:
          result.availableAt?.toString() ??
          null,
      },
    },
  );
}
