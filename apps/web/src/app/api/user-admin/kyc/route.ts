// @file apps/web/src/app/api/user-admin/kyc/route.ts
//
// Signed-session KYC listings for the User Admin workspace.
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
  getAllUsersKycList,
  getUnverifiedKycList,
} from '@/lib/db';

type KycListType =
  | 'requests'
  | 'users';

function parseKycListType(
  request: Request,
): KycListType {
  const type =
    new URL(
      request.url,
    ).searchParams.get(
      'type',
    );

  if (
    type === null ||
    type === 'requests'
  ) {
    return 'requests';
  }

  if (
    type === 'users'
  ) {
    return 'users';
  }

  throw createDomainError(
    'INVALID_INPUT',
    'type must be requests or users.',
    {
      details: {
        field:
          'type',
      },
    },
  );
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

      const type =
        parseKycListType(
          request,
        );

      const data =
        type === 'users'
          ? await getAllUsersKycList()
          : await getUnverifiedKycList();

      return dataResponse(
        data,
        requestContext
          .correlationId,
      );
    },
  );
}
