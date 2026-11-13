import type { TransactionSql } from 'postgres';
import { createDomainError } from '@paralel/domain';
import type { Address, Hex } from 'viem';
import { resolveAuctionIdentityFromKey } from './auction-key-resolution';

export type ReuseRoundSnapshot = Readonly<{
  auctionId: string;
  auctionCode: string;
  auctionKey: Hex;
  currentRound: number;
  consignorWallet: Address;
}>;
export async function readReuseRoundSnapshot(
  transaction: TransactionSql,
  input: Readonly<{ auctionKey: Hex; expectedRound: number; consignorWallet: Address }>,
): Promise<ReuseRoundSnapshot> {
  const candidates = await transaction<Array<{auctionId:string;auctionCode:string;currentRound:number}>>`
    SELECT id AS "auctionId", auction_code AS "auctionCode", current_round AS "currentRound"
    FROM auctions WHERE current_round = ${input.expectedRound}
  `;
  const identity = resolveAuctionIdentityFromKey(candidates, {
    auctionKey: input.auctionKey,
    roundNo: input.expectedRound,
  });
  const rows = await transaction<Array<{auctionId:string;auctionCode:string;status:string;currentRound:number;consignorWallet:string}>>`
    SELECT a.id AS "auctionId", a.auction_code AS "auctionCode", a.status,
           a.current_round AS "currentRound", u.wallet AS "consignorWallet"
    FROM auctions a JOIN users u ON u.id = a.consignor_id
    WHERE a.id = ${identity.auctionId}
    FOR UPDATE OF a
  `;
  const row = rows[0];
  if (
    rows.length !== 1 || !row || row.status !== 'PASSED_IN' ||
    row.currentRound !== input.expectedRound ||
    row.consignorWallet.toLowerCase() !== input.consignorWallet.toLowerCase()
  ) throw createDomainError('AUCTION_STATE_CHANGED', 'Re-list projection is no longer eligible.', { retryable: true });
  return Object.freeze({
    auctionId: row.auctionId, auctionCode: row.auctionCode,
    auctionKey: identity.auctionKey, currentRound: row.currentRound,
    consignorWallet: row.consignorWallet.toLowerCase() as Address,
  });
}
