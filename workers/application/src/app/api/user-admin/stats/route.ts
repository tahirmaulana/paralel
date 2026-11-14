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
  readUserAdminStats,
} from "../../../../lib/user-admin/read-repository";

export const handleUserAdminStats =
  async (
    request: Request,
    env: Env,
  ): Promise<Response> => {
    if (request.method !== "GET") {
      return methodNotAllowed(["GET"]);
    }

    try {
      await requireWorkspace(
        request,
        env,
        "USER_ADMIN",
      );

      return json({
        data:
          await readUserAdminStats(
            env,
          ),
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
