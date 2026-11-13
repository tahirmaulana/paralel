// @file packages/domain/test/bid-reconstruction.test.ts

import assert from 'node:assert/strict';
import {
  describe,
  it,
} from 'node:test';

import {
  assertBidProjectionInvariant,
  deriveUnreportedBidComponent,
  isFirstBid,
  reconstructAmountAdded,
  reconstructBid,
  reconstructBidPhase,
} from '../src/bid-reconstruction';

import {
  DomainError,
} from '../src/errors';

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
  'bid amount reconstruction',
  () => {
    it(
      'reconstructs the full first-bid transfer',
      () => {
        const startingBid =
          1_000_000_000n;

        const selectedIncrement =
          5_000_000n;

        const myBidAfter =
          startingBid +
          selectedIncrement;

        const amountAdded =
          reconstructAmountAdded(
            0n,
            myBidAfter,
          );

        assert.equal(
          amountAdded,
          1_005_000_000n,
        );
      },
    );

    it(
      'reconstructs only the added increment on a later bid',
      () => {
        const amountAdded =
          reconstructAmountAdded(
            1_005_000_000n,
            1_010_000_000n,
          );

        assert.equal(
          amountAdded,
          5_000_000n,
        );
      },
    );

    it(
      'supports the canonical 0.05 USDC increment',
      () => {
        const amountAdded =
          reconstructAmountAdded(
            1_000_000n,
            1_050_000n,
          );

        assert.equal(
          amountAdded,
          50_000n,
        );
      },
    );

    it(
      'rejects a decreasing cumulative bid',
      () => {
        expectDomainError(
          () =>
            reconstructAmountAdded(
              1_010_000_000n,
              1_005_000_000n,
            ),
          'AUCTION_STATE_CHANGED',
        );
      },
    );

    it(
      'rejects an event that does not increment the cumulative bid',
      () => {
        expectDomainError(
          () =>
            reconstructAmountAdded(
              1_005_000_000n,
              1_005_000_000n,
            ),
          'AUCTION_STATE_CHANGED',
        );
      },
    );

    it(
      'rejects a negative previous cumulative bid',
      () => {
        expectDomainError(
          () =>
            reconstructAmountAdded(
              -1n,
              1_000_000n,
            ),
          'INVALID_INPUT',
        );
      },
    );

    it(
      'rejects a negative resulting cumulative bid',
      () => {
        expectDomainError(
          () =>
            reconstructAmountAdded(
              0n,
              -1n,
            ),
          'INVALID_INPUT',
        );
      },
    );

    it(
      'identifies a first bid from zero previous cumulative bid',
      () => {
        assert.equal(
          isFirstBid(0n),
          true,
        );

        assert.equal(
          isFirstBid(1n),
          false,
        );
      },
    );

    it(
      'rejects a negative value when identifying a first bid',
      () => {
        expectDomainError(
          () =>
            isFirstBid(-1n),
          'INVALID_INPUT',
        );
      },
    );
  },
);

describe(
  'bid phase reconstruction',
  () => {
    const openAt =
      1_800_000_000n;

    it(
      'classifies a bid before openAt as PRE_BID',
      () => {
        assert.equal(
          reconstructBidPhase(
            openAt - 1n,
            openAt,
          ),
          'PRE_BID',
        );
      },
    );

    it(
      'classifies a bid exactly at openAt as LIVE_BID',
      () => {
        assert.equal(
          reconstructBidPhase(
            openAt,
            openAt,
          ),
          'LIVE_BID',
        );
      },
    );

    it(
      'classifies a bid after openAt as LIVE_BID',
      () => {
        assert.equal(
          reconstructBidPhase(
            openAt + 1n,
            openAt,
          ),
          'LIVE_BID',
        );
      },
    );

    it(
      'rejects a negative block timestamp',
      () => {
        expectDomainError(
          () =>
            reconstructBidPhase(
              -1n,
              openAt,
            ),
          'INVALID_INPUT',
        );
      },
    );

    it(
      'rejects a negative round open timestamp',
      () => {
        expectDomainError(
          () =>
            reconstructBidPhase(
              openAt,
              -1n,
            ),
          'INVALID_INPUT',
        );
      },
    );
  },
);

