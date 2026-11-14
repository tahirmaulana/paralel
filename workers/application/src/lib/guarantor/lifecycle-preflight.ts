import {
  ARBITRUM_SEPOLIA_CHAIN_ID,
  ParalelAuctionAbi,
  computeAuctionKey,
  getParalelContractAddress,
  getParalelEip712Domain,
} from "@paralel/contracts";
import {
  DomainError,
} from "@paralel/domain";
import {
  verifyTypedData,
  type Address,
  type Hex,
} from "viem";

import type { Env } from "../../env";
import {
  createApplicationPublicClient,
} from "../contracts/public-client";
import {
  assertGuarantorReviewSigningWindow,
} from "./review-security";
import {
  readGuarantorLifecycleProjection,
  type GuarantorLifecycleProjection,
} from "./lifecycle-projection";

const COLLECTED_TYPES = {
  Collected: [
    {
      name:
        "auctionKey",
      type:
        "bytes32",
    },
    {
      name:
        "roundNo",
      type:
        "uint16",
    },
    {
      name:
        "nonce",
      type:
        "uint256",
    },
    {
      name:
        "expiry",
      type:
        "uint256",
    },
  ],
} as const;

const WITHDRAWN_TYPES = {
  Withdrawn: [
    {
      name:
        "auctionKey",
      type:
        "bytes32",
    },
    {
      name:
        "roundNo",
      type:
        "uint16",
    },
    {
      name:
        "nonce",
      type:
        "uint256",
    },
    {
      name:
        "expiry",
      type:
        "uint256",
    },
  ],
} as const;

export type GuarantorLifecycleOperation =
  | "MARK_COLLECTED"
  | "MARK_WITHDRAWN";

export interface GuarantorLifecyclePreflightInput {
  operation:
    GuarantorLifecycleOperation;
  auctionId: string;
  authenticatedWallet: Address;
  nonce: bigint;
  expiry: bigint;
  signature: Hex;
  now: Date;
}

export interface GuarantorLifecyclePreflight {
  projection:
    GuarantorLifecycleProjection;
  auctionKey: Hex;
  onchainNonce: bigint;
}

const expectedStatus = (
  operation:
    GuarantorLifecycleOperation,
): "COLLECTION" | "PASSED_IN" =>
  operation === "MARK_COLLECTED"
    ? "COLLECTION"
    : "PASSED_IN";

export const preflightGuarantorLifecycle =
  async (
    env: Env,
    input:
      GuarantorLifecyclePreflightInput,
  ): Promise<
    GuarantorLifecyclePreflight
  > => {
    assertGuarantorReviewSigningWindow({
      now:
        input.now,
      expiry:
        input.expiry,
    });

    const projection =
      await readGuarantorLifecycleProjection(
        env,
        input.auctionId,
      );

    if (
      projection
        .guarantorWallet
        .toLowerCase() !==
      input
        .authenticatedWallet
        .toLowerCase()
    ) {
      throw new DomainError(
        "RESOURCE_FORBIDDEN",
        "Auction is not assigned to the authenticated Guarantor.",
        {
          details: {
            auctionId:
              projection.auctionId,
          },
        },
      );
    }

    const requiredStatus =
      expectedStatus(
        input.operation,
      );

    if (
      projection.status !==
        requiredStatus
    ) {
      throw new DomainError(
        "AUCTION_STATE_CHANGED",
        input.operation ===
          "MARK_COLLECTED"
          ? "Guarantor collection requires a COLLECTION auction."
          : "Guarantor withdrawal requires a PASSED_IN auction.",
        {
          details: {
            auctionId:
              projection.auctionId,
            expectedStatus:
              requiredStatus,
            status:
              projection.status,
          },
        },
      );
    }

    const publicClient =
      await createApplicationPublicClient(
        env,
      );

    const contractAddress =
      getParalelContractAddress(
        ARBITRUM_SEPOLIA_CHAIN_ID,
      );

    const onchainNonce =
      await publicClient
        .readContract({
          address:
            contractAddress,
          abi:
            ParalelAuctionAbi,
          functionName:
            "nonces",
          args: [
            projection
              .guarantorWallet,
          ],
        }) as bigint;

    if (
      onchainNonce !==
        input.nonce
    ) {
      throw new DomainError(
        "AUCTION_STATE_CHANGED",
        input.operation ===
          "MARK_COLLECTED"
          ? "Guarantor collection nonce changed after signing initialization."
          : "Guarantor withdrawal nonce changed after signing initialization.",
        {
          retryable: true,
          details: {
            auctionId:
              projection.auctionId,
            expectedNonce:
              input.nonce
                .toString(),
            currentNonce:
              onchainNonce
                .toString(),
          },
        },
      );
    }

    const auctionKey =
      computeAuctionKey(
        projection.auctionCode,
      );

    const domain =
      getParalelEip712Domain(
        ARBITRUM_SEPOLIA_CHAIN_ID,
        contractAddress,
      );

    const signatureValid =
      input.operation ===
        "MARK_COLLECTED"
        ? await verifyTypedData({
            address:
              projection
                .guarantorWallet,
            domain,
            types:
              COLLECTED_TYPES,
            primaryType:
              "Collected",
            message: {
              auctionKey,
              roundNo:
                projection
                  .currentRound,
              nonce:
                input.nonce,
              expiry:
                input.expiry,
            },
            signature:
              input.signature,
          })
        : await verifyTypedData({
            address:
              projection
                .guarantorWallet,
            domain,
            types:
              WITHDRAWN_TYPES,
            primaryType:
              "Withdrawn",
            message: {
              auctionKey,
              roundNo:
                projection
                  .currentRound,
              nonce:
                input.nonce,
              expiry:
                input.expiry,
            },
            signature:
              input.signature,
          });

    if (!signatureValid) {
      throw new DomainError(
        "INVALID_SIGNATURE",
        input.operation ===
          "MARK_COLLECTED"
          ? "Guarantor collected signature is invalid."
          : "Guarantor withdrawn signature is invalid.",
      );
    }

    return Object.freeze({
      projection,
      auctionKey,
      onchainNonce,
    });
  };
