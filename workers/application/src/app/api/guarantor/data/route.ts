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
  readGuarantorData,
  readGuarantorProfile,
} from "../../../../lib/guarantor/data-repository";

export const handleGuarantorData =
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
          "GUARANTOR",
        );

      const guarantor =
        await readGuarantorProfile(
          env,
          authentication
            .session
            .wallet,
        );

      if (!guarantor) {
        throw new DomainError(
          "PARTNER_INACTIVE",
          "Authenticated Guarantor registry is unavailable.",
        );
      }

      const data =
        await readGuarantorData(
          env,
          guarantor.partnerId,
        );

      return json({
        data: {
          guarantor,
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
