import {
  getAddress,
  type Address,
} from "viem";

import type { Env } from "../../env";
import {
  createDatabaseClient,
} from "../database/client";

interface NotaryProfileRow {
  partner_id: string;
  name: string;
  email: string | null;
  wallet: string;
}

interface PendingRow {
  auction_id: string;
  auction_code: string;
  title: string | null;
  starting_bid: string;
  bid_increment: string;
  open_at: string | Date;
  duration_hours: number;
  consignor_wallet: string;
  guarantor_name: string;
  guarantor_approved_at:
    string | Date | null;
  pending_at:
    string | Date | null;
}

interface CollectionRow {
  auction_id: string;
  auction_code: string;
  title: string | null;
  status: string;
  current_round: number;
  winner_wallet:
    string | null;
  updated_at: string | Date;
}

interface RunRow {
  auction_id: string;
  auction_code: string;
  title: string | null;
  status: string;
  current_round: number;
  starting_bid: string;
  current_bid: string;
  open_at: string | Date;
  close_at: string | Date;
  bid_count: number;
}

interface PassedRow {
  auction_id: string;
  auction_code: string;
  title: string | null;
  status: string;
  updated_at: string | Date;
}

export interface NotaryProfile {
  partnerId: string;
  name: string;
  email: string | null;
  wallet: Address;
}

const iso = (
  value: string | Date,
): string =>
  new Date(value).toISOString();

const optionalIso = (
  value:
    string | Date | null,
): string | null =>
  value === null
    ? null
    : iso(value);

export const readNotaryProfile =
  async (
    env: Env,
    wallet: Address,
  ): Promise<NotaryProfile | null> => {
    const sql =
      await createDatabaseClient(env);

    const rows = await sql`
      SELECT
        p.id AS partner_id,
        p.name,
        u.email,
        u.wallet
      FROM partners AS p
      INNER JOIN users AS u
        ON u.id = p.user_id
      WHERE p.type = 'NOTARY'
        AND p.active = TRUE
        AND LOWER(u.wallet) =
          ${wallet.toLowerCase()}
      LIMIT 1
    `;

    const row =
      rows[0] as
        | NotaryProfileRow
        | undefined;

    if (!row) {
      return null;
    }

    return Object.freeze({
      partnerId:
        row.partner_id,
      name:
        row.name,
      email:
        row.email,
      wallet:
        getAddress(row.wallet),
    });
  };

