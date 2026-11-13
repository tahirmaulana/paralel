import type { Env } from "./env";
import { json } from "./http";
import { routeRequest } from "./router";

export default {
  async fetch(
    request: Request,
    env: Env,
    _context: ExecutionContext,
  ): Promise<Response> {
    try {
      return await routeRequest(request, env);
    } catch (error) {
      console.error("Unhandled application worker error", {
        method: request.method,
        pathname: new URL(request.url).pathname,
        error:
          error instanceof Error
            ? {
                name: error.name,
                message: error.message,
                stack: error.stack,
              }
            : String(error),
      });

      return json(
        {
          error: "INTERNAL_SERVER_ERROR",
        },
        {
          status: 500,
        },
      );
    }
  },
} satisfies ExportedHandler<Env>;
