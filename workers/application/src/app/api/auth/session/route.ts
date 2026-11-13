import {
  validateSession,
} from "@paralel/auth";
import {
  ARBITRUM_SEPOLIA_CHAIN_ID,
} from "@paralel/contracts";
import {
  DomainError,
} from "@paralel/domain";

import type { Env } from "../../../../env";
import {
  json,
  methodNotAllowed,
} from "../../../../http";
import {
  authErrorResponse,
} from "../../../../lib/auth/http";
import {
  readSessionToken,
} from "../../../../lib/auth/session-cookie";
import {
  createSessionRepository,
} from "../../../../lib/auth/session-repository";

export const handleAuthSession = async (
  request: Request,
  env: Env,
): Promise<Response> => {
  if (request.method !== "GET") {
    return methodNotAllowed(["GET"]);
  }

  try {
    const token =
      readSessionToken(request);

    if (!token) {
      throw new DomainError(
        "UNAUTHENTICATED",
        "An authenticated wallet session is required.",
      );
    }

    const session =
      await validateSession(
        {
          token,
          expectedChainId:
            ARBITRUM_SEPOLIA_CHAIN_ID,
          now:
            new Date(),
        },
        {
          repository:
            createSessionRepository(env),
          touchSession:
            true,
        },
      );

    return json({
      data: {
        authenticated:
          true,
        sessionId:
          session.sessionId,
        wallet:
          session.wallet,
        chainId:
          session.chainId,
        issuedAt:
          session.issuedAt
            .toISOString(),
        expiresAt:
          session.expiresAt
            .toISOString(),
        generation:
          session.generation,
      },
    });
  } catch (error) {
    const response =
      authErrorResponse(error);

    if (response) {
      return response;
    }

    throw error;
  }
};
