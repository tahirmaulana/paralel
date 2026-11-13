import type {
  Address,
} from "viem";

import type { Env } from "../../env";
import {
  createDatabaseClient,
} from "../database/client";

interface KycRow {
  user_id: string;
  status: string | null;
  admin_comment: string | null;
  verified_at: string | Date | null;
}

interface LiveAuctionRow {
  auction_id: string;
  auction_code: string;
  title: string;
  status: string;
  current_round: number;
  starting_bid: string;
  open_at: string | Date;
  close_at: string | Date;
  current_bid: string;
  my_bid: string | null;
  leader_wallet: string | null;
  leader_name: string | null;
}

interface JoinedAuctionRow {
  auction_id: string;
  auction_code: string;
  title: string;
  status: string;
  current_round: number;
  my_bid: string | null;
}

interface CreatedAuctionRow {
  auction_id: string;
  auction_code: string;
  title: string;
  status: string;
  starting_bid: string;
}

export interface UserData {
  kycStatus:
    | "NONE"
    | "UNVERIFIED"
    | "VERIFIED";
  adminComment: string | null;
  verifiedAt: string | null;
  liveAuctions: readonly {
    auctionId: string;
    auctionCode: string;
    title: string;
    status: string;
    currentRound: number;
    startingBid: string;
    openAt: string;
    closeAt: string;
    currentBid: string;
    myBid: string | null;
    leaderWallet: string | null;
    leaderName: string;
  }[];
  joinedAuctions: readonly {
    auctionId: string;
    auctionCode: string;
    title: string;
    status: string;
    currentRound: number;
    myBid: string | null;
  }[];
  createdAuctions: readonly {
    auctionId: string;
    auctionCode: string;
    title: string;
    status: string;
    startingBid: string;
  }[];
}

const toIsoString = (
  value: string | Date,
): string =>
  new Date(value).toISOString();

const shortWallet = (
  wallet: string,
): string =>
  `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;

export const readUserData = async (
  env: Env,
  wallet: Address,
): Promise<UserData> => {
  const sql =
    await createDatabaseClient(env);

  const normalizedWallet =
    wallet.toLowerCase();

  const [
    kycRows,
    liveRows,
    joinedRows,
    createdRows,
  ] = await Promise.all([
    sql`
      SELECT
        u.id AS user_id,
        k.status,
        k.admin_comment,
        k.verified_at
      FROM users AS u
      LEFT JOIN kyc_profiles AS k
        ON k.user_id = u.id
      WHERE LOWER(u.wallet) =
        ${normalizedWallet}
      LIMIT 1
    `,

    sql`
      SELECT
        a.id AS auction_id,
        a.auction_code,
        aa.title,
        a.status,
        a.current_round,
        ar.starting_bid::text,
        ar.open_at,
        ar.close_at,
        COALESCE((
          SELECT MAX(bs.my_bid)
          FROM bidder_stakes AS bs
          WHERE bs.auction_id = a.id
            AND bs.round_no =
              a.current_round
        ), 0)::text AS current_bid,
        (
          SELECT bs.my_bid::text
          FROM bidder_stakes AS bs
          WHERE bs.auction_id = a.id
            AND bs.round_no =
              a.current_round
            AND bs.bidder_wallet =
              ${normalizedWallet}
          LIMIT 1
        ) AS my_bid,
        leader.bidder_wallet
          AS leader_wallet,
        kp.full_name
          AS leader_name
      FROM auctions AS a
      INNER JOIN auction_assets AS aa
        ON aa.auction_id = a.id
      INNER JOIN auction_rounds AS ar
        ON ar.auction_id = a.id
       AND ar.round_no =
         a.current_round
      LEFT JOIN LATERAL (
        SELECT bs.bidder_wallet
        FROM bidder_stakes AS bs
        WHERE bs.auction_id = a.id
          AND bs.round_no =
            a.current_round
          AND bs.rank = 1
        LIMIT 1
      ) AS leader
        ON TRUE
      LEFT JOIN users AS u
        ON LOWER(u.wallet) =
          leader.bidder_wallet
      LEFT JOIN kyc_profiles AS kp
        ON kp.user_id = u.id
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
        a.current_round,
        (
          SELECT MAX(bs.my_bid)::text
          FROM bidder_stakes AS bs
          WHERE bs.auction_id = a.id
            AND bs.round_no =
              a.current_round
            AND bs.bidder_wallet =
              ${normalizedWallet}
        ) AS my_bid
      FROM auctions AS a
      INNER JOIN auction_assets AS aa
        ON aa.auction_id = a.id
      WHERE EXISTS (
        SELECT 1
        FROM bidder_stakes AS bs
        WHERE bs.auction_id = a.id
          AND bs.bidder_wallet =
            ${normalizedWallet}
      )
    `,

    sql`
      SELECT
        a.id AS auction_id,
        a.auction_code,
        aa.title,
        a.status,
        ar.starting_bid::text
      FROM auctions AS a
      INNER JOIN auction_assets AS aa
        ON aa.auction_id = a.id
      INNER JOIN auction_rounds AS ar
        ON ar.auction_id = a.id
       AND ar.round_no =
         a.current_round
      WHERE a.consignor_id = (
        SELECT u.id
        FROM users AS u
        WHERE LOWER(u.wallet) =
          ${normalizedWallet}
        LIMIT 1
      )
    `,
  ]);

  const kyc =
    kycRows[0] as KycRow | undefined;

  const kycStatus =
    kyc?.status === "UNVERIFIED" ||
    kyc?.status === "VERIFIED"
      ? kyc.status
      : "NONE";

  return {
    kycStatus,
    adminComment:
      kyc?.admin_comment ?? null,
    verifiedAt:
      kyc?.verified_at
        ? toIsoString(
            kyc.verified_at,
          )
        : null,

    liveAuctions:
      (liveRows as LiveAuctionRow[])
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
          startingBid:
            row.starting_bid,
          openAt:
            toIsoString(row.open_at),
          closeAt:
            toIsoString(row.close_at),
          currentBid:
            row.current_bid,
          myBid:
            row.my_bid,
          leaderWallet:
            row.leader_wallet,
          leaderName:
            row.leader_name ??
            (
              row.leader_wallet
                ? shortWallet(
                    row.leader_wallet,
                  )
                : "—"
            ),
        })),

    joinedAuctions:
      (joinedRows as JoinedAuctionRow[])
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
          myBid:
            row.my_bid,
        })),

    createdAuctions:
      (createdRows as CreatedAuctionRow[])
        .map((row) => ({
          auctionId:
            row.auction_id,
          auctionCode:
            row.auction_code,
          title:
            row.title,
          status:
            row.status,
          startingBid:
            row.starting_bid,
        })),
  };
};

export type UserKycStatus =
  | "NONE"
  | "UNVERIFIED"
  | "VERIFIED";

export const readUserKycStatus = async (
  env: Env,
  wallet: Address,
): Promise<UserKycStatus> => {
  const sql =
    await createDatabaseClient(env);

  const rows = await sql`
    SELECT
      k.status
    FROM users AS u
    LEFT JOIN kyc_profiles AS k
      ON k.user_id = u.id
    WHERE LOWER(u.wallet) =
      ${wallet.toLowerCase()}
    LIMIT 1
  `;

  const row =
    rows[0] as
      | {
          status:
            string | null;
        }
      | undefined;

  if (
    row?.status === "UNVERIFIED" ||
    row?.status === "VERIFIED"
  ) {
    return row.status;
  }

  return "NONE";
};
