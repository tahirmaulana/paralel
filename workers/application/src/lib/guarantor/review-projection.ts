import {
  DomainError,
} from "@paralel/domain";
import type {
  Address,
  Hex,
} from "viem";

import type { Env } from "../../env";
import {
  readAuctionManifestSnapshot,
  type AuctionManifestSnapshot,
} from "../auction/manifest-snapshot";
import {
  createDatabaseClient,
} from "../database/client";

interface ProjectionRow {
  auction_id: string;
  auction_code: string;
  status: string;
  current_round: number;
  guarantor_id: string;
  guarantor_wallet: string;
  spec_hash: string;
  has_guarantor_approval: boolean;
  has_guarantor_rejection: boolean;
  has_notary_approval: boolean;
}

export interface GuarantorReviewProjection {
  auctionId: string;
  auctionCode: string;
  status: string;
  currentRound: number;
  guarantorId: string;
  guarantorWallet: Address;
  specHash: Hex;
  hasGuarantorApproval: boolean;
  hasGuarantorRejection: boolean;
  hasNotaryApproval: boolean;
  manifest: AuctionManifestSnapshot;
}

export const readGuarantorReviewProjection =
  async (
    env: Env,
    auctionId: string,
  ): Promise<GuarantorReviewProjection> => {
    const sql =
      await createDatabaseClient(env);

    const rows = await sql`
      SELECT
        a.id AS auction_id,
        a.auction_code,
        a.status,
        a.current_round,
        a.guarantor_id,
        LOWER(u.wallet)
          AS guarantor_wallet,
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
              'GUARANTOR_REJECTED'
        ) AS has_guarantor_rejection,
        EXISTS (
          SELECT 1
          FROM attestations AS att
          WHERE att.auction_id = a.id
            AND att.type =
              'NOTARY_APPROVED'
        ) AS has_notary_approval
      FROM auctions AS a
      INNER JOIN partners AS p
        ON p.id = a.guarantor_id
      INNER JOIN users AS u
        ON u.id = p.user_id
      INNER JOIN auction_assets AS aa
        ON aa.auction_id = a.id
      WHERE a.id =
        ${auctionId}
      LIMIT 1
    `;

    const row =
      rows[0] as
        | ProjectionRow
        | undefined;

    if (!row) {
      throw new DomainError(
        "AUCTION_NOT_FOUND",
        "Auction was not found.",
        {
          details: {
            auctionId,
          },
        },
      );
    }

    const manifest =
      await readAuctionManifestSnapshot(
        env,
        {
          auctionId:
            row.auction_id,
          currentRound:
            row.current_round,
        },
      );

    return Object.freeze({
      auctionId:
        row.auction_id,

      auctionCode:
        row.auction_code,

      status:
        row.status,

      currentRound:
        row.current_round,

      guarantorId:
        row.guarantor_id,

      guarantorWallet:
        row.guarantor_wallet as Address,

      specHash:
        row.spec_hash as Hex,

      hasGuarantorApproval:
        row
          .has_guarantor_approval,

      hasGuarantorRejection:
        row
          .has_guarantor_rejection,

      hasNotaryApproval:
        row
          .has_notary_approval,

      manifest,
    });
  };
