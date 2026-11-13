// @file packages/domain/test/deadlines.test.ts

import assert from 'node:assert/strict';
import {
  describe,
  it,
} from 'node:test';

import type {
  Address,
} from 'viem';

import {
  CLAIM_WINDOW_SECONDS,
  COLLECTION_WINDOW_SECONDS,
  RANK_SLOTS,
  SIGNING_WINDOW_SECONDS,
} from '@paralel/contracts';

import {
  assertRefundEligible,
  dateFromUnixSeconds,
  deriveAutoIssuedClaimPeriodEnd,
  deriveAwardingDeadline,
  deriveClaimPeriodEnd,
  deriveCloseAt,
  deriveCollectionDeadline,
  deriveDeadlineSet,
  hasReachedDeadline,
  isAwardingExpired,
  isClaimPeriodComplete,
  isCollectionExpired,
  resolveRefundEligibility,
  secondsUntil,
  unixSecondsFromDate,
  validateTopRank,
} from '../src/deadlines';

import {
  DomainError,
} from '../src/errors';

const BIDDER_A =
  '0x1111111111111111111111111111111111111111' as Address;

const BIDDER_B =
  '0x2222222222222222222222222222222222222222' as Address;

const OPEN_AT =
  1_800_000_000n;

const CLOSE_AT =
  OPEN_AT + 24n * 60n * 60n;

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
  'auction deadlines',
  () => {
    it(
      'converts Date to Unix seconds using floor precision',
      () => {
        const value =
          new Date(
            '2027-01-15T08:00:00.999Z',
          );

        assert.equal(
          unixSecondsFromDate(value),
          1_800_000_000n,
        );
      },
    );

    it(
      'converts Unix seconds to Date',
      () => {
        const value =
          dateFromUnixSeconds(
            1_800_000_000n,
          );

        assert.equal(
          value.toISOString(),
          '2027-01-15T08:00:00.000Z',
        );
      },
    );

    it(
      'round-trips an exact-second Date',
      () => {
        const initial =
          new Date(
            '2027-01-15T08:00:00.000Z',
          );

        const result =
          dateFromUnixSeconds(
            unixSecondsFromDate(
              initial,
            ),
          );

        assert.equal(
          result.getTime(),
          initial.getTime(),
        );
      },
    );

    it(
      'rejects an invalid Date',
      () => {
        expectDomainError(
          () =>
            unixSecondsFromDate(
              new Date(Number.NaN),
            ),
          'INVALID_INPUT',
        );
      },
    );

    it(
      'rejects a negative Unix timestamp',
      () => {
        expectDomainError(
          () =>
            dateFromUnixSeconds(
              -1n,
            ),
          'INVALID_INPUT',
        );
      },
    );

    it(
      'derives closeAt from openAt and duration hours',
      () => {
        assert.equal(
          deriveCloseAt(
            OPEN_AT,
            24,
          ),
          CLOSE_AT,
        );
      },
    );

    it(
      'supports durations longer than one day',
      () => {
        assert.equal(
          deriveCloseAt(
            OPEN_AT,
            72,
          ),
          OPEN_AT +
            72n * 60n * 60n,
        );
      },
    );

    it(
      'rejects zero duration',
      () => {
        expectDomainError(
          () =>
            deriveCloseAt(
              OPEN_AT,
              0,
            ),
          'INVALID_INPUT',
        );
      },
    );

    it(
      'rejects fractional duration hours',
      () => {
        expectDomainError(
          () =>
            deriveCloseAt(
              OPEN_AT,
              1.5,
            ),
          'INVALID_INPUT',
        );
      },
    );

    it(
      'derives the five-minute awarding deadline',
      () => {
        const startedAt =
          2_000_000_000n;

        assert.equal(
          deriveAwardingDeadline(
            startedAt,
          ),
          startedAt +
            SIGNING_WINDOW_SECONDS,
        );

        assert.equal(
          SIGNING_WINDOW_SECONDS,
          300n,
        );
      },
    );

    it(
      'derives the 48-hour collection deadline',
      () => {
        const awardSignedAt =
          2_000_000_000n;

        assert.equal(
          deriveCollectionDeadline(
            awardSignedAt,
          ),
          awardSignedAt +
            COLLECTION_WINDOW_SECONDS,
        );

        assert.equal(
          COLLECTION_WINDOW_SECONDS,
          172_800n,
        );
      },
    );

    it(
      'derives the seven-day claim period end',
      () => {
        const claimStartedAt =
          2_000_000_000n;

        assert.equal(
          deriveClaimPeriodEnd(
            claimStartedAt,
          ),
          claimStartedAt +
            CLAIM_WINDOW_SECONDS,
        );

        assert.equal(
          CLAIM_WINDOW_SECONDS,
          604_800n,
        );
      },
    );

    it(
      'derives auto-issued claim period from collection deadline',
      () => {
        const collectionDeadline =
          2_000_000_000n;

        assert.equal(
          deriveAutoIssuedClaimPeriodEnd(
            collectionDeadline,
          ),
          collectionDeadline +
            CLAIM_WINDOW_SECONDS,
        );
      },
    );

    it(
      'builds a complete deadline set',
      () => {
        const awardingStartedAt =
          CLOSE_AT;

        const awardSignedAt =
          awardingStartedAt + 120n;

        const claimPeriodStartedAt =
          awardSignedAt + 3_600n;

        const result =
          deriveDeadlineSet({
            openAt:
              OPEN_AT,
            durationHours:
              24,
            awardingStartedAt,
            awardSignedAt,
            claimPeriodStartedAt,
          });

        assert.deepEqual(
          result,
          {
            openAt:
              OPEN_AT,
            closeAt:
              CLOSE_AT,
            awardingDeadline:
              awardingStartedAt +
              SIGNING_WINDOW_SECONDS,
            collectionDeadline:
              awardSignedAt +
              COLLECTION_WINDOW_SECONDS,
            claimPeriodEnd:
              claimPeriodStartedAt +
              CLAIM_WINDOW_SECONDS,
          },
        );
      },
    );

    it(
      'leaves optional deadlines null when lifecycle has not reached them',
      () => {
        const result =
          deriveDeadlineSet({
            openAt:
              OPEN_AT,
            durationHours:
              24,
          });

        assert.equal(
          result.awardingDeadline,
          null,
        );

        assert.equal(
          result.collectionDeadline,
          null,
        );

        assert.equal(
          result.claimPeriodEnd,
          null,
        );
      },
    );

    it(
      'treats exact deadline as reached',
      () => {
        assert.equal(
          hasReachedDeadline(
            100n,
            100n,
          ),
          true,
        );

        assert.equal(
          hasReachedDeadline(
            99n,
            100n,
          ),
          false,
        );
      },
    );

    it(
      'uses the same inclusive boundary for awarding expiry',
      () => {
        assert.equal(
          isAwardingExpired(
            299n,
            300n,
          ),
          false,
        );

        assert.equal(
          isAwardingExpired(
            300n,
            300n,
          ),
          true,
        );
      },
    );

    it(
      'uses the same inclusive boundary for collection expiry',
      () => {
        assert.equal(
          isCollectionExpired(
            999n,
            1_000n,
          ),
          false,
        );

        assert.equal(
          isCollectionExpired(
            1_000n,
            1_000n,
          ),
          true,
        );
      },
    );

    it(
      'uses the same inclusive boundary for claim period completion',
      () => {
        assert.equal(
          isClaimPeriodComplete(
            999n,
            1_000n,
          ),
          false,
        );

        assert.equal(
          isClaimPeriodComplete(
            1_000n,
            1_000n,
          ),
          true,
        );
      },
    );

    it(
      'calculates seconds until a future deadline',
      () => {
        assert.equal(
          secondsUntil(
            700n,
            1_000n,
          ),
          300n,
        );
      },
    );

    it(
      'returns zero when deadline is reached or passed',
      () => {
        assert.equal(
          secondsUntil(
            1_000n,
            1_000n,
          ),
          0n,
        );

        assert.equal(
          secondsUntil(
            1_001n,
            1_000n,
          ),
          0n,
        );
      },
    );

    it(
      'accepts null and ranks 1 through 10',
      () => {
        assert.doesNotThrow(
          () =>
            validateTopRank(null),
        );

        assert.doesNotThrow(
          () =>
            validateTopRank(1),
        );

        assert.doesNotThrow(
          () =>
            validateTopRank(
              RANK_SLOTS,
            ),
        );
      },
    );

    it(
      'rejects invalid rank boundaries',
      () => {
        expectDomainError(
          () =>
            validateTopRank(0),
          'INVALID_INPUT',
        );

        expectDomainError(
          () =>
            validateTopRank(
              RANK_SLOTS + 1,
            ),
          'INVALID_INPUT',
        );

        expectDomainError(
          () =>
            validateTopRank(1.5),
          'INVALID_INPUT',
        );
      },
    );
  },
);