export const readNotaryData =
  async (
    env: Env,
    wallet: Address,
  ) => {
    const sql =
      await createDatabaseClient(env);

    const normalizedWallet =
      wallet.toLowerCase();

    const [
      pendingRows,
      collectionRows,
      runRows,
      passedRows,
    ] = await Promise.all([
      sql`
        SELECT
          a.id AS auction_id,
          a.auction_code,
          aa.title,
          ar.starting_bid::text,
          ar.bid_increment::text,
          ar.open_at,
          ar.duration_hours,
          LOWER(consignor.wallet)
            AS consignor_wallet,
          guarantor.name
            AS guarantor_name,
          (
            SELECT att.created_at
            FROM attestations AS att
            WHERE att.auction_id = a.id
              AND att.type =
                'GUARANTOR_APPROVED'
            LIMIT 1
          ) AS guarantor_approved_at,
          a.pending_at
        FROM auctions AS a
        LEFT JOIN auction_assets AS aa
          ON aa.auction_id = a.id
        INNER JOIN auction_rounds AS ar
          ON ar.auction_id = a.id
         AND ar.round_no =
           a.current_round
        INNER JOIN users AS consignor
          ON consignor.id =
            a.consignor_id
        INNER JOIN partners AS guarantor
          ON guarantor.id =
            a.guarantor_id
        WHERE a.status = 'PENDING'
          AND NOT EXISTS (
            SELECT 1
            FROM attestations AS att
            WHERE att.auction_id = a.id
              AND att.type =
                'NOTARY_APPROVED'
          )
        ORDER BY
          guarantor_approved_at
            ASC NULLS LAST,
          a.pending_at
            ASC NULLS LAST
      `,

      sql`
        SELECT
          a.id AS auction_id,
          a.auction_code,
          aa.title,
          a.status,
          a.current_round,
          (
            SELECT bs.bidder_wallet
            FROM bidder_stakes AS bs
            WHERE bs.auction_id = a.id
              AND bs.round_no =
                a.current_round
              AND bs.status = 'WINNER'
            LIMIT 1
          ) AS winner_wallet,
          a.updated_at
        FROM auctions AS a
        LEFT JOIN auction_assets AS aa
          ON aa.auction_id = a.id
        WHERE a.status IN (
          'AWARDING',
          'COLLECTION',
          'CLAIM_PERIOD',
          'SETTLED'
        )
          AND EXISTS (
            SELECT 1
            FROM attestations AS att
            WHERE att.auction_id = a.id
              AND att.type =
                'NOTARY_APPROVED'
              AND LOWER(
                att.signer_wallet
              ) =
                ${normalizedWallet}
          )
        ORDER BY a.updated_at DESC
      `,

      sql`
        SELECT
          a.id AS auction_id,
          a.auction_code,
          aa.title,
          a.status,
          a.current_round,
          ar.starting_bid::text,
          COALESCE((
            SELECT MAX(bs.my_bid)
            FROM bidder_stakes AS bs
            WHERE bs.auction_id = a.id
              AND bs.round_no =
                a.current_round
          ), 0)::text AS current_bid,
          ar.open_at,
          ar.close_at,
          (
            SELECT COUNT(*)::integer
            FROM bids AS b
            WHERE b.auction_id = a.id
              AND b.round_no =
                a.current_round
          ) AS bid_count
        FROM auctions AS a
        LEFT JOIN auction_assets AS aa
          ON aa.auction_id = a.id
        INNER JOIN auction_rounds AS ar
          ON ar.auction_id = a.id
         AND ar.round_no =
           a.current_round
        WHERE a.status IN (
          'SCHEDULED',
          'OPEN'
        )
      `,

      sql`
        SELECT
          a.id AS auction_id,
          a.auction_code,
          aa.title,
          a.status,
          a.updated_at
        FROM auctions AS a
        LEFT JOIN auction_assets AS aa
          ON aa.auction_id = a.id
        WHERE a.status IN (
          'PASSED_IN',
          'WITHDRAWN'
        )
          AND EXISTS (
            SELECT 1
            FROM attestations AS att
            WHERE att.auction_id = a.id
              AND att.type =
                'NOTARY_APPROVED'
              AND LOWER(
                att.signer_wallet
              ) =
                ${normalizedWallet}
          )
        ORDER BY a.updated_at DESC
      `,
    ]);

    const run =
      (runRows as RunRow[])
        .map((row) => ({
          row,
          live:
            row.status === "OPEN" ||
            new Date(
              row.open_at,
            ).getTime() <=
              Date.now(),
        }))
        .sort((left, right) => {
          if (
            left.live !== right.live
          ) {
            return left.live
              ? -1
              : 1;
          }

          return left.live
            ? new Date(
                left.row.close_at,
              ).getTime() -
                new Date(
                  right.row.close_at,
                ).getTime()
            : new Date(
                left.row.open_at,
              ).getTime() -
                new Date(
                  right.row.open_at,
                ).getTime();
        })
        .map(({ row }) => ({
          auctionId:
            row.auction_id,
          auctionCode:
            row.auction_code,
          title:
            row.title,
          status:
            row.status,
          currentRound:
            row.current_round,
          startingBid:
            row.starting_bid,
          currentBid:
            row.current_bid,
          openAt:
            iso(row.open_at),
          closeAt:
            iso(row.close_at),
          bidCount:
            row.bid_count,
        }));

    return Object.freeze({
      pendingApprovals:
        (pendingRows as PendingRow[])
          .map((row) => ({
            auctionId:
              row.auction_id,
            auctionCode:
              row.auction_code,
            title:
              row.title,
            startingBid:
              row.starting_bid,
            bidIncrement:
              row.bid_increment,
            openAt:
              iso(row.open_at),
            durationHours:
              row.duration_hours,
            consignorWallet:
              row.consignor_wallet,
            guarantorName:
              row.guarantor_name,
            guarantorApprovedAt:
              optionalIso(
                row
                  .guarantor_approved_at,
              ),
            pendingAt:
              optionalIso(
                row.pending_at,
              ),
          })),

      collections:
        (collectionRows as CollectionRow[])
          .map((row) => ({
            auctionId:
              row.auction_id,
            auctionCode:
              row.auction_code,
            title:
              row.title,
            status:
              row.status,
            currentRound:
              row.current_round,
            winnerWallet:
              row.winner_wallet,
            updatedAt:
              iso(row.updated_at),
          })),

      run,

      passed:
        (passedRows as PassedRow[])
          .map((row) => ({
            auctionId:
              row.auction_id,
            auctionCode:
              row.auction_code,
            title:
              row.title,
            status:
              row.status,
            updatedAt:
              iso(row.updated_at),
          })),
    });
  };
