// @file apps/web/src/lib/notary/approval-snapshot.ts
//
// Transaction-local Notary approval snapshot reader.
// The caller owns the PostgreSQL transaction.
import type {
  TransactionSql,
} from 'postgres';

import {
  createDomainError,
  isDatabaseAuctionStatus,
  type DatabaseAuctionStatus,
} from '@paralel/domain';

import {
  readAuctionManifestFrozen,
} from '@/lib/auction/manifest-snapshot';

import {
  isAddress,
  type Address,
  type Hex,
} from 'viem';

export type NotaryApprovalSnapshot =
  Readonly<{
    auctionId: string;
    auctionCode: string;
    status:
      DatabaseAuctionStatus;
    currentRound: number;
    consignorWallet:
      Address;
    createdAt: Date;
    startingBid: bigint;
    bidIncrement: bigint;
    openAt: Date;
    durationHours: number;
    manifestFrozen: boolean;
    guarantorApproved: boolean;
    notaryApproved: boolean;
    guarantorWallet: Address;
    guarantorApprovedAt: Date;
  }>;

type SnapshotRow =
  Readonly<{
    auctionId: string;
    auctionCode: string;
    status: string;
    currentRound: number;
    consignorWallet: string;
    createdAt: Date;
    startingBid: bigint;
    bidIncrement: bigint;
    openAt: Date;
    durationHours: number;
    guarantorApproved: boolean;
    notaryApproved: boolean;
    guarantorWallet: string | null;
    guarantorApprovedAt: Date | null;
  }>;

export async function readNotaryApprovalSnapshot(
  transaction:
    TransactionSql,
  auctionId:
    string,
): Promise<
  NotaryApprovalSnapshot
> {
  const rows =
    await transaction<
      SnapshotRow[]
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
        a.created_at
          AS "createdAt",
        r.starting_bid
          AS "startingBid",
        r.bid_increment
          AS "bidIncrement",
        r.open_at
          AS "openAt",
        r.duration_hours
          AS "durationHours",
        EXISTS (
          SELECT 1
          FROM attestations ga
          WHERE
            ga.auction_id =
              a.id
            AND ga.round_no =
              a.current_round
            AND ga.type =
              'GUARANTOR_APPROVED'
        ) AS "guarantorApproved",
        EXISTS (
          SELECT 1
          FROM attestations na
          WHERE
            na.auction_id =
              a.id
            AND na.round_no =
              a.current_round
            AND na.type =
              'NOTARY_APPROVED'
        ) AS "notaryApproved",
        (
          SELECT ga.signer_wallet
          FROM attestations ga
          WHERE
            ga.auction_id =
              a.id
            AND ga.round_no =
              a.current_round
            AND ga.type =
              'GUARANTOR_APPROVED'
          ORDER BY
            ga.created_at ASC,
            ga.id ASC
          LIMIT 1
        ) AS "guarantorWallet",
        (
          SELECT ga.created_at
          FROM attestations ga
          WHERE
            ga.auction_id =
              a.id
            AND ga.round_no =
              a.current_round
            AND ga.type =
              'GUARANTOR_APPROVED'
          ORDER BY
            ga.created_at ASC,
            ga.id ASC
          LIMIT 1
        ) AS "guarantorApprovedAt"
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
          ${auctionId}
      FOR UPDATE OF a, r
    `;

  if (
    rows.length === 0
  ) {
    throw createDomainError(
      'AUCTION_NOT_FOUND',
      'Auction was not found.',
      {
        details: {
          auctionId,
        },
      },
    );
  }

  if (
    rows.length !== 1
  ) {
    throw new Error(
      'Notary approval snapshot is not unique.',
    );
  }

  const row =
    rows[0];

  if (
    !row ||
    row.auctionId !==
      auctionId ||
    !isDatabaseAuctionStatus(
      row.status,
    ) ||
    !Number.isInteger(
      row.currentRound,
    ) ||
    row.currentRound < 1 ||
    !isAddress(
      row.consignorWallet,
    ) ||
    !Number.isInteger(
      row.durationHours,
    ) ||
    row.durationHours < 1 ||
    !Number.isFinite(
      row.createdAt.getTime(),
    ) ||
    !Number.isFinite(
      row.openAt.getTime(),
    )
  ) {
    throw new Error(
      'Notary approval snapshot is invalid.',
    );
  }

  if (
    row.guarantorApproved !==
      true ||
    row.guarantorWallet ===
      null ||
    row.guarantorApprovedAt ===
      null ||
    !isAddress(
      row.guarantorWallet,
    ) ||
    !Number.isFinite(
      row.guarantorApprovedAt
        .getTime(),
    )
  ) {
    throw createDomainError(
      'AUCTION_STATE_CHANGED',
      'Canonical Guarantor approval is unavailable.',
      {
        retryable:
          true,
        details: {
          auctionId,
        },
      },
    );
  }

  const manifestFrozen =
    await readAuctionManifestFrozen(
      transaction,
      {
        auctionId:
          row.auctionId,
        currentRound:
          row.currentRound,
      },
    );

  return Object.freeze({
    auctionId:
      row.auctionId,
    auctionCode:
      row.auctionCode,
    status:
      row.status,
    currentRound:
      row.currentRound,
    consignorWallet:
      row.consignorWallet
        .toLowerCase() as Address,
    createdAt:
      new Date(
        row.createdAt,
      ),
    startingBid:
      row.startingBid,
    bidIncrement:
      row.bidIncrement,
    openAt:
      new Date(
        row.openAt,
      ),
    durationHours:
      row.durationHours,
    manifestFrozen:
      manifestFrozen,
    guarantorApproved:
      row.guarantorApproved,
    notaryApproved:
      row.notaryApproved,
    guarantorWallet:
      row.guarantorWallet
        .toLowerCase() as Address,
    guarantorApprovedAt:
      new Date(
        row.guarantorApprovedAt,
      ),
  });
}

export type NotarySigningMaterial =
  Readonly<{
    auctionKey: Hex;
    paramsHash: Hex;
    codeHash: Hex;
    nonce: bigint;
    expiry: bigint;
  }>;

import {
  deriveConfirmationCode,
  DERIVATION_TAG,
} from '@shared/relay/confirm-code';

import {
  computeAuctionKey,
  computeParamsHash,
} from '@shared/relay/sign';

export type DerivedNotarySigningMaterial =
  NotarySigningMaterial &
  Readonly<{
    derivation:
      typeof DERIVATION_TAG;
  }>;

export function deriveNotarySigningMaterial(
  input:
    Readonly<{
      snapshot:
        NotaryApprovalSnapshot;
      notaryWallet:
        Address;
      nonce:
        bigint;
      expiry:
        bigint;
    }>,
): DerivedNotarySigningMaterial {
  if (
    input.nonce < 0n ||
    input.expiry < 0n
  ) {
    throw createDomainError(
      'INVALID_INPUT',
      'Notary signing nonce and expiry must be non-negative.',
    );
  }

  const auctionKey =
    computeAuctionKey(
      input.snapshot
        .auctionCode,
    );

  const paramsHash =
    computeParamsHash(
      input.snapshot
        .startingBid,
      input.snapshot
        .bidIncrement,
      BigInt(
        Math.floor(
          input.snapshot
            .openAt
            .getTime() /
          1_000,
        ),
      ),
      input.snapshot
        .durationHours,
    );

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
}
