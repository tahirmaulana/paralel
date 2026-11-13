import {
  handleAuctionConfig,
} from "./app/api/auction/config/route";
import {
  handleAuctionGuarantors,
} from "./app/api/auction/guarantors/route";
import {
  handleAuthChallenge,
} from "./app/api/auth/challenge/route";
import {
  handleAuthContext,
} from "./app/api/auth/context/route";
import {
  handleAuthSession,
} from "./app/api/auth/session/route";
import {
  handleAuthVerify,
} from "./app/api/auth/verify/route";
import {
  handleHealth,
} from "./app/api/health/route";
import type { Env } from "./env";
import { notFound } from "./http";

const normalizePathname = (
  pathname: string,
): string => {
  if (
    pathname.length > 1 &&
    pathname.endsWith("/")
  ) {
    return pathname.slice(0, -1);
  }

  return pathname;
};

export const routeRequest = (
  request: Request,
  env: Env,
): Response | Promise<Response> => {
  const url = new URL(request.url);
  const pathname =
    normalizePathname(url.pathname);

  if (pathname === "/api/health") {
    return handleHealth(request, env);
  }

  if (
    pathname === "/api/auction/config"
  ) {
    return handleAuctionConfig(
      request,
      env,
    );
  }

  if (
    pathname ===
    "/api/auction/guarantors"
  ) {
    return handleAuctionGuarantors(
      request,
      env,
    );
  }

  if (
    pathname ===
    "/api/auth/context"
  ) {
    return handleAuthContext(
      request,
      env,
    );
  }

  if (
    pathname ===
    "/api/auth/challenge"
  ) {
    return handleAuthChallenge(
      request,
      env,
    );
  }

  if (
    pathname ===
    "/api/auth/session"
  ) {
    return handleAuthSession(
      request,
      env,
    );
  }

  if (
    pathname ===
    "/api/auth/verify"
  ) {
    return handleAuthVerify(
      request,
      env,
    );
  }

  return notFound();
};
