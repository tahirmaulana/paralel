import type { Env } from "../../../env";
import { json, methodNotAllowed } from "../../../http";

export const handleHealth = (
  request: Request,
  env: Env,
): Response => {
  if (request.method !== "GET") {
    return methodNotAllowed(["GET"]);
  }

  return json({
    service: "paralel-application",
    status: "ok",
    environment: env.APP_ENV,
  });
};
