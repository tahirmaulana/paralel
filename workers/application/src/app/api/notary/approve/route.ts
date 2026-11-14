import type { Env } from "../../../../env";
import {
  json,
  methodNotAllowed,
} from "../../../../http";
import {
  hashIdempotencyRequest,
} from "../../../../lib/api/idempotency";
import {
  authErrorResponse,
  readJsonObject,
} from "../../../../lib/auth/http";
import {
  requireWorkspace,
} from "../../../../lib/auth/require-workspace";
import {
  approveNotary,
} from "../../../../lib/notary/approval-mutation";
import {
  preflightNotaryApproval,
} from "../../../../lib/notary/approval-preflight";
import {
  parseNotaryApproval,
} from "../../../../lib/notary/approval-security";

export const handleNotaryApproval =
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
        parseNotaryApproval(
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

      const now =
        new Date();

      const preflight =
        await preflightNotaryApproval(
          env,
          {
            auctionId:
              input.auctionId,
            authenticatedWallet:
              authentication
                .session
                .wallet,
            signature:
              input.signature,
            nonce:
              input.nonce,
            expiry:
              input.expiry,
            now,
          },
        );

      const requestHash =
        await hashIdempotencyRequest({
          auctionId:
            input.auctionId,
          signature:
            input.signature,
          nonce:
            input.nonce
              .toString(),
          expiry:
            input.expiry
              .toString(),
        });

      const result =
        await approveNotary(
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
            preflight,
            signature:
              input.signature,
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
