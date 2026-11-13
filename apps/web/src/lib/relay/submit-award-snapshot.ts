// @file apps/web/src/lib/relay/submit-award-snapshot.ts
//
// Transaction-local database snapshot for AwardSign relay preparation.
//
// Resolution is bounded to database auctions currently projected as AWARDING.
// After deterministic key resolution, the exact auction and current round are
// locked and revalidated in the same PostgreSQL transaction.
import type {
  TransactionSql,
} from 'postgres';

import {
  createDomainError,
  isDatabaseAuctionStatus,
  type DatabaseAuctionStatus,
} from '@paralel/domain';

import {
  isAddress,
  type Address,
  type Hex,
} from 'viem';

import {
  resolveAuctionIdentityFromKey,
  type AuctionKeyCandidate,
} from './auction-key-resolution';

type CandidateRow =
  Readonly<{
    auctionId:
      string;
    auctionCode:
      string;
    currentRound:
      number;
  }>;

type LockedAwardRow =
  Readonly<{
    auctionId:
      string;
    auctionCode:
      string;
    status:
      string;
    currentRound:
      number;
    consignorWallet:
      string;
    startingBid:
      bigint;
    bidIncrement:
      bigint;
    openAt:
      Date;
    closeAt:
      Date;
  }>;

export type SubmitAwardDatabaseSnapshot =
  Readonly<{
    auctionId:
      string;
    auctionCode:
      string;
    auctionKey:
      Hex;
    status:
      DatabaseAuctionStatus;
    currentRound:
      number;
    consignorWallet:
      Address;
    startingBid:
      bigint;
    bidIncrement:
      bigint;
    openAt:
      Date;
    closeAt:
      Date;
  }>;

export async function readSubmitAwardDatabaseSnapshot(
  transaction:
    TransactionSql,
  input:
    Readonly<{
      auctionKey:
        Hex;
      roundNo:
        number;
    }>,
): Promise<
  SubmitAwardDatabaseSnapshot
> {
  /*
   * This candidate set is intentionally bounded to AWARDING.
   * No database key column or reverse-hash assumption is introduced.
   */
  const candidateRows =
    await transaction<
      CandidateRow[]
    >`
      SELECT
        a.id
          AS "auctionId",
        a.auction_code
          AS "auctionCode",
        a.current_round
          AS "currentRound"
      FROM auctions a
      WHERE
        a.status =
          'AWARDING'
        AND a.current_round =
          ${input.roundNo}
    `;

  const identity =
    resolveAuctionIdentityFromKey(
      candidateRows satisfies
        readonly AuctionKeyCandidate[],
      input,
    );

  const lockedRows =
    await transaction<
      LockedAwardRow[]
    >`
      SELECT
        a.id
          AS "auctionId",
        a.auction_code
          AS "auctionCode",
        a.status,
        a.current_round
          AS "currentRound",
        consignor.wallet
          AS "consignorWallet",
        r.starting_bid
          AS "startingBid",
        r.bid_increment
          AS "bidIncrement",
        r.open_at
          AS "openAt",
        r.close_at
          AS "closeAt"
      FROM auctions a
      JOIN users consignor
        ON consignor.id =
          a.consignor_id
      JOIN auction_rounds r
        ON r.auction_id =
          a.id
        AND r.round_no =
          a.current_round
      WHERE
        a.id =
          ${identity.auctionId}
        AND a.auction_code =
          ${identity.auctionCode}
        AND a.current_round =
          ${identity.currentRound}
      FOR UPDATE OF a, r
    `;

  if (
    lockedRows.length ===
      0
  ) {
    throw createDomainError(
      'AUCTION_STATE_CHANGED',
      'Auction changed before AwardSign preparation.',
      {
        retryable:
          true,
        details: {
          auctionId:
            identity.auctionId,
        },
      },
    );
  }

  if (
    lockedRows.length !==
      1 ||
    !lockedRows[0]
  ) {
    throw new Error(
      'AwardSign database snapshot is not unique.',
    );
  }

  const row =
    lockedRows[0];

  if (
    row.auctionId !==
      identity.auctionId ||
    row.auctionCode !==
      identity.auctionCode ||
    row.currentRound !==
      identity.currentRound ||
    !isDatabaseAuctionStatus(
      row.status,
    ) ||
    row.status !==
      'AWARDING' ||
    !Number.isSafeInteger(
      row.currentRound,
    ) ||
    row.currentRound < 1 ||
    !isAddress(
      row.consignorWallet,
    ) ||
    row.startingBid < 0n ||
    row.bidIncrement <= 0n ||
    !Number.isFinite(
      row.openAt.getTime(),
    ) ||
    !Number.isFinite(
      row.closeAt.getTime(),
    ) ||
    row.closeAt.getTime() <=
      row.openAt.getTime()
  ) {
    throw createDomainError(
      'AUCTION_STATE_CHANGED',
      'Auction is no longer eligible for AwardSign preparation.',
      {
        retryable:
          true,
        details: {
          auctionId:
            identity.auctionId,
        },
      },
    );
  }

  return Object.freeze({
    auctionId:
      row.auctionId,
    auctionCode:
      row.auctionCode,
    auctionKey:
      identity.auctionKey,
    status:
      row.status,
    currentRound:
      row.currentRound,
    consignorWallet:
      row.consignorWallet
        .toLowerCase() as Address,
    startingBid:
      row.startingBid,
    bidIncrement:
      row.bidIncrement,
    openAt:
      new Date(
        row.openAt,
      ),
    closeAt:
      new Date(
        row.closeAt,
      ),
  });
}
