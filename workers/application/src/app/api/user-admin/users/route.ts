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
  readUserAdminUsers,
  type UserAdminKycFilter,
  type UserAdminListFilter,
} from "../../../../lib/user-admin/read-repository";

const KYC_STATUSES =
  new Set<UserAdminKycFilter>([
    "UNVERIFIED",
    "VERIFIED",
    "NONE",
  ]);

const invalidFilter = (
  field: string,
  message: string,
): never => {
  throw new DomainError(
    "INVALID_INPUT",
    message,
    {
      details: {
        field,
      },
    },
  );
};

const parseFilters = (
  request: Request,
): UserAdminListFilter => {
  const searchParams =
    new URL(
      request.url,
    ).searchParams;

  const rawUserType =
    searchParams.get(
      "userType",
    );

  if (
    rawUserType !== null &&
    rawUserType !== "PUBLIC"
  ) {
    return invalidFilter(
      "userType",
      "User Admin can only list PUBLIC users.",
    );
  }

  const rawKycStatus =
    searchParams.get(
      "kycStatus",
    );

  let kycStatus:
    UserAdminKycFilter |
    undefined;

  if (rawKycStatus !== null) {
    if (
      !KYC_STATUSES.has(
        rawKycStatus as
          UserAdminKycFilter,
      )
    ) {
      return invalidFilter(
        "kycStatus",
        "kycStatus must be UNVERIFIED, VERIFIED, or NONE.",
      );
    }

    kycStatus =
      rawKycStatus as
        UserAdminKycFilter;
  }

  const rawSearch =
    searchParams.get(
      "search",
    );

  let search:
    string |
    undefined;

  if (rawSearch !== null) {
    const normalized =
      rawSearch.trim();

    if (
      normalized.length === 0 ||
      normalized.length > 100
    ) {
      return invalidFilter(
        "search",
        "search must contain between 1 and 100 characters.",
      );
    }

    search =
      normalized;
  }

  return {
    kycStatus,
    search,
  };
};

export const handleUserAdminUsers =
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
          await readUserAdminUsers(
            env,
            parseFilters(
              request,
            ),
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
