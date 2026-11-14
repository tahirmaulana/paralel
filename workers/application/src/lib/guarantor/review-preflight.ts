import {
  DomainError,
} from "@paralel/domain";
import type {
  Address,
  Hex,
} from "viem";

import type { Env } from "../../env";
import {
  readGuarantorReviewProjection,
  type GuarantorReviewProjection,
} from "./review-projection";
import {
  assertGuarantorReviewSigningWindow,
} from "./review-security";
import {
  verifyGuarantorApprovalSignature,
  verifyGuarantorRejectionSignature,
} from "./review-signature";

export interface ApprovalPreflightInput {
  auctionId: string;
  authenticatedWallet: Address;
  nonce: bigint;
  expiry: bigint;
  signature: Hex;
  now: Date;
}

export interface RejectionPreflightInput {
  auctionId: string;
  authenticatedWallet: Address;
  reason: string;
  nonce: bigint;
  expiry: bigint;
  signature: Hex;
  now: Date;
}

const assertCommonProjection = (
  projection:
    GuarantorReviewProjection,
  authenticatedWallet:
    Address,
): void => {
  if (
    projection.status !==
      "PENDING"
  ) {
    throw new DomainError(
      "AUCTION_STATE_CHANGED",
      "Guarantor review requires a PENDING auction.",
      {
        details: {
          auctionId:
            projection.auctionId,
          status:
            projection.status,
        },
      },
    );
  }

  if (
    projection
      .guarantorWallet
      .toLowerCase() !==
    authenticatedWallet
      .toLowerCase()
  ) {
    throw new DomainError(
      "RESOURCE_FORBIDDEN",
      "Auction is assigned to a different Guarantor.",
      {
        details: {
          auctionId:
            projection.auctionId,
        },
      },
    );
  }

  if (!projection.manifest.frozen) {
    throw new DomainError(
      "AUCTION_STATE_CHANGED",
      "Auction manifest is incomplete or no longer canonical.",
      {
        details: {
          auctionId:
            projection.auctionId,
          assetCount:
            projection
              .manifest
              .assetCount,
          fileCount:
            projection
              .manifest
              .fileCount,
          photoCount:
            projection
              .manifest
              .photoCount,
          documentCount:
            projection
              .manifest
              .documentCount,
          roundNumbers:
            projection
              .manifest
              .roundNumbers,
        },
      },
    );
  }
};

export const preflightGuarantorApproval =
  async (
    env: Env,
    input:
      ApprovalPreflightInput,
  ): Promise<
    GuarantorReviewProjection
  > => {
    assertGuarantorReviewSigningWindow({
      now:
        input.now,
      expiry:
        input.expiry,
    });

    const projection =
      await readGuarantorReviewProjection(
        env,
        input.auctionId,
      );

    assertCommonProjection(
      projection,
      input.authenticatedWallet,
    );

    if (
      projection
        .hasGuarantorApproval ||
      projection
        .hasGuarantorRejection
    ) {
      throw new DomainError(
        "ALREADY_PROCESSED",
        "Guarantor review has already been recorded.",
        {
          details: {
            auctionId:
              projection.auctionId,
          },
        },
      );
    }

    await verifyGuarantorApprovalSignature(
      {
        guarantorWallet:
          projection
            .guarantorWallet,
        auctionCode:
          projection.auctionCode,
        specHash:
          projection.specHash,
        nonce:
          input.nonce,
        expiry:
          input.expiry,
        signature:
          input.signature,
      },
    );

    return projection;
  };

export const preflightGuarantorRejection =
  async (
    env: Env,
    input:
      RejectionPreflightInput,
  ): Promise<
    GuarantorReviewProjection
  > => {
    assertGuarantorReviewSigningWindow({
      now:
        input.now,
      expiry:
        input.expiry,
    });

    const projection =
      await readGuarantorReviewProjection(
        env,
        input.auctionId,
      );

    assertCommonProjection(
      projection,
      input.authenticatedWallet,
    );

    if (
      projection
        .hasGuarantorApproval ||
      projection
        .hasGuarantorRejection
    ) {
      throw new DomainError(
        "ALREADY_PROCESSED",
        "Guarantor review has already been recorded.",
        {
          details: {
            auctionId:
              projection.auctionId,
          },
        },
      );
    }

    await verifyGuarantorRejectionSignature(
      {
        guarantorWallet:
          projection
            .guarantorWallet,
        auctionCode:
          projection.auctionCode,
        reason:
          input.reason,
        nonce:
          input.nonce,
        expiry:
          input.expiry,
        signature:
          input.signature,
      },
    );

    return projection;
  };
