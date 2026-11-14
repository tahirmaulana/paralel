import type { Env } from "../../../../env";
import {
  methodNotAllowed,
} from "../../../../http";
import {
  authErrorResponse,
} from "../../../../lib/auth/http";
import {
  handleGuarantorLifecycle,
} from "../../../../lib/guarantor/lifecycle-handler";

export const handleGuarantorCollected =
  async (
    request: Request,
    env: Env,
  ): Promise<Response> => {
    if (request.method !== "POST") {
      return methodNotAllowed(["POST"]);
    }

    try {
      return await handleGuarantorLifecycle(
        request,
        env,
        "MARK_COLLECTED",
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
