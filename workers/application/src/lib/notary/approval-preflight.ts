import {
  ARBITRUM_SEPOLIA_CHAIN_ID,
  NOTARY_APPROVAL_TYPES,
  ParalelAuctionAbi,
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
  assertNotaryApprovalSigningWindow,
} from "./approval-security";
import {
  deriveNotarySigningMaterial,
  readNotaryApprovalSnapshot,
  type DerivedNotarySigningMaterial,
  type NotaryApprovalSnapshot,
} from "./approval-snapshot";

export interface NotaryApprovalPreflightInput {
  auctionId: string;
  authenticatedWallet: Address;
  signature: Hex;
  nonce: bigint;
  expiry: bigint;
  now: Date;
}

export interface NotaryApprovalPreflight {
  snapshot:
    NotaryApprovalSnapshot;
  material:
    DerivedNotarySigningMaterial;
  onchainNonce: bigint;
}

export const preflightNotaryApproval =
  async (
    env: Env,
    input:
      NotaryApprovalPreflightInput,
  ): Promise<
    NotaryApprovalPreflight
  > => {
    assertNotaryApprovalSigningWindow({
      now:
        input.now,
      expiry:
        input.expiry,
    });

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
            input
              .authenticatedWallet,
          ],
        }) as bigint;

    if (
      onchainNonce !==
        input.nonce
    ) {
      throw new DomainError(
        "AUCTION_STATE_CHANGED",
        "Notary nonce changed after signing initialization.",
        {
          retryable: true,
          details: {
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

    const snapshot =
      await readNotaryApprovalSnapshot(
        env,
        {
          auctionId:
            input.auctionId,
        },
      );

    const material =
      deriveNotarySigningMaterial({
        snapshot,
        notaryWallet:
          input
            .authenticatedWallet,
        nonce:
          input.nonce,
        expiry:
          input.expiry,
      });

    const valid =
      await verifyTypedData({
        address:
          input.authenticatedWallet,

        domain:
          getParalelEip712Domain(
            ARBITRUM_SEPOLIA_CHAIN_ID,
            contractAddress,
          ),

        types:
          NOTARY_APPROVAL_TYPES,

        primaryType:
          "NotaryApproval",

        message: {
          auctionKey:
            material.auctionKey,
          paramsHash:
            material.paramsHash,
          confirmationCodeHash:
            material.codeHash,
          nonce:
            material.nonce,
          expiry:
            material.expiry,
        },

        signature:
          input.signature,
      });

    if (!valid) {
      throw new DomainError(
        "INVALID_SIGNATURE",
        "Notary approval signature is invalid.",
      );
    }

    return Object.freeze({
      snapshot,
      material,
      onchainNonce,
    });
  };
