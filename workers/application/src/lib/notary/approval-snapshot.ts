import {
  computeAuctionKey,
  computeAuctionParamsHash,
} from "@paralel/contracts";
import {
  DomainError,
} from "@paralel/domain";
import {
  getAddress,
  type Address,
  type Hex,
} from "viem";

import type { Env } from "../../env";
import {
  readAuctionManifestSnapshot,
  type AuctionManifestSnapshot,
} from "../auction/manifest-snapshot";
import {
  createDatabaseClient,
} from "../database/client";
import {
  deriveConfirmationCode,
  DERIVATION_TAG,
} from "./confirm-code";

interface SnapshotRow {
  auction_id: string;
  auction_code: string;
  status: string;
  current_round: number;
  consignor_wallet: string;
  created_at: string | Date;
  starting_bid: string;
  bid_increment: string;
  open_at: string | Date;
  duration_hours: number;
  guarantor_wallet:
    string | null;
  guarantor_approved_at:
    string | Date | null;
  has_notary_approval: boolean;
}

export interface NotaryApprovalSnapshot {
  auctionId: string;
  auctionCode: string;
  status: string;
  currentRound: number;
  consignorWallet: Address;
  createdAt: Date;
  startingBid: bigint;
  bidIncrement: bigint;
  openAt: Date;
  durationHours: number;
  guarantorWallet: Address;
  guarantorApprovedAt: Date;
  notaryApproved: boolean;
  manifest: AuctionManifestSnapshot;
}

export interface DerivedNotarySigningMaterial {
  auctionKey: Hex;
  paramsHash: Hex;
  codeHash: Hex;
  nonce: bigint;
  expiry: bigint;
  derivation:
    typeof DERIVATION_TAG;
}

export const readNotaryApprovalSnapshot =
  async (
    env: Env,
    input: Readonly<{
      auctionId: string;
    }>,
  ): Promise<NotaryApprovalSnapshot> => {
    const sql =
      await createDatabaseClient(env);

    const rows = await sql`
      SELECT
        a.id AS auction_id,
        a.auction_code,
        a.status,
        a.current_round,
        consignor.wallet
          AS consignor_wallet,
        a.created_at,
        round.starting_bid::text,
        round.bid_increment::text,
        round.open_at,
        round.duration_hours,
        guarantor_user.wallet
          AS guarantor_wallet,
        (
          SELECT att.created_at
          FROM attestations AS att
          WHERE att.auction_id = a.id
            AND att.type =
              'GUARANTOR_APPROVED'
          LIMIT 1
        ) AS guarantor_approved_at,
        EXISTS (
          SELECT 1
          FROM attestations AS att
          WHERE att.auction_id = a.id
            AND att.type =
              'NOTARY_APPROVED'
        ) AS has_notary_approval
      FROM auctions AS a
      INNER JOIN users AS consignor
        ON consignor.id =
          a.consignor_id
      INNER JOIN auction_rounds AS round
        ON round.auction_id = a.id
       AND round.round_no =
          a.current_round
      INNER JOIN partners AS guarantor
        ON guarantor.id =
          a.guarantor_id
       AND guarantor.type =
          'GUARANTOR'
      INNER JOIN users AS guarantor_user
        ON guarantor_user.id =
          guarantor.user_id
      WHERE a.id =
        ${input.auctionId}
      LIMIT 1
    `;

    const row =
      rows[0] as
        | SnapshotRow
        | undefined;

    if (!row) {
      throw new DomainError(
        "AUCTION_NOT_FOUND",
        "Auction was not found.",
        {
          details: {
            auctionId:
              input.auctionId,
          },
        },
      );
    }

    if (row.status !== "PENDING") {
      throw new DomainError(
        "AUCTION_STATE_CHANGED",
        "Notary approval requires a PENDING auction.",
        {
          details: {
            auctionId:
              row.auction_id,
            status:
              row.status,
          },
        },
      );
    }

    if (
      row.guarantor_wallet ===
        null ||
      row.guarantor_approved_at ===
        null
    ) {
      throw new DomainError(
        "AUCTION_STATE_CHANGED",
        "Guarantor approval is required before Notary approval.",
        {
          details: {
            auctionId:
              row.auction_id,
          },
        },
      );
    }

    if (row.has_notary_approval) {
      throw new DomainError(
        "ALREADY_PROCESSED",
        "Notary approval has already been recorded.",
        {
          details: {
            auctionId:
              row.auction_id,
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

    if (!manifest.frozen) {
      throw new DomainError(
        "AUCTION_STATE_CHANGED",
        "Auction manifest is incomplete or no longer canonical.",
        {
          details: {
            auctionId:
              row.auction_id,
            assetCount:
              manifest.assetCount,
            fileCount:
              manifest.fileCount,
            photoCount:
              manifest.photoCount,
            documentCount:
              manifest.documentCount,
            roundNumbers:
              manifest.roundNumbers,
          },
        },
      );
    }

    return Object.freeze({
      auctionId:
        row.auction_id,
      auctionCode:
        row.auction_code,
      status:
        row.status,
      currentRound:
        row.current_round,
      consignorWallet:
        getAddress(
          row.consignor_wallet,
        ),
      createdAt:
        new Date(row.created_at),
      startingBid:
        BigInt(row.starting_bid),
      bidIncrement:
        BigInt(row.bid_increment),
      openAt:
        new Date(row.open_at),
      durationHours:
        row.duration_hours,
      guarantorWallet:
        getAddress(
          row.guarantor_wallet,
        ),
      guarantorApprovedAt:
        new Date(
          row.guarantor_approved_at,
        ),
      notaryApproved:
        row.has_notary_approval,
      manifest,
    });
  };

export const deriveNotarySigningMaterial =
  (
    input: Readonly<{
      snapshot:
        NotaryApprovalSnapshot;
      notaryWallet: Address;
      nonce: bigint;
      expiry: bigint;
    }>,
  ): DerivedNotarySigningMaterial => {
    if (
      input.nonce < 0n ||
      input.expiry < 0n
    ) {
      throw new DomainError(
        "INVALID_INPUT",
        "Notary signing nonce and expiry must be non-negative.",
      );
    }

    const auctionKey =
      computeAuctionKey(
        input.snapshot
          .auctionCode,
      );

    const paramsHash =
      computeAuctionParamsHash({
        startingBid:
          input.snapshot
            .startingBid,
        bidIncrement:
          input.snapshot
            .bidIncrement,
        openAt:
          BigInt(
            Math.floor(
              input.snapshot
                .openAt
                .getTime() /
              1_000,
            ),
          ),
        durationHours:
          input.snapshot
            .durationHours,
      });

    const {
      codeHash,
    } =
      deriveConfirmationCode({
        auctionCode:
          input.snapshot
            .auctionCode,
        auctionCreatedAt:
          input.snapshot
            .createdAt,
        auctionId:
          input.snapshot
            .auctionId,
        guarantorWallet:
          input.snapshot
            .guarantorWallet,
        guarantorApprovedAt:
          input.snapshot
            .guarantorApprovedAt,
        notaryWallet:
          input.notaryWallet,
        nonce:
          input.nonce,
        expiry:
          input.expiry,
      });

    return Object.freeze({
      auctionKey,
      paramsHash,
      codeHash,
      nonce:
        input.nonce,
      expiry:
        input.expiry,
      derivation:
        DERIVATION_TAG,
    });
  };
