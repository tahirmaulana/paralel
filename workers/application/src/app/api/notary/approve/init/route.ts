import {
  ARBITRUM_SEPOLIA_CHAIN_ID,
  ParalelAuctionAbi,
  getParalelContractAddress,
} from "@paralel/contracts";

import type { Env } from "../../../../../env";
import {
  json,
  methodNotAllowed,
} from "../../../../../http";
import {
  hashIdempotencyRequest,
} from "../../../../../lib/api/idempotency";
import {
  authErrorResponse,
  readJsonObject,
} from "../../../../../lib/auth/http";
import {
  requireWorkspace,
} from "../../../../../lib/auth/require-workspace";
import {
  createApplicationPublicClient,
} from "../../../../../lib/contracts/public-client";
import {
  initializeNotaryApproval,
} from "../../../../../lib/notary/approval-init";
import {
  deriveNotaryApprovalSigningExpiry,
  parseNotaryApprovalInit,
} from "../../../../../lib/notary/approval-security";
import {
  deriveNotarySigningMaterial,
  readNotaryApprovalSnapshot,
} from "../../../../../lib/notary/approval-snapshot";

export const handleNotaryApprovalInit =
  async (
    request: Request,
    env: Env,
  ): Promise<Response> => {
    if (request.method !== "POST") {
      return methodNotAllowed(["POST"]);
    }

    try {
      const authentication =
        await requireWorkspace(
          request,
          env,
          "NOTARY",
        );

      const input =
        parseNotaryApprovalInit(
          await readJsonObject(
            request,
          ),
        );

      const idempotencyKey =
        request.headers.get(
          "idempotency-key",
        );

      if (!idempotencyKey) {
        return json(
          {
            error: {
              code:
                "INVALID_INPUT",
              message:
                "Idempotency-Key header is required.",
              details: {
                field:
                  "Idempotency-Key",
              },
            },
          },
          {
            status: 400,
          },
        );
      }

      const publicClient =
        await createApplicationPublicClient(
          env,
        );

      const nonce =
        await publicClient
          .readContract({
            address:
              getParalelContractAddress(
                ARBITRUM_SEPOLIA_CHAIN_ID,
              ),
            abi:
              ParalelAuctionAbi,
            functionName:
              "nonces",
            args: [
              authentication
                .session
                .wallet,
            ],
          }) as bigint;

      if (nonce < 0n) {
        throw new Error(
          "Canonical Notary nonce is invalid.",
        );
      }

      const now =
        new Date();

      const snapshot =
        await readNotaryApprovalSnapshot(
          env,
          {
            auctionId:
              input.auctionId,
          },
        );

      const expiry =
        deriveNotaryApprovalSigningExpiry(
          now,
        );

      const material =
        deriveNotarySigningMaterial({
          snapshot,
          notaryWallet:
            authentication
              .session
              .wallet,
          nonce,
          expiry,
        });

      const requestHash =
        await hashIdempotencyRequest({
          auctionId:
            input.auctionId,
        });

      const result =
        await initializeNotaryApproval(
          env,
          {
            idempotencyKey,
            requestHash,
            correlationId:
              crypto.randomUUID(),
            now,
            session:
              authentication.session,
            roles:
              authentication
                .context
                .roles,
            snapshot,
            material,
          },
        );

      return json(
        result.body,
        {
          status:
            result.status,
          headers: {
            "idempotency-status":
              result.replayed
                ? "replayed"
                : "created",
          },
        },
      );
    } catch (error) {
      const response =
        authErrorResponse(error);

      if (response) {
        return response;
      }

      throw error;
    }
  };
