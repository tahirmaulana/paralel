// @file apps/web/src/lib/relay/withdraw-consignor-snapshot.ts
import type { TransactionSql } from 'postgres';
import {
  createDomainError,
  isDatabaseAuctionStatus,
  type DatabaseAuctionStatus,
} from '@paralel/domain';
import type { Address, Hex } from 'viem';
import { resolveAuctionIdentityFromKey } from './auction-key-resolution';

type CandidateRow = Readonly<{
  auctionId: string;
  auctionCode: string;
  currentRound: number;
}>;

type LockedRow = Readonly<{
  auctionId: string;
  auctionCode: string;
  status: string;
  currentRound: number;
  consignorWallet: string;
}>;

export type WithdrawConsignorDatabaseSnapshot = Readonly<{
  auctionId: string;
  auctionCode: string;
  auctionKey: Hex;
  status: DatabaseAuctionStatus;
  currentRound: number;
  consignorWallet: Address;
}>;

export async function readWithdrawConsignorDatabaseSnapshot(
  transaction: TransactionSql,
  input: Readonly<{
    auctionKey: Hex;
    roundNo: number;
    consignorWallet: Address;
  }>,
): Promise<WithdrawConsignorDatabaseSnapshot> {
  const candidates = await transaction<CandidateRow[]>`
    SELECT
      id AS "auctionId",
      auction_code AS "auctionCode",
      current_round AS "currentRound"
    FROM auctions
    WHERE current_round = ${input.roundNo}
  `;

  const identity = resolveAuctionIdentityFromKey(candidates, {
    auctionKey: input.auctionKey,
    roundNo: input.roundNo,
  });

  const rows = await transaction<LockedRow[]>`
    SELECT
      a.id AS "auctionId",
      a.auction_code AS "auctionCode",
      a.status,
      a.current_round AS "currentRound",
      consignor.wallet AS "consignorWallet"
    FROM auctions a
    JOIN users consignor
      ON consignor.id = a.consignor_id
    WHERE a.id = ${identity.auctionId}
    FOR UPDATE OF a
  `;

  const row = rows[0];
  if (rows.length !== 1 || !row) {
    throw createDomainError(
      'AUCTION_STATE_CHANGED',
      'Consignor settlement database projection is unavailable or changed.',
      { retryable: true },
    );
  }

  const projectedWallet = row.consignorWallet.toLowerCase();
  if (
    !isDatabaseAuctionStatus(row.status) ||
    row.status !== 'CLAIM_PERIOD' ||
    row.currentRound !== input.roundNo ||
    projectedWallet !== input.consignorWallet.toLowerCase()
  ) {
    throw createDomainError(
      'AUCTION_STATE_CHANGED',
      'Consignor settlement database projection is no longer eligible.',
      { retryable: true },
    );
  }

  return Object.freeze({
    auctionId: row.auctionId,
    auctionCode: row.auctionCode,
    auctionKey: identity.auctionKey,
    status: row.status,
    currentRound: row.currentRound,
    consignorWallet: projectedWallet as Address,
  });
}
