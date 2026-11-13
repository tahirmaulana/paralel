import {
  keccak256,
  toBytes,
  type Address,
} from "viem";

import type { Env } from "../../env";
import {
  createDatabaseClient,
} from "../database/client";

interface GuarantorProfileRow {
  partner_id: string;
  user_id: string;
  name: string;
  email: string | null;
  wallet: string;
}

interface SubmissionRow {
  auction_id: string;
  auction_code: string;
  title: string | null;
  consignor_wallet: string;
  starting_bid: string;
  pending_at: string | Date | null;
  spec_hash: string;
  has_guarantor_approval: boolean;
  has_notary_approval: boolean;
}

interface CollectionRow {
  auction_id: string;
  auction_code: string;
  title: string | null;
  current_round: number;
  winner_wallet: string | null;
  winner_stake: string | null;
  updated_at: string | Date;
}

interface WithdrawalRow {
  auction_id: string;
  auction_code: string;
  title: string | null;
  current_round: number;
  consignor_wallet: string;
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
  updated_at: string | Date;
}

interface HistoryRow {
  auction_id: string;
  auction_code: string;
  title: string | null;
  status: string;
  updated_at: string | Date;
}

export interface GuarantorProfile {
  partnerId: string;
  userId: string;
  name: string;
  email: string | null;
  wallet: Address;
}

export interface GuarantorDashboardData {
  submission: readonly {
    auctionId: string;
    auctionCode: string;
    auctionKey: `0x${string}`;
    title: string | null;
    consignorWallet: string;
    startingBid: string;
    pendingAt: string | null;
    specHash: `0x${string}`;
    hasGuarantorApproval: boolean;
    hasNotaryApproval: boolean;
  }[];

  collection: readonly {
    auctionId: string;
    auctionCode: string;
    auctionKey: `0x${string}`;
    title: string | null;
    currentRound: number;
    winnerWallet: string | null;
    winnerStake: string | null;
    collectionDeadline: null;
    updatedAt: string;
  }[];

  withdrawal: readonly {
    auctionId: string;
    auctionCode: string;
    auctionKey: `0x${string}`;
    title: string | null;
    currentRound: number;
    consignorWallet: string;
    updatedAt: string;
  }[];

  run: readonly {
    auctionId: string;
    auctionCode: string;
    title: string | null;
    status: string;
    currentRound: number;
    startingBid: string;
    currentBid: string;
    openAt: string;
    closeAt: string;
    bidCount: number;
    updatedAt: string;
  }[];

  history: readonly {
    auctionId: string;
    auctionCode: string;
    title: string | null;
    status: string;
    updatedAt: string;
  }[];
}

const auctionKey = (
  code: string,
): `0x${string}` =>
  keccak256(toBytes(code));

const iso = (
  value: string | Date,
): string =>
  new Date(value).toISOString();

export const readGuarantorProfile =
  async (
    env: Env,
    wallet: Address,
  ): Promise<GuarantorProfile | null> => {
    const sql =
      await createDatabaseClient(env);

    const rows = await sql`
      SELECT
        p.id AS partner_id,
        u.id AS user_id,
        p.name,
        u.email,
        u.wallet
      FROM partners AS p
      INNER JOIN users AS u
        ON u.id = p.user_id
      WHERE p.type = 'GUARANTOR'
        AND p.active = TRUE
        AND LOWER(u.wallet) =
          ${wallet.toLowerCase()}
      LIMIT 1
    `;

    const row =
      rows[0] as
        | GuarantorProfileRow
        | undefined;

    if (!row) {
      return null;
    }

    return {
      partnerId:
        row.partner_id,
      userId:
        row.user_id,
      name:
        row.name,
      email:
        row.email,
      wallet:
        row.wallet as Address,
    };
  };

