// @file apps/web/src/app/api/user-admin/users/route.ts
//
// Signed-session filtered user listing for the User Admin workspace.
import {
  assertAuthorized,
  canReviewKyc,
  createDomainError,
} from '@paralel/domain';

import {
  dataResponse,
  executeApiHandler,
} from '@/lib/api';

import {
  requireWorkspace,
} from '@/lib/auth';

import {
  getUsersWithFilters,
  type UserAdminFilter,
} from '@/lib/db';

const kycStatuses =
  new Set<
    NonNullable<
      UserAdminFilter[
        'kycStatus'
      ]
    >
  >([
    'UNVERIFIED',
    'VERIFIED',
    'NONE',
  ]);

function invalidFilter(
  field: string,
  message: string,
): never {
  throw createDomainError(
    'INVALID_INPUT',
    message,
    {
      details: {
        field,
      },
    },
  );
}

function parseFilters(
  request: Request,
): UserAdminFilter {
  const searchParams =
    new URL(
      request.url,
    ).searchParams;

  const rawUserType =
    searchParams.get(
      'userType',
    );

  const rawKycStatus =
    searchParams.get(
      'kycStatus',
    );

  const rawSearch =
    searchParams.get(
      'search',
    );

  if (rawUserType !== null && rawUserType !== 'PUBLIC') {
    return invalidFilter(
      'userType',
      'User Admin can only list PUBLIC users.',
    );
  }

  let kycStatus:
    UserAdminFilter[
      'kycStatus'
    ];

  if (
    rawKycStatus !==
      null
  ) {
    if (
      !kycStatuses.has(
        rawKycStatus as
          NonNullable<
            UserAdminFilter[
              'kycStatus'
            ]
          >,
      )
    ) {
      return invalidFilter(
        'kycStatus',
        'kycStatus must be UNVERIFIED, VERIFIED, or NONE.',
      );
    }

    kycStatus =
      rawKycStatus as
        NonNullable<
          UserAdminFilter[
            'kycStatus'
          ]
        >;
  }

  let search:
    string |
    undefined;

  if (
    rawSearch !==
      null
  ) {
    const normalized =
      rawSearch.trim();

    if (
      normalized.length ===
        0 ||
      normalized.length >
        100
    ) {
      return invalidFilter(
        'search',
        'search must contain between 1 and 100 characters.',
      );
    }

    search =
      normalized;
  }

  return {
    kycStatus,
    search,
  };
}

export async function GET(
  request: Request,
): Promise<Response> {
  return executeApiHandler(
    request,
    async (
      requestContext,
    ) => {
      const authentication =
        await requireWorkspace(
          request,
          requestContext
            .correlationId,
          'USER_ADMIN',
        );

      assertAuthorized(
        canReviewKyc(
          authentication
            .actor,
        ),
      );

      const users =
        await getUsersWithFilters(
          parseFilters(
            request,
          ),
        );

      return dataResponse(
        users,
        requestContext
          .correlationId,
      );
    },
  );
}
