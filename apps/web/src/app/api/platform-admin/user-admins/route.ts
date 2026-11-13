// @file apps/web/src/app/api/platform-admin/user-admins/route.ts
//
// Signed-session Platform Admin management of the runtime User Admin registry.
//
// Environment bootstrap entries remain read-only. This route manages only
// durable database registry entries.
import {
  assertAuthorized,
  canManageUserAdmins,
  createDomainError,
} from '@paralel/domain';

import {
  dataResponse,
  executeApiHandler,
  executeMutation,
  toTransactionJsonValue,
} from '@/lib/api';

import {
  requireWorkspace,
} from '@/lib/auth';

import {
  listUserAdmins,
} from '@/lib/db';

import {
  parseAddUserAdmin,
} from '@/lib/platform-admin/user-admin-security';

type ExistingUserAdminRow =
  Readonly<{
    id:
      string;
    active:
      boolean;
  }>;

async function readJsonBody(
  request: Request,
): Promise<unknown> {
  try {
    return await request.json();
  } catch (
    error: unknown
  ) {
    throw createDomainError(
      'INVALID_INPUT',
      'Request body must contain valid JSON.',
      {
        cause:
          error,
      },
    );
  }
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
          'PLATFORM_ADMIN',
        );

      assertAuthorized(
        canManageUserAdmins(
          authentication
            .actor,
        ),
      );

      const rows =
        await listUserAdmins();

      return dataResponse(
        rows,
        requestContext
          .correlationId,
      );
    },
  );
}

export async function POST(
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
          'PLATFORM_ADMIN',
        );

      assertAuthorized(
        canManageUserAdmins(
          authentication
            .actor,
        ),
      );

      const input =
        parseAddUserAdmin(
          await readJsonBody(
            request,
          ),
        );

      if (
        input.wallet ===
        authentication
          .actor
          .wallet
          .toLowerCase()
      ) {
        throw createDomainError(
          'INVALID_INPUT',
          'Platform Admin owner wallet cannot be added as a User Admin.',
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
          'POST:/api/platform-admin/user-admins',
        requestBody:
          toTransactionJsonValue({
            wallet:
              input.wallet,
          }),
        audit: {
          action:
            'PLATFORM_ADMIN_USER_ADMIN_ADDED',
          resourceType:
            'USER_ADMIN',
          resourceId:
            input.wallet,
          metadata:
            toTransactionJsonValue({
              wallet:
                input.wallet,
            }),
        },
        operation:
          async (
            transaction,
          ) => {
            const existingRows =
              await transaction<
                ExistingUserAdminRow[]
              >`
                SELECT
                  id,
                  active
                FROM user_admins
                WHERE
                  LOWER(wallet) =
                    ${input.wallet}
                FOR UPDATE
              `;

            if (
              existingRows.length >
                1
            ) {
              throw new Error(
                'User Admin registry uniqueness projection is invalid.',
              );
            }

            const existing =
              existingRows[0];

            if (
              existing?.active ===
                true
            ) {
              throw createDomainError(
                'ALREADY_PROCESSED',
                'Wallet is already an active User Admin.',
                {
                  details: {
                    wallet:
                      input.wallet,
                  },
                },
              );
            }

            const addedBy =
              authentication
                .actor
                .wallet
                .toLowerCase();

            const result =
              existing
                ? await transaction<
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
                        TRUE,
                      added_by =
                        ${addedBy}
                    WHERE
                      id =
                        ${existing.id}
                      AND active =
                        FALSE
                    RETURNING id
                  `
                : await transaction<
                    ReadonlyArray<
                      Readonly<{
                        id:
                          string;
                      }>
                    >
                  >`
                    INSERT INTO user_admins (
                      wallet,
                      active,
                      added_by
                    )
                    VALUES (
                      ${input.wallet},
                      TRUE,
                      ${addedBy}
                    )
                    RETURNING id
                  `;

            if (
              result.length !==
                1 ||
              !result[0]
            ) {
              throw createDomainError(
                'AUCTION_STATE_CHANGED',
                'User Admin registry changed during mutation.',
                {
                  retryable:
                    true,
                  details: {
                    wallet:
                      input.wallet,
                  },
                },
              );
            }

            const mutationType =
              existing
                ? 'REACTIVATED'
                : 'CREATED';

            return {
              status:
                existing
                  ? 200
                  : 201,
              body:
                toTransactionJsonValue({
                  ok:
                    true,
                  id:
                    result[0].id,
                  wallet:
                    input.wallet,
                  active:
                    true,
                  mutationType,
                }),
              audit: {
                resourceId:
                  input.wallet,
                metadata:
                  toTransactionJsonValue({
                    registryId:
                      result[0].id,
                    wallet:
                      input.wallet,
                    mutationType,
                    addedBy,
                  }),
              },
            };
          },
      });
    },
  );
}