describe(
  'bid projection invariant',
  () => {
    it(
      'accepts a valid cumulative-bid projection',
      () => {
        assert.doesNotThrow(
          () =>
            assertBidProjectionInvariant({
              previousMyBid:
                1_005_000_000n,
              amountAdded:
                5_000_000n,
              myBidAfter:
                1_010_000_000n,
            }),
        );
      },
    );

    it(
      'accepts a valid first-bid projection',
      () => {
        assert.doesNotThrow(
          () =>
            assertBidProjectionInvariant({
              previousMyBid:
                0n,
              amountAdded:
                1_005_000_000n,
              myBidAfter:
                1_005_000_000n,
            }),
        );
      },
    );

    it(
      'rejects a projection whose cumulative amount does not balance',
      () => {
        expectDomainError(
          () =>
            assertBidProjectionInvariant({
              previousMyBid:
                1_005_000_000n,
              amountAdded:
                5_000_000n,
              myBidAfter:
                1_009_000_000n,
            }),
          'AUCTION_STATE_CHANGED',
        );
      },
    );

    it(
      'rejects a zero amountAdded',
      () => {
        expectDomainError(
          () =>
            assertBidProjectionInvariant({
              previousMyBid:
                1_005_000_000n,
              amountAdded:
                0n,
              myBidAfter:
                1_005_000_000n,
            }),
          'AUCTION_STATE_CHANGED',
        );
      },
    );
  },
);

describe(
  'complete BidPlaced reconstruction',
  () => {
    it(
      'detects the unreported starting-bid component on the first bid',
      () => {
        const result =
          reconstructBid({
            previousMyBid:
              0n,
            myBidAfter:
              1_005_000_000n,
            eventAdded:
              5_000_000n,
            blockTimestamp:
              1_799_999_999n,
            roundOpenAt:
              1_800_000_000n,
          });

        assert.deepEqual(
          result,
          {
            amountAdded:
              1_005_000_000n,
            phase:
              'PRE_BID',
            previousMyBid:
              0n,
            myBidAfter:
              1_005_000_000n,
            eventAdded:
              5_000_000n,
            eventAddedDifference:
              1_000_000_000n,
            eventAddedMatches:
              false,
          },
        );
      },
    );

    it(
      'confirms eventAdded on a later bid',
      () => {
        const result =
          reconstructBid({
            previousMyBid:
              1_005_000_000n,
            myBidAfter:
              1_010_000_000n,
            eventAdded:
              5_000_000n,
            blockTimestamp:
              1_800_000_010n,
            roundOpenAt:
              1_800_000_000n,
          });

        assert.deepEqual(
          result,
          {
            amountAdded:
              5_000_000n,
            phase:
              'LIVE_BID',
            previousMyBid:
              1_005_000_000n,
            myBidAfter:
              1_010_000_000n,
            eventAdded:
              5_000_000n,
            eventAddedDifference:
              0n,
            eventAddedMatches:
              true,
          },
        );
      },
    );

    it(
      'supports reconstruction when eventAdded is unavailable',
      () => {
        const result =
          reconstructBid({
            previousMyBid:
              1_005_000_000n,
            myBidAfter:
              1_010_000_000n,
            blockTimestamp:
              1_800_000_010n,
            roundOpenAt:
              1_800_000_000n,
          });

        assert.equal(
          result.amountAdded,
          5_000_000n,
        );

        assert.equal(
          result.phase,
          'LIVE_BID',
        );

        assert.equal(
          result.eventAdded,
          null,
        );

        assert.equal(
          result.eventAddedDifference,
          null,
        );

        assert.equal(
          result.eventAddedMatches,
          null,
        );
      },
    );

    it(
      'rejects a negative eventAdded',
      () => {
        expectDomainError(
          () =>
            reconstructBid({
              previousMyBid:
                1_000_000n,
              myBidAfter:
                1_050_000n,
              eventAdded:
                -1n,
              blockTimestamp:
                1_800_000_000n,
              roundOpenAt:
                1_800_000_000n,
            }),
          'INVALID_INPUT',
        );
      },
    );
  },
);

describe(
  'unreported bid component',
  () => {
    it(
      'returns the starting-bid component omitted by the first event',
      () => {
        assert.equal(
          deriveUnreportedBidComponent({
            reconstructedAmountAdded:
              1_005_000_000n,
            eventAdded:
              5_000_000n,
          }),
          1_000_000_000n,
        );
      },
    );

    it(
      'returns zero when the event amount is already correct',
      () => {
        assert.equal(
          deriveUnreportedBidComponent({
            reconstructedAmountAdded:
              5_000_000n,
            eventAdded:
              5_000_000n,
          }),
          0n,
        );
      },
    );

    it(
      'rejects eventAdded larger than reconstructed amount',
      () => {
        expectDomainError(
          () =>
            deriveUnreportedBidComponent({
              reconstructedAmountAdded:
                5_000_000n,
              eventAdded:
                6_000_000n,
            }),
          'AUCTION_STATE_CHANGED',
        );
      },
    );
  },
);
