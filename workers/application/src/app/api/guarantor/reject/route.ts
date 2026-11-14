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
  rejectGuarantorReview,
} from "../../../../lib/guarantor/review-mutation";
import {
  preflightGuarantorRejection,
} from "../../../../lib/guarantor/review-preflight";
import {
  parseGuarantorRejection,
} from "../../../../lib/guarantor/review-security";

export const handleGuarantorReject =
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
          "GUARANTOR",
        );

      const input =
        parseGuarantorRejection(
          await readJsonObject(
            request,
          ),
        );

      const now =
        new Date();

      const projection =
        await preflightGuarantorRejection(
          env,
          {
            auctionId:
              input.auctionId,
            authenticatedWallet:
              authentication
                .session
                .wallet,
            reason:
              input.reason,
            nonce:
              input.nonce,
            expiry:
              input.expiry,
            signature:
              input.signature,
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
            input.nonce.toString(),
          expiry:
            input.expiry.toString(),
          reason:
            input.reason,
        });

      const result =
        await rejectGuarantorReview(
          env,
          {
            idempotencyKey:
              request.headers.get(
                "idempotency-key",
              ) ?? "",
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
            projection,
            signature:
              input.signature,
            nonce:
              input.nonce,
            expiry:
              input.expiry,
            reason:
              input.reason,
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