describe(
  'refund eligibility',
  () => {
    it(
      'rejects a bidder with no stake',
      () => {
        const result =
          resolveRefundEligibility({
            now:
              CLOSE_AT + 1n,
            closeAt:
              CLOSE_AT,
            bidder:
              BIDDER_A,
            winner:
              null,
            myBid:
              0n,
            withdrawn:
              false,
            rank:
              null,
            defaulted:
              false,
            passedIn:
              false,
          });

        assert.deepEqual(
          result,
          {
            eligible:
              false,
            reason:
              'NO_STAKE',
            availableAt:
              null,
          },
        );
      },
    );

    it(
      'rejects an already withdrawn stake',
      () => {
        const result =
          resolveRefundEligibility({
            now:
              CLOSE_AT + 1n,
            closeAt:
              CLOSE_AT,
            bidder:
              BIDDER_A,
            winner:
              null,
            myBid:
              1_000_000n,
            withdrawn:
              true,
            rank:
              null,
            defaulted:
              false,
            passedIn:
              false,
          });

        assert.equal(
          result.eligible,
          false,
        );

        assert.equal(
          result.reason,
          'ALREADY_WITHDRAWN',
        );
      },
    );

    it(
      'never allows the winner to withdraw a refund',
      () => {
        const result =
          resolveRefundEligibility({
            now:
              CLOSE_AT + 1n,
            closeAt:
              CLOSE_AT,
            bidder:
              BIDDER_A,
            winner:
              BIDDER_A,
            myBid:
              1_000_000n,
            withdrawn:
              false,
            rank:
              1,
            defaulted:
              false,
            passedIn:
              false,
          });

        assert.equal(
          result.eligible,
          false,
        );

        assert.equal(
          result.reason,
          'WINNER_CANNOT_REFUND',
        );
      },
    );

    it(
      'compares winner addresses case-insensitively',
      () => {
        const winner =
          BIDDER_A.toUpperCase() as Address;

        const result =
          resolveRefundEligibility({
            now:
              CLOSE_AT + 1n,
            closeAt:
              CLOSE_AT,
            bidder:
              BIDDER_A,
            winner,
            myBid:
              1_000_000n,
            withdrawn:
              false,
            rank:
              1,
            defaulted:
              false,
            passedIn:
              false,
          });

        assert.equal(
          result.reason,
          'WINNER_CANNOT_REFUND',
        );
      },
    );

    it(
      'allows a defaulted candidate immediately',
      () => {
        const now =
          CLOSE_AT + 600n;

        const result =
          resolveRefundEligibility({
            now,
            closeAt:
              CLOSE_AT,
            bidder:
              BIDDER_A,
            winner:
              null,
            myBid:
              1_000_000n,
            withdrawn:
              false,
            rank:
              1,
            defaulted:
              true,
            passedIn:
              false,
          });

        assert.deepEqual(
          result,
          {
            eligible:
              true,
            reason:
              'ELIGIBLE_DEFAULTED',
            availableAt:
              now,
          },
        );
      },
    );

    it(
      'allows a non-winner stake when auction is PASSED_IN',
      () => {
        const now =
          CLOSE_AT + 3_000n;

        const result =
          resolveRefundEligibility({
            now,
            closeAt:
              CLOSE_AT,
            bidder:
              BIDDER_A,
            winner:
              null,
            myBid:
              1_000_000n,
            withdrawn:
              false,
            rank:
              3,
            defaulted:
              false,
            passedIn:
              true,
          });

        assert.deepEqual(
          result,
          {
            eligible:
              true,
            reason:
              'ELIGIBLE_PASSED_IN',
            availableAt:
              now,
          },
        );
      },
    );

    it(
      'keeps an outside-top-10 bidder locked before closeAt',
      () => {
        const result =
          resolveRefundEligibility({
            now:
              CLOSE_AT - 1n,
            closeAt:
              CLOSE_AT,
            bidder:
              BIDDER_A,
            winner:
              null,
            myBid:
              1_000_000n,
            withdrawn:
              false,
            rank:
              null,
            defaulted:
              false,
            passedIn:
              false,
          });

        assert.deepEqual(
          result,
          {
            eligible:
              false,
            reason:
              'WAITING_FOR_CLOSE',
            availableAt:
              CLOSE_AT,
          },
        );
      },
    );

    it(
      'allows an outside-top-10 bidder exactly at closeAt',
      () => {
        const result =
          resolveRefundEligibility({
            now:
              CLOSE_AT,
            closeAt:
              CLOSE_AT,
            bidder:
              BIDDER_A,
            winner:
              null,
            myBid:
              1_000_000n,
            withdrawn:
              false,
            rank:
              null,
            defaulted:
              false,
            passedIn:
              false,
          });

        assert.deepEqual(
          result,
          {
            eligible:
              true,
            reason:
              'ELIGIBLE_OUTSIDE_TOP_RANKS',
            availableAt:
              CLOSE_AT,
          },
        );
      },
    );

    it(
      'keeps a top-10 bidder locked while awarding has no winner',
      () => {
        const result =
          resolveRefundEligibility({
            now:
              CLOSE_AT + 1_000n,
            closeAt:
              CLOSE_AT,
            bidder:
              BIDDER_A,
            winner:
              null,
            myBid:
              1_000_000n,
            withdrawn:
              false,
            rank:
              2,
            defaulted:
              false,
            passedIn:
              false,
          });

        assert.deepEqual(
          result,
          {
            eligible:
              false,
            reason:
              'WAITING_FOR_AWARDING_RESULT',
            availableAt:
              null,
          },
        );
      },
    );

    it(
      'allows a top-10 non-winner after a winner is selected',
      () => {
        const now =
          CLOSE_AT + 1_000n;

        const result =
          resolveRefundEligibility({
            now,
            closeAt:
              CLOSE_AT,
            bidder:
              BIDDER_A,
            winner:
              BIDDER_B,
            myBid:
              1_000_000n,
            withdrawn:
              false,
            rank:
              2,
            defaulted:
              false,
            passedIn:
              false,
          });

        assert.deepEqual(
          result,
          {
            eligible:
              true,
            reason:
              'ELIGIBLE_AFTER_WINNER_SELECTED',
            availableAt:
              now,
          },
        );
      },
    );

    it(
      'rejects a negative stake amount',
      () => {
        expectDomainError(
          () =>
            resolveRefundEligibility({
              now:
                CLOSE_AT,
              closeAt:
                CLOSE_AT,
              bidder:
                BIDDER_A,
              winner:
                null,
              myBid:
                -1n,
              withdrawn:
                false,
              rank:
                null,
              defaulted:
                false,
              passedIn:
                false,
            }),
          'INVALID_INPUT',
        );
      },
    );

    it(
      'assertRefundEligible passes for an eligible refund',
      () => {
        assert.doesNotThrow(
          () =>
            assertRefundEligible({
              now:
                CLOSE_AT,
              closeAt:
                CLOSE_AT,
              bidder:
                BIDDER_A,
              winner:
                null,
              myBid:
                1_000_000n,
              withdrawn:
                false,
              rank:
                null,
              defaulted:
                false,
              passedIn:
                false,
            }),
        );
      },
    );

    it(
      'assertRefundEligible throws for an ineligible refund',
      () => {
        expectDomainError(
          () =>
            assertRefundEligible({
              now:
                CLOSE_AT - 1n,
              closeAt:
                CLOSE_AT,
              bidder:
                BIDDER_A,
              winner:
                null,
              myBid:
                1_000_000n,
              withdrawn:
                false,
              rank:
                null,
              defaulted:
                false,
              passedIn:
                false,
            }),
          'AUCTION_STATE_CHANGED',
        );
      },
    );
  },
);
