import {
  issueSession,
  SESSION_COOKIE_NAME,
  verifyWalletAuthChallenge,
  type StoredSession,
} from "@paralel/auth";
import {
  ARBITRUM_SEPOLIA_CHAIN_ID,
} from "@paralel/contracts";
import {
  DomainError,
} from "@paralel/domain";
import {
  getAddress,
  isAddress,
  isHex,
  type Address,
  type Hex,
} from "viem";

import type { Env } from "../../../../env";
import {
  json,
  methodNotAllowed,
} from "../../../../http";
import {
  createCapturedSessionRepository,
  createDeferredChallengeRepository,
} from "../../../../lib/auth/deferred-repositories";
import {
  finalizeAuthentication,
} from "../../../../lib/auth/finalize-authentication";
import {
  authErrorResponse,
  readJsonObject,
} from "../../../../lib/auth/http";

interface VerifyBody {
  challengeId: string;
  wallet: Address;
  chainId: number;
  message: string;
  signature: Hex;
}

const parseBody = (
  value: Record<string, unknown>,
): VerifyBody => {
  const {
    challengeId,
    wallet,
    chainId,
    message,
    signature,
  } = value;

  if (
    typeof challengeId !== "string" ||
    challengeId.trim().length === 0
  ) {
    throw new DomainError(
      "INVALID_INPUT",
      "challengeId is required.",
    );
  }

  if (
    typeof wallet !== "string" ||
    !isAddress(wallet, {
      strict: false,
    })
  ) {
    throw new DomainError(
      "INVALID_INPUT",
      "wallet must be a valid address.",
    );
  }

  if (
    typeof chainId !== "number" ||
    !Number.isSafeInteger(chainId)
  ) {
    throw new DomainError(
      "INVALID_INPUT",
      "chainId must be an integer.",
    );
  }

  if (
    chainId !==
    ARBITRUM_SEPOLIA_CHAIN_ID
  ) {
    throw new DomainError(
      "WRONG_NETWORK",
      `Authentication requires chain ID ${ARBITRUM_SEPOLIA_CHAIN_ID}.`,
    );
  }

  if (
    typeof message !== "string" ||
    message.length === 0 ||
    message.length > 4_096
  ) {
    throw new DomainError(
      "INVALID_INPUT",
      "message must contain between 1 and 4096 characters.",
    );
  }

  if (
    typeof signature !== "string" ||
    !isHex(signature) ||
    signature.length !== 132
  ) {
    throw new DomainError(
      "INVALID_SIGNATURE",
      "Authentication signature must be a 65-byte hexadecimal value.",
    );
  }

  return {
    challengeId:
      challengeId.trim(),
    wallet:
      getAddress(wallet),
    chainId,
    message,
    signature,
  };
};

const identityFromOrigin = (
  request: Request,
): {
  domain: string;
  uri: string;
} => {
  const origin =
    request.headers.get("origin");

  if (!origin) {
    throw new DomainError(
      "INVALID_INPUT",
      "Origin header is required.",
    );
  }

  const url = new URL(origin);

  return {
    domain: url.host,
    uri: `${url.origin}/`,
  };
};

const sessionCookie = (
  token: string,
  maxAgeSeconds: number,
): string =>
  [
    `${SESSION_COOKIE_NAME}=${token}`,
    "Path=/",
    `Max-Age=${maxAgeSeconds}`,
    "HttpOnly",
    "Secure",
    "SameSite=None",
  ].join("; ");

export const handleAuthVerify = async (
  request: Request,
  env: Env,
): Promise<Response> => {
  if (request.method !== "POST") {
    return methodNotAllowed(["POST"]);
  }

  try {
    const body =
      parseBody(
        await readJsonObject(request),
      );

    const identity =
      identityFromOrigin(request);

    const now = new Date();

    const challenge =
      createDeferredChallengeRepository(
        env,
      );

    const verified =
      await verifyWalletAuthChallenge(
        {
          challengeId:
            body.challengeId,
          wallet:
            body.wallet,
          chainId:
            body.chainId,
          domain:
            identity.domain,
          uri:
            identity.uri,
          message:
            body.message,
          signature:
            body.signature,
          now,
        },
        {
          repository:
            challenge.repository,
        },
      );

    if (!challenge.wasConsumed()) {
      throw new Error(
        "Canonical challenge verification did not reach consume.",
      );
    }

    const sessionCapture =
      createCapturedSessionRepository();

    const issued =
      await issueSession(
        {
          wallet:
            verified.wallet,
          chainId:
            verified.chainId,
          now:
            verified.verifiedAt,
        },
        {
          repository:
            sessionCapture.repository,
        },
      );

    const storedSession:
      StoredSession | null =
        sessionCapture
          .getCapturedSession();

    if (!storedSession) {
      throw new Error(
        "Canonical session issuance did not produce a stored session.",
      );
    }

    const correlationId =
      crypto.randomUUID();

    const finalized =
      await finalizeAuthentication(
        env,
        {
          challengeId:
            verified.challengeId,
          correlationId,
          wallet:
            verified.wallet,
          chainId:
            verified.chainId,
          verifiedAt:
            verified.verifiedAt,
          session:
            storedSession,
        },
      );

    if (!finalized) {
      throw new DomainError(
        "ALREADY_PROCESSED",
        "Authentication challenge was already consumed or is no longer active.",
      );
    }

    const maxAgeSeconds =
      Math.floor(
        (
          issued.claims.expiresAt.getTime() -
          issued.claims.issuedAt.getTime()
        ) / 1_000,
      );

    return json(
      {
        data: {
          wallet:
            issued.claims.wallet,
          chainId:
            issued.claims.chainId,
          sessionId:
            issued.claims.sessionId,
          issuedAt:
            issued.claims
              .issuedAt
              .toISOString(),
          expiresAt:
            issued.claims
              .expiresAt
              .toISOString(),
        },
      },
      {
        status: 201,
        headers: {
          "set-cookie":
            sessionCookie(
              issued.token,
              maxAgeSeconds,
            ),
          "x-correlation-id":
            correlationId,
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
