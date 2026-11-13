import {
  assertAllowedOrigin,
  handlePreflight,
  withCors,
} from "./cors";
import type { Env } from "./env";
import { json } from "./http";
import { routeRequest } from "./router";

export default {
  async fetch(
    request: Request,
    env: Env,
    _context: ExecutionContext,
  ): Promise<Response> {
    const rejected =
      assertAllowedOrigin(request);

    if (rejected) {
      return rejected;
    }

    const preflight =
      handlePreflight(request);

    if (preflight) {
      return preflight;
    }

    try {
      const response =
        await routeRequest(request, env);

      return withCors(
        request,
        response,
      );
    } catch (error) {
      console.error(
        "Unhandled application worker error",
        {
          method: request.method,
          pathname:
            new URL(request.url).pathname,
          error:
            error instanceof Error
              ? {
                  name: error.name,
                  message: error.message,
                  stack: error.stack,
                }
              : String(error),
        },
      );

      return withCors(
        request,
        json(
          {
            error:
              "INTERNAL_SERVER_ERROR",
          },
          {
            status: 500,
          },
        ),
      );
    }
  },
} satisfies ExportedHandler<Env>;
