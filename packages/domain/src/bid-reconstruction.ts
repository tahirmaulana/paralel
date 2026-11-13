// @file packages/domain/src/bid-reconstruction.ts

/**
 * Canonical bid-event reconstruction rules for PARALEL.
 *
 * Kontrak deployed tetap menjadi sumber fakta on-chain, tetapi beberapa
 * field event perlu direkonstruksi agar projection database mempunyai
 * semantik yang benar.
 *
 * File ini murni dan tidak bergantung pada database, RPC, indexer runtime,
 * React, Next.js, atau Cloudflare Workers.
 */

import {
  assertDomain,
} from './errors';

import type {
  UnixSeconds,
} from './deadlines';

export const BID_PHASES = [
  'PRE_BID',
  'LIVE_BID',
] as const;

export type BidPhase =
  (typeof BID_PHASES)[number];

export type BidReconstructionInput = {
  /**
   * Cumulative bid bidder sebelum event diproses.
   *
   * Untuk bid pertama nilainya 0.
   */
  previousMyBid: bigint;

  /**
   * Cumulative bid bidder setelah event BidPlaced.
   */
  myBidAfter: bigint;

  /**
   * Nilai `added` yang dikeluarkan event deployed contract.
   *
   * Disimpan hanya untuk audit dan drift detection.
   * Projection `amountAdded` tidak boleh mempercayai nilai ini secara mentah.
   */
  eventAdded?: bigint | null;

  /**
   * Timestamp block tempat event masuk, dalam Unix seconds.
   */
  blockTimestamp: UnixSeconds;

  /**
   * Timestamp round mulai OPEN, dalam Unix seconds.
   */
  roundOpenAt: UnixSeconds;
};

export type BidReconstructionResult = {
  amountAdded: bigint;
  phase: BidPhase;

  previousMyBid: bigint;
  myBidAfter: bigint;

  eventAdded: bigint | null;

  /**
   * Selisih antara reconstructed amountAdded dan event `added`.
   *
   * Pada bid pertama deployed contract dapat menghasilkan perbedaan sebesar
   * starting bid.
   */
  eventAddedDifference: bigint | null;

  /**
   * True bila event `added` sama dengan reconstructed amount.
   */
  eventAddedMatches:
    | boolean
    | null;
};

export type BidProjectionInvariantInput = {
  previousMyBid: bigint;
  amountAdded: bigint;
  myBidAfter: bigint;
};

function assertNonNegativeBigInt(
  value: bigint,
  field: string,
): void {
  assertDomain(
    typeof value === 'bigint',
    'INVALID_INPUT',
    `${field} must be a bigint.`,
    {
      details: {
        field,
        receivedType:
          typeof value,
      },
    },
  );

  assertDomain(
    value >= 0n,
    'INVALID_INPUT',
    `${field} cannot be negative.`,
    {
      details: {
        field,
        value:
          value.toString(),
      },
    },
  );
}

/**
 * Rekonstruksi nominal dana yang benar-benar menambah cumulative bidder stake.
 *
 * Formula:
 *
 * amountAdded = myBidAfter - previousMyBid
 *
 * Untuk bid pertama:
 *
 * previousMyBid = 0
 * myBidAfter = startingBid + selectedIncrement
 * amountAdded = startingBid + selectedIncrement
 *
 * Untuk bid berikutnya:
 *
 * amountAdded = selectedIncrement
 */
export function reconstructAmountAdded(
  previousMyBid: bigint,
  myBidAfter: bigint,
): bigint {
  assertNonNegativeBigInt(
    previousMyBid,
    'previousMyBid',
  );

  assertNonNegativeBigInt(
    myBidAfter,
    'myBidAfter',
  );

  assertDomain(
    myBidAfter >= previousMyBid,
    'AUCTION_STATE_CHANGED',
    'myBidAfter cannot be lower than previousMyBid.',
    {
      details: {
        previousMyBid:
          previousMyBid.toString(),
        myBidAfter:
          myBidAfter.toString(),
      },
    },
  );

  const amountAdded =
    myBidAfter - previousMyBid;

  assertDomain(
    amountAdded > 0n,
    'AUCTION_STATE_CHANGED',
    'Bid event does not increase the bidder cumulative stake.',
    {
      details: {
        previousMyBid:
          previousMyBid.toString(),
        myBidAfter:
          myBidAfter.toString(),
      },
    },
  );

  return amountAdded;
}

