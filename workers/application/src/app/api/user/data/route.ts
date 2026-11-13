import type { Env } from "../../../../env";
import {
  json,
  methodNotAllowed,
} from "../../../../http";
import {
  authErrorResponse,
} from "../../../../lib/auth/http";
import {
  requireUserSession,
} from "../../../../lib/auth/require-user-session";
import {
  readUserData,
} from "../../../../lib/user/data-repository";

export const handleUserData = async (
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

    const data =
      await readUserData(
        env,
        session.wallet,
      );

    return json({
      data,
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
