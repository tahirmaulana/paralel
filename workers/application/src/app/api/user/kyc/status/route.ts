import {
  DomainError,
} from "@paralel/domain";
import {
  getAddress,
  isAddress,
} from "viem";

import type { Env } from "../../../../../env";
import {
  json,
  methodNotAllowed,
} from "../../../../../http";
import {
  authErrorResponse,
} from "../../../../../lib/auth/http";
import {
  requireUserSession,
} from "../../../../../lib/auth/require-user-session";
import {
  readUserKycStatus,
} from "../../../../../lib/user/data-repository";

export const handleUserKycStatus =
  async (
    request: Request,
    env: Env,
  ): Promise<Response> => {
    if (request.method !== "GET") {
      return methodNotAllowed(["GET"]);
    }

    try {
      const session =
        await requireUserSession(
          request,
          env,
        );

      const walletValue =
        new URL(request.url)
          .searchParams
          .get("wallet");

      if (
        !walletValue ||
        !isAddress(
          walletValue,
          {
            strict: false,
          },
        )
      ) {
        throw new DomainError(
          "INVALID_INPUT",
          "A valid wallet address is required.",
        );
      }

      const wallet =
        getAddress(walletValue);

      if (
        session.wallet.toLowerCase() !==
        wallet.toLowerCase()
      ) {
        throw new DomainError(
          "RESOURCE_FORBIDDEN",
          "The authenticated session does not match the connected wallet.",
        );
      }

      const kycStatus =
        await readUserKycStatus(
          env,
          wallet,
        );

      return json({
        data: {
          kycStatus,
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
