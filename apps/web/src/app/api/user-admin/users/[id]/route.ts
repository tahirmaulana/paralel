// @file apps/web/src/app/api/user-admin/users/[id]/route.ts
//
// Signed-session user detail for the User Admin workspace.
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
  getUserAdminDetail,
} from '@/lib/db';

type RouteContext =
  Readonly<{
    params:
      Promise<
        Readonly<{
          id: string;
        }>
      >;
  }>;

function parseUserId(
  value: string,
): string {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      .test(value)
  ) {
    throw createDomainError(
      'INVALID_INPUT',
      'User ID must be a valid UUID.',
      {
        details: {
          field:
            'id',
        },
      },
    );
  }

  return value
    .toLowerCase();
}

export async function GET(
  request: Request,
  routeContext:
    RouteContext,
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

      const {
        id,
      } =
        await routeContext
          .params;

      const userId =
        parseUserId(
          id,
        );

      const user =
        await getUserAdminDetail(
          userId,
        );

      if (!user) {
        throw createDomainError(
          'INVALID_INPUT',
          'No user exists for the supplied User ID.',
          {
            details: {
              field:
                'id',
              userId,
            },
          },
        );
      }

      return dataResponse(
        user,
        requestContext
          .correlationId,
      );
    },
  );
}
