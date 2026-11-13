import {
  validateSession,
  type SessionClaims,
} from "@paralel/auth";
import {
  ARBITRUM_SEPOLIA_CHAIN_ID,
} from "@paralel/contracts";
import {
  DomainError,
} from "@paralel/domain";

import type { Env } from "../../env";
import {
  readSessionToken,
} from "./session-cookie";
import {
  createSessionRepository,
} from "./session-repository";

export const requireUserSession = async (
  request: Request,
  env: Env,
): Promise<SessionClaims> => {
  const token =
    readSessionToken(request);

  if (!token) {
    throw new DomainError(
      "UNAUTHENTICATED",
      "An authenticated wallet session is required.",
    );
  }

  return validateSession(
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
};