export const readGuarantorData =
  async (
    env: Env,
    partnerId: string,
  ): Promise<GuarantorDashboardData> => {
    const sql =
      await createDatabaseClient(env);

    const [
      submissionRows,
      collectionRows,
      withdrawalRows,
      runRows,
      historyRows,
    ] = await Promise.all([
      sql`
        SELECT
          a.id AS auction_id,
          a.auction_code,
          aa.title,
          LOWER(u.wallet)
            AS consignor_wallet,
          ar.starting_bid::text,
          a.pending_at,
          '0x' || ENCODE(
            aa.spec_hash,
            'hex'
          ) AS spec_hash,
          EXISTS (
            SELECT 1
            FROM attestations AS att
            WHERE att.auction_id = a.id
              AND att.type =
                'GUARANTOR_APPROVED'
          ) AS has_guarantor_approval,
          EXISTS (
            SELECT 1
            FROM attestations AS att
            WHERE att.auction_id = a.id
              AND att.type =
                'NOTARY_APPROVED'
          ) AS has_notary_approval
        FROM auctions AS a
        LEFT JOIN auction_assets AS aa
          ON aa.auction_id = a.id
        INNER JOIN auction_rounds AS ar
          ON ar.auction_id = a.id
         AND ar.round_no =
           a.current_round
        INNER JOIN users AS u
          ON u.id = a.consignor_id
        WHERE a.guarantor_id =
          ${partnerId}
          AND a.status = 'PENDING'
          AND aa.spec_hash IS NOT NULL
        ORDER BY
          a.pending_at ASC NULLS LAST
      `,

      sql`
        SELECT
          a.id AS auction_id,
          a.auction_code,
          aa.title,
          a.current_round,
          LOWER(winner.bidder_wallet)
            AS winner_wallet,
          winner.my_bid::text
            AS winner_stake,
          a.updated_at
        FROM auctions AS a
        INNER JOIN auction_assets AS aa
          ON aa.auction_id = a.id
        LEFT JOIN LATERAL (
          SELECT
            bs.bidder_wallet,
            bs.my_bid
          FROM bidder_stakes AS bs
          WHERE bs.auction_id = a.id
            AND bs.round_no =
              a.current_round
            AND bs.status = 'WINNER'
          LIMIT 1
        ) AS winner
          ON TRUE
        WHERE a.guarantor_id =
          ${partnerId}
          AND a.status = 'COLLECTION'
        ORDER BY a.updated_at ASC
      `,

      sql`
        SELECT
          a.id AS auction_id,
          a.auction_code,
          aa.title,
          a.current_round,
          LOWER(u.wallet)
            AS consignor_wallet,
          a.updated_at
        FROM auctions AS a
        LEFT JOIN auction_assets AS aa
          ON aa.auction_id = a.id
        INNER JOIN users AS u
          ON u.id = a.consignor_id
        WHERE a.guarantor_id =
          ${partnerId}
          AND a.status = 'PASSED_IN'
        ORDER BY a.updated_at ASC
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
          ) AS bid_count,
          a.updated_at
        FROM auctions AS a
        LEFT JOIN auction_assets AS aa
          ON aa.auction_id = a.id
        INNER JOIN auction_rounds AS ar
          ON ar.auction_id = a.id
         AND ar.round_no =
           a.current_round
        WHERE a.status IN (
          'SCHEDULED',
          'OPEN',
          'AWARDING'
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
        WHERE a.guarantor_id =
          ${partnerId}
          AND a.status IN (
            'SETTLED',
            'PASSED_IN',
            'WITHDRAWN',
            'CANCELED',
            'REJECTED'
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
            (
              row.status ===
                "SCHEDULED" &&
              new Date(
                row.open_at,
              ).getTime() <=
                Date.now()
            ),
        }))
        .sort((left, right) => {
          if (
            left.live !==
            right.live
          ) {
            return left.live
              ? -1
              : 1;
          }

          if (left.live) {
            return (
              new Date(
                left.row.close_at,
              ).getTime() -
              new Date(
                right.row.close_at,
              ).getTime()
            );
          }

          if (
            left.row.status ===
              "SCHEDULED" &&
            right.row.status ===
              "SCHEDULED"
          ) {
            return (
              new Date(
                left.row.open_at,
              ).getTime() -
              new Date(
                right.row.open_at,
              ).getTime()
            );
          }

          if (
            left.row.status ===
              "AWARDING" &&
            right.row.status ===
              "AWARDING"
          ) {
            return (
              new Date(
                right.row.updated_at,
              ).getTime() -
              new Date(
                left.row.updated_at,
              ).getTime()
            );
          }

          return 0;
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
          updatedAt:
            iso(row.updated_at),
        }));

    return {
      submission:
        (submissionRows as SubmissionRow[])
          .map((row) => ({
            auctionId:
              row.auction_id,
            auctionCode:
              row.auction_code,
            auctionKey:
              auctionKey(
                row.auction_code,
              ),
            title:
              row.title,
            consignorWallet:
              row.consignor_wallet,
            startingBid:
              row.starting_bid,
            pendingAt:
              row.pending_at
                ? iso(row.pending_at)
                : null,
            specHash:
              row.spec_hash as
                `0x${string}`,
            hasGuarantorApproval:
              row
                .has_guarantor_approval,
            hasNotaryApproval:
              row
                .has_notary_approval,
          })),

      collection:
        (collectionRows as CollectionRow[])
          .map((row) => ({
            auctionId:
              row.auction_id,
            auctionCode:
              row.auction_code,
            auctionKey:
              auctionKey(
                row.auction_code,
              ),
            title:
              row.title,
            currentRound:
              row.current_round,
            winnerWallet:
              row.winner_wallet,
            winnerStake:
              row.winner_stake,
            collectionDeadline:
              null,
            updatedAt:
              iso(row.updated_at),
          })),

      withdrawal:
        (withdrawalRows as WithdrawalRow[])
          .map((row) => ({
            auctionId:
              row.auction_id,
            auctionCode:
              row.auction_code,
            auctionKey:
              auctionKey(
                row.auction_code,
              ),
            title:
              row.title,
            currentRound:
              row.current_round,
            consignorWallet:
              row.consignor_wallet,
            updatedAt:
              iso(row.updated_at),
          })),

      run,

      history:
        (historyRows as HistoryRow[])
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
    };
  };
