import type { Env } from "../../env";
import {
  json,
} from "../../http";
import {
  hashIdempotencyRequest,
} from "../api/idempotency";
import {
  readJsonObject,
} from "../auth/http";
import {
  requireWorkspace,
} from "../auth/require-workspace";
import {
  createApplicationPublicClient,
} from "../contracts/public-client";
import {
  createRelayAccount,
} from "../relay/account";
import {
  prepareSignedCollected,
  prepareSignedWithdrawn,
} from "../relay/durable-guarantor";
import {
  executeGuarantorRelay,
} from "../relay/executor";
import {
  normalizeReviewIdempotencyKey,
} from "./review-idempotency";
import {
  parseGuarantorCollected,
  parseGuarantorWithdrawn,
} from "./review-security";
import {
  completeGuarantorLifecycle,
} from "./lifecycle-completion";
import {
  preflightGuarantorLifecycle,
  type GuarantorLifecycleOperation,
} from "./lifecycle-preflight";
import {
  createGuarantorLifecyclePayload,
} from "./lifecycle-relay";

const routeKeyForOperation = (
  operation:
    GuarantorLifecycleOperation,
):
  | "POST:/api/guarantor/collected"
  | "POST:/api/guarantor/withdrawn" =>
  operation === "MARK_COLLECTED"
    ? "POST:/api/guarantor/collected"
    : "POST:/api/guarantor/withdrawn";

export const handleGuarantorLifecycle =
  async (
    request: Request,
    env: Env,
    operation:
      GuarantorLifecycleOperation,
  ): Promise<Response> => {
    const authentication =
      await requireWorkspace(
        request,
        env,
        "GUARANTOR",
      );

    const body =
      await readJsonObject(
        request,
      );

    const input =
      operation === "MARK_COLLECTED"
        ? parseGuarantorCollected(
            body,
          )
        : parseGuarantorWithdrawn(
            body,
          );

    const idempotencyKey =
      normalizeReviewIdempotencyKey(
        request.headers.get(
          "idempotency-key",
        ),
      );

    const routeKey =
      routeKeyForOperation(
        operation,
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

    const correlationId =
      crypto.randomUUID();

    const now =
      new Date();

    const preflight =
      await preflightGuarantorLifecycle(
        env,
        {
          operation,
          auctionId:
            input.auctionId,
          authenticatedWallet:
            authentication
              .session
              .wallet,
          nonce:
            input.nonce,
          expiry:
            input.expiry,
          signature:
            input.signature,
          now,
        },
      );

    const result =
      await executeGuarantorRelay(
        env,
        {
          operation,
          resourceId:
            preflight
              .projection
              .auctionId,
          routeKey,
          idempotencyKey,
          requestHash,
          now,

          prepare: async () => {
            const [
              publicClient,
              account,
            ] =
              await Promise.all([
                createApplicationPublicClient(
                  env,
                ),
                createRelayAccount(
                  env,
                ),
              ]);

            const relayInput = {
              auctionKey:
                preflight.auctionKey,
              roundNo:
                preflight
                  .projection
                  .currentRound,
              guarantor:
                preflight
                  .projection
                  .guarantorWallet,
              nonce:
                input.nonce,
              expiry:
                input.expiry,
              signature:
                input.signature,
            };

            const transaction =
              operation ===
                "MARK_COLLECTED"
                ? await prepareSignedCollected(
                    publicClient,
                    account,
                    relayInput,
                  )
                : await prepareSignedWithdrawn(
                    publicClient,
                    account,
                    relayInput,
                  );

            return {
              transaction,
              payload:
                createGuarantorLifecyclePayload({
                  operation,
                  preflight,
                  nonce:
                    input.nonce,
                  expiry:
                    input.expiry,
                  signature:
                    input.signature,
                }),
            };
          },
        },
      );

    await completeGuarantorLifecycle(
      env,
      {
        routeKey,
        idempotencyKey,
        requestHash,
        correlationId,
        session:
          authentication.session,
        roles:
          authentication
            .context
            .roles,
        operation,
        auctionId:
          preflight
            .projection
            .auctionId,
        auctionCode:
          preflight
            .projection
            .auctionCode,
        currentRound:
          preflight
            .projection
            .currentRound,
        result,
        now:
          new Date(),
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
  };
