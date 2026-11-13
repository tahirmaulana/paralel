import {
  issueWalletAuthChallenge,
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
} from "viem";

import type { Env } from "../../../../env";
import {
  json,
  methodNotAllowed,
} from "../../../../http";
import {
  createChallengeRepository,
} from "../../../../lib/auth/challenge-repository";
import {
  authErrorResponse,
  readJsonObject,
} from "../../../../lib/auth/http";

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
    uri: url.origin,
  };
};

export const handleAuthChallenge = async (
  request: Request,
  env: Env,
): Promise<Response> => {
  if (request.method !== "POST") {
    return methodNotAllowed(["POST"]);
  }

  try {
    const body =
      await readJsonObject(request);

    const wallet = body.wallet;
    const chainId = body.chainId;

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
        {
          details: {
            expectedChainId:
              ARBITRUM_SEPOLIA_CHAIN_ID,
            receivedChainId:
              chainId,
          },
        },
      );
    }

    const identity =
      identityFromOrigin(request);

    const challenge =
      await issueWalletAuthChallenge(
        {
          wallet:
            getAddress(wallet),
          chainId,
          domain:
            identity.domain,
          uri:
            identity.uri,
          now:
            new Date(),
        },
        {
          repository:
            createChallengeRepository(env),
        },
      );

    return json(
      {
        data: {
          challengeId:
            challenge.challengeId,
          wallet:
            challenge.wallet,
          chainId:
            challenge.chainId,
          domain:
            challenge.domain,
          uri:
            challenge.uri,
          statement:
            challenge.statement,
          issuedAt:
            challenge.issuedAt
              .toISOString(),
          expiresAt:
            challenge.expiresAt
              .toISOString(),
          message:
            challenge.message,
        },
      },
      {
        status: 201,
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
