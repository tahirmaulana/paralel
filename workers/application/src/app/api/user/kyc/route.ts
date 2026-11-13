import {
  resolveWalletContext,
} from "@paralel/auth";

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
  createOnchainRoleReader,
} from "../../../../lib/auth/onchain-role-reader";
import {
  requireUserSession,
} from "../../../../lib/auth/require-user-session";
import {
  createRoleRepository,
} from "../../../../lib/auth/role-repository";
import {
  parseKycSubmission,
} from "../../../../lib/user/kyc-security";
import {
  submitKyc,
} from "../../../../lib/user/kyc-mutation";

export const handleUserKyc = async (
  request: Request,
  env: Env,
): Promise<Response> => {
  if (request.method !== "POST") {
    return methodNotAllowed(["POST"]);
  }

  try {
    const session =
      await requireUserSession(
        request,
        env,
      );

    const submission =
      parseKycSubmission(
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
            details: null,
          },
        },
        {
          status: 400,
        },
      );
    }

    const context =
      await resolveWalletContext(
        {
          wallet:
            session.wallet,
          chainId:
            session.chainId,
          authenticated:
            true,
        },
        {
          roleRepository:
            createRoleRepository(env),
          onchainRoleReader:
            createOnchainRoleReader(
              env,
            ),
        },
      );

    const requestHash =
      await hashIdempotencyRequest(
        submission,
      );

    const correlationId =
      crypto.randomUUID();

    const result =
      await submitKyc(
        env,
        {
          idempotencyKey,
          requestHash,
          correlationId,
          receivedAt:
            new Date(),
          session,
          roles:
            context.roles,
          submission,
        },
      );

    return json(
      result.body,
      {
        status:
          result.status,
        headers: {
          "x-correlation-id":
            correlationId,
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
