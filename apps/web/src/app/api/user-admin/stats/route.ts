// @file apps/web/src/app/api/user-admin/stats/route.ts
//
// Signed-session aggregate statistics for the User Admin workspace.
import {
  assertAuthorized,
  canReviewKyc,
} from '@paralel/domain';

import {
  dataResponse,
  executeApiHandler,
} from '@/lib/api';

import {
  requireWorkspace,
} from '@/lib/auth';

import {
  getUserAdminStats,
} from '@/lib/db';

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

      const stats =
        await getUserAdminStats();

      return dataResponse(
        stats,
        requestContext
          .correlationId,
      );
    },
  );
}
