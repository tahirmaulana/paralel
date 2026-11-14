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
  requireWorkspace,
} from "../../../../lib/auth/require-workspace";
import {
  readNotaryData,
  readNotaryProfile,
} from "../../../../lib/notary/data-repository";

export const handleNotaryData =
  async (
    request: Request,
    env: Env,
  ): Promise<Response> => {
    if (request.method !== "GET") {
      return methodNotAllowed(["GET"]);
    }

    try {
      const authentication =
        await requireWorkspace(
          request,
          env,
          "NOTARY",
        );

      const notary =
        await readNotaryProfile(
          env,
          authentication
            .session
            .wallet,
        );

      if (!notary) {
        throw new DomainError(
          "PARTNER_INACTIVE",
          "Authenticated Notary registry is unavailable.",
        );
      }

      const data =
        await readNotaryData(
          env,
          authentication
            .session
            .wallet,
        );

      return json({
        data: {
          notary,
          ...data,
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
