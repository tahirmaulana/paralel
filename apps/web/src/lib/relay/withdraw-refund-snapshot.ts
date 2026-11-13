// @file apps/web/src/lib/relay/withdraw-refund-snapshot.ts
import type {
  TransactionSql,
} from 'postgres';

import {
  createDomainError,
  isDatabaseAuctionStatus,
  type DatabaseAuctionStatus,
} from '@paralel/domain';

import {
  type Address,
  type Hex,
} from 'viem';

import {
  resolveAuctionIdentityFromKey,
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

type LockedRow =
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
    bidderWallet:
      string;
    myBid:
      bigint;
    rank:
      number | null;
    stakeStatus:
      string;
    refundClaimedTx:
      string | null;
  }>;

export type WithdrawRefundDatabaseSnapshot =
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
    bidderWallet:
      Address;
    myBid:
      bigint;
    rank:
      number | null;
    defaulted:
      boolean;
  }>;

export async function readWithdrawRefundDatabaseSnapshot(
  transaction:
    TransactionSql,
  input:
    Readonly<{
      auctionKey:
        Hex;
      roundNo:
        number;
      bidderWallet:
        Address;
    }>,
): Promise<
  WithdrawRefundDatabaseSnapshot
> {
  const candidates =
    await transaction<
      CandidateRow[]
    >`
      SELECT
        id AS "auctionId",
        auction_code AS "auctionCode",
        current_round AS "currentRound"
      FROM auctions
      WHERE current_round =
        ${input.roundNo}
    `;

  const identity =
    resolveAuctionIdentityFromKey(
      candidates,
      {
        auctionKey:
          input.auctionKey,
        roundNo:
          input.roundNo,
      },
    );

  const rows =
    await transaction<
      LockedRow[]
    >`
      SELECT
        a.id AS "auctionId",
        a.auction_code AS "auctionCode",
        a.status,
        a.current_round AS "currentRound",
        consignor.wallet AS "consignorWallet",
        s.bidder_wallet AS "bidderWallet",
        s.my_bid AS "myBid",
        s.rank,
        s.status AS "stakeStatus",
        s.refund_claimed_tx AS "refundClaimedTx"
      FROM auctions a
      JOIN users consignor
        ON consignor.id =
          a.consignor_id
      JOIN bidder_stakes s
        ON s.auction_id =
          a.id
        AND s.round_no =
          a.current_round
        AND s.bidder_wallet =
          ${input.bidderWallet}
      WHERE a.id =
        ${identity.auctionId}
      FOR UPDATE OF a, s
    `;

  if (
    rows.length !== 1 ||
    !rows[0]
  ) {
    throw createDomainError(
      'AUCTION_STATE_CHANGED',
      'Refund database projection is unavailable or changed.',
      {
        retryable:
          true,
      },
    );
  }

  const row =
    rows[0];

  if (
    !isDatabaseAuctionStatus(
      row.status,
    ) ||
    row.currentRound !==
      input.roundNo ||
    row.bidderWallet !==
      input.bidderWallet ||
    row.myBid <= 0n ||
    row.refundClaimedTx !==
      null ||
    row.stakeStatus ===
      'REFUNDED' ||
    (
      row.rank !== null &&
      (
        row.rank < 1 ||
        row.rank > 10
      )
    )
  ) {
    throw createDomainError(
      'AUCTION_STATE_CHANGED',
      'Refund database projection is no longer eligible.',
      {
        retryable:
          true,
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
      row.consignorWallet as Address,
    bidderWallet:
      row.bidderWallet as Address,
    myBid:
      row.myBid,
    rank:
      row.rank,
    defaulted:
      row.stakeStatus ===
        'DEFAULTED',
  });
}
