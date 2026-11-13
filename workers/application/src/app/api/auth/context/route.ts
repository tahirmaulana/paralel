import {
  resolveWalletContext,
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
  createOnchainRoleReader,
} from "../../../../lib/auth/onchain-role-reader";
import {
  createRoleRepository,
} from "../../../../lib/auth/role-repository";
import {
  readSessionToken,
} from "../../../../lib/auth/session-cookie";
import {
  createSessionRepository,
} from "../../../../lib/auth/session-repository";

export const handleAuthContext = async (
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
          now: new Date(),
        },
        {
          repository:
            createSessionRepository(env),
          touchSession: true,
        },
      );

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

    return json({
      data: {
        session: {
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
        context,
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
