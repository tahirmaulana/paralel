import { handleHealth } from "./app/api/health/route";
import type { Env } from "./env";
import { notFound } from "./http";

const normalizePathname = (pathname: string): string => {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }

  return pathname;
};

export const routeRequest = (
  request: Request,
  env: Env,
): Response | Promise<Response> => {
  const url = new URL(request.url);
  const pathname = normalizePathname(url.pathname);

  if (pathname === "/api/health") {
    return handleHealth(request, env);
  }

  return notFound();
};
