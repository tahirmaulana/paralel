import {
  NextResponse,
} from 'next/server';

import {
  assertTrustedRequestOrigin,
  getSessionCookieOptions,
  revokeSession,
} from '@paralel/auth';

import {
  executeApiHandler,
  writeAuditLog,
} from '@/lib/api';

import {
  createTransactionSessionRepository,
  requireSession,
} from '@/lib/auth';

import {
  withTransaction,
} from '@/lib/database';

export async function POST(
  request: Request,
): Promise<Response> {
  return executeApiHandler(
    request,
    async (requestContext) => {
      const requestUrl =
        new URL(request.url);

      assertTrustedRequestOrigin({
        method:
          request.method,
        origin:
          request.headers.get(
            'origin',
          ),
        expectedOrigin:
          requestUrl.origin,
      });

      const session =
        await requireSession(
          request,
          requestContext
            .correlationId,
        );

      const revoked =
        await withTransaction(
          async (transaction) => {
            const repository =
              createTransactionSessionRepository(
                transaction,
              );

            const didRevoke =
              await revokeSession(
                {
                  sessionId:
                    session.sessionId,
                  reason:
                    'USER_LOGOUT',
                  now:
                    requestContext
                      .receivedAt,
                },
                repository,
              );

            await writeAuditLog(
              transaction,
              {
                correlationId:
                  requestContext
                    .correlationId,
                sessionId:
                  session.sessionId,
                actorWallet:
                  session.wallet,
                actorRoles: {
                  scope:
                    'AUTHENTICATED_WALLET',
                },
                action:
                  'AUTH_SESSION_REVOKED',
                resourceType:
                  'AUTH_SESSION',
                resourceId:
                  session.sessionId,
                outcome:
                  'SUCCEEDED',
                metadata: {
                  reason:
                    'USER_LOGOUT',
                  revokedByRequest:
                    didRevoke,
                },
                createdAt:
                  requestContext
                    .receivedAt,
              },
            );

            return didRevoke;
          },
        );

      const response =
        NextResponse.json(
          {
            data: {
              authenticated:
                false,
              revoked,
            },
          },
          {
            status: 200,
            headers: {
              'x-correlation-id':
                requestContext
                  .correlationId,
              'cache-control':
                'no-store',
            },
          },
        );

      const cookie =
        getSessionCookieOptions();

      response.cookies.set(
        cookie.name,
        '',
        {
          path:
            cookie.path,
          httpOnly:
            cookie.httpOnly,
          secure:
            cookie.secure,
          sameSite:
            cookie.sameSite,
          maxAge:
            0,
          expires:
            new Date(0),
        },
      );

      return response;
    },
  );
}
