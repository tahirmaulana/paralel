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
import {
  handleNotaryApproval,
} from "./app/api/notary/approve/route";
import {
  handleNotaryApprovalInit,
} from "./app/api/notary/approve/init/route";
import {
  handleNotaryData,
} from "./app/api/notary/data/route";
import {
  handleGuarantorApprove,
} from "./app/api/guarantor/approve/route";
import {
  handleGuarantorCollected,
} from "./app/api/guarantor/collected/route";
import {
  handleGuarantorData,
} from "./app/api/guarantor/data/route";
import {
  handleGuarantorWithdrawn,
} from "./app/api/guarantor/withdrawn/route";
import {
  handleGuarantorReject,
} from "./app/api/guarantor/reject/route";
import {
  handleUserAdminStats,
} from "./app/api/user-admin/stats/route";
import {
  handleUserAdminUsers,
} from "./app/api/user-admin/users/route";
import {
  handleUserData,
} from "./app/api/user/data/route";
import {
  handleUserKyc,
} from "./app/api/user/kyc/route";
import {
  handleUserKycStatus,
} from "./app/api/user/kyc/status/route";
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

  if (
    pathname ===
    "/api/user/kyc/status"
  ) {
    return handleUserKycStatus(
      request,
      env,
    );
  }

  if (
    pathname ===
    "/api/user/kyc"
  ) {
    return handleUserKyc(
      request,
      env,
    );
  }

  if (
    pathname ===
    "/api/user-admin/stats"
  ) {
    return handleUserAdminStats(
      request,
      env,
    );
  }

  if (
    pathname ===
    "/api/user-admin/users"
  ) {
    return handleUserAdminUsers(
      request,
      env,
    );
  }

  if (
    pathname ===
    "/api/user/data"
  ) {
    return handleUserData(
      request,
      env,
    );
  }

  if (
    pathname ===
    "/api/guarantor/approve"
  ) {
    return handleGuarantorApprove(
      request,
      env,
    );
  }

  if (
    pathname ===
    "/api/guarantor/reject"
  ) {
    return handleGuarantorReject(
      request,
      env,
    );
  }

  if (
    pathname ===
    "/api/guarantor/collected"
  ) {
    return handleGuarantorCollected(
      request,
      env,
    );
  }

  if (
    pathname ===
    "/api/guarantor/withdrawn"
  ) {
    return handleGuarantorWithdrawn(
      request,
      env,
    );
  }

  if (
    pathname ===
    "/api/guarantor/data"
  ) {
    return handleGuarantorData(
      request,
      env,
    );
  }

  if (
    pathname ===
    "/api/notary/approve"
  ) {
    return handleNotaryApproval(
      request,
      env,
    );
  }

  if (
    pathname ===
    "/api/notary/approve/init"
  ) {
    return handleNotaryApprovalInit(
      request,
      env,
    );
  }

  if (
    pathname ===
    "/api/notary/data"
  ) {
    return handleNotaryData(
      request,
      env,
    );
  }

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