/**
 * Menentukan fase bid berdasarkan block timestamp dan round openAt.
 *
 * Bid pada block timestamp yang sama dengan openAt sudah termasuk LIVE_BID.
 */
export function reconstructBidPhase(
  blockTimestamp: UnixSeconds,
  roundOpenAt: UnixSeconds,
): BidPhase {
  assertNonNegativeBigInt(
    blockTimestamp,
    'blockTimestamp',
  );

  assertNonNegativeBigInt(
    roundOpenAt,
    'roundOpenAt',
  );

  return blockTimestamp < roundOpenAt
    ? 'PRE_BID'
    : 'LIVE_BID';
}

/**
 * Memastikan projection memenuhi cumulative-bid invariant.
 */
export function assertBidProjectionInvariant(
  input: BidProjectionInvariantInput,
): void {
  assertNonNegativeBigInt(
    input.previousMyBid,
    'previousMyBid',
  );

  assertNonNegativeBigInt(
    input.amountAdded,
    'amountAdded',
  );

  assertNonNegativeBigInt(
    input.myBidAfter,
    'myBidAfter',
  );

  assertDomain(
    input.amountAdded > 0n,
    'AUCTION_STATE_CHANGED',
    'amountAdded must be greater than zero.',
    {
      details: {
        amountAdded:
          input.amountAdded.toString(),
      },
    },
  );

  const calculatedMyBidAfter =
    input.previousMyBid +
    input.amountAdded;

  assertDomain(
    calculatedMyBidAfter ===
      input.myBidAfter,
    'AUCTION_STATE_CHANGED',
    'Bid projection invariant failed.',
    {
      details: {
        previousMyBid:
          input.previousMyBid.toString(),
        amountAdded:
          input.amountAdded.toString(),
        expectedMyBidAfter:
          calculatedMyBidAfter.toString(),
        receivedMyBidAfter:
          input.myBidAfter.toString(),
      },
    },
  );
}

/**
 * Rekonstruksi lengkap satu BidPlaced event untuk projection database.
 */
export function reconstructBid(
  input: BidReconstructionInput,
): BidReconstructionResult {
  const amountAdded =
    reconstructAmountAdded(
      input.previousMyBid,
      input.myBidAfter,
    );

  const phase =
    reconstructBidPhase(
      input.blockTimestamp,
      input.roundOpenAt,
    );

  assertBidProjectionInvariant({
    previousMyBid:
      input.previousMyBid,
    amountAdded,
    myBidAfter:
      input.myBidAfter,
  });

  const eventAdded =
    input.eventAdded === undefined ||
    input.eventAdded === null
      ? null
      : input.eventAdded;

  if (eventAdded !== null) {
    assertNonNegativeBigInt(
      eventAdded,
      'eventAdded',
    );
  }

  const eventAddedDifference =
    eventAdded === null
      ? null
      : amountAdded - eventAdded;

  return {
    amountAdded,
    phase,
    previousMyBid:
      input.previousMyBid,
    myBidAfter:
      input.myBidAfter,
    eventAdded,
    eventAddedDifference,
    eventAddedMatches:
      eventAdded === null
        ? null
        : eventAdded === amountAdded,
  };
}

/**
 * Menunjukkan apakah event merupakan bid pertama bidder pada round tersebut.
 */
export function isFirstBid(
  previousMyBid: bigint,
): boolean {
  assertNonNegativeBigInt(
    previousMyBid,
    'previousMyBid',
  );

  return previousMyBid === 0n;
}

/**
 * Menghitung starting-bid component yang tidak muncul pada event `added`
 * ketika deployed contract mengeluarkan selected increment saja.
 *
 * Return 0 bila eventAdded sudah sama dengan reconstructed amount.
 */
export function deriveUnreportedBidComponent(
  input: {
    reconstructedAmountAdded: bigint;
    eventAdded: bigint;
  },
): bigint {
  assertNonNegativeBigInt(
    input.reconstructedAmountAdded,
    'reconstructedAmountAdded',
  );

  assertNonNegativeBigInt(
    input.eventAdded,
    'eventAdded',
  );

  assertDomain(
    input.reconstructedAmountAdded >=
      input.eventAdded,
    'AUCTION_STATE_CHANGED',
    'eventAdded cannot exceed reconstructed amountAdded.',
    {
      details: {
        reconstructedAmountAdded:
          input.reconstructedAmountAdded.toString(),
        eventAdded:
          input.eventAdded.toString(),
      },
    },
  );

  return (
    input.reconstructedAmountAdded -
    input.eventAdded
  );
}
