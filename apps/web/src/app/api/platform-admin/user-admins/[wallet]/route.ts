// @file apps/web/src/app/api/platform-admin/user-admins/[wallet]/route.ts
//
// Signed-session atomic soft-deactivation of a database User Admin entry.
//
// Environment bootstrap entries are immutable through this API. A missing
// database row fails explicitly and must not be represented as deactivated.
import {
  assertAuthorized,
  canManageUserAdmins,
  createDomainError,
} from '@paralel/domain';

import {
  executeApiHandler,
  executeMutation,
  toTransactionJsonValue,
} from '@/lib/api';

import {
  requireWorkspace,
} from '@/lib/auth';

import {
  parseUserAdminWalletParameter,
} from '@/lib/platform-admin/user-admin-security';

type RouteContext =
  Readonly<{
    params:
      Promise<
        Readonly<{
          wallet:
            string;
        }>
      >;
  }>;

type LockedUserAdminRow =
  Readonly<{
    id:
      string;
    active:
      boolean;
  }>;

export async function DELETE(
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
          'PLATFORM_ADMIN',
        );

      assertAuthorized(
        canManageUserAdmins(
          authentication
            .actor,
        ),
      );

      const {
        wallet:
          rawWallet,
      } =
        await routeContext
          .params;

      const wallet =
        parseUserAdminWalletParameter(
          rawWallet,
        );

      if (
        wallet ===
        authentication
          .actor
          .wallet
          .toLowerCase()
      ) {
        throw createDomainError(
          'INVALID_INPUT',
          'Platform Admin owner wallet cannot be deactivated as a User Admin.',
          {
            details: {
              field:
                'wallet',
            },
          },
        );
      }

      return executeMutation({
        request,
        requestContext,
        authentication,
        routeKey:
          'DELETE:/api/platform-admin/user-admins/[wallet]',
        requestBody:
          toTransactionJsonValue({
            wallet,
          }),
        audit: {
          action:
            'PLATFORM_ADMIN_USER_ADMIN_DEACTIVATED',
          resourceType:
            'USER_ADMIN',
          resourceId:
            wallet,
          metadata:
            toTransactionJsonValue({
              wallet,
            }),
        },
        operation:
          async (
            transaction,
          ) => {
            const rows =
              await transaction<
                LockedUserAdminRow[]
              >`
                SELECT
                  id,
                  active
                FROM user_admins
                WHERE
                  LOWER(wallet) =
                    ${wallet}
                FOR UPDATE
              `;

            if (
              rows.length ===
                0
            ) {
              throw createDomainError(
                'INVALID_INPUT',
                'No database User Admin entry exists for the supplied wallet.',
                {
                  details: {
                    field:
                      'wallet',
                    wallet,
                    immutableBootstrapPossible:
                      true,
                  },
                },
              );
            }

            if (
              rows.length !==
                1 ||
              !rows[0]
            ) {
              throw new Error(
                'User Admin registry uniqueness projection is invalid.',
              );
            }

            const current =
              rows[0];

            if (
              current.active ===
                false
            ) {
              throw createDomainError(
                'ALREADY_PROCESSED',
                'User Admin entry is already inactive.',
                {
                  details: {
                    wallet,
                  },
                },
              );
            }

            const updated =
              await transaction<
                ReadonlyArray<
                  Readonly<{
                    id:
                      string;
                  }>
                >
              >`
                UPDATE user_admins
                SET
                  active =
                    FALSE
                WHERE
                  id =
                    ${current.id}
                  AND active =
                    TRUE
                RETURNING id
              `;

            if (
              updated.length !==
                1 ||
              updated[0]
                ?.id !==
                current.id
            ) {
              throw createDomainError(
                'AUCTION_STATE_CHANGED',
                'User Admin registry changed during deactivation.',
                {
                  retryable:
                    true,
                  details: {
                    wallet,
                  },
                },
              );
            }

            return {
              status:
                200,
              body:
                toTransactionJsonValue({
                  ok:
                    true,
                  id:
                    current.id,
                  wallet,
                  active:
                    false,
                }),
              audit: {
                resourceId:
                  wallet,
                metadata:
                  toTransactionJsonValue({
                    registryId:
                      current.id,
                    wallet,
                    active:
                      false,
                    deactivatedBy:
                      authentication
                        .actor
                        .wallet
                        .toLowerCase(),
                    deactivatedAt:
                      requestContext
                        .receivedAt,
                  }),
              },
            };
          },
      });
    },
  );
}
