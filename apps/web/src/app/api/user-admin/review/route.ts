// @file apps/web/src/app/api/user-admin/review/route.ts
//
// Atomic User Admin KYC review.
//
// The authenticated session is the only admin authority. The target KYC row
// is locked, reviewed, updated, idempotently recorded, and audited inside one
// canonical mutation transaction.
import {
  assertAuthorized,
  canReviewKyc,
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
  parseKycReview,
} from '@/lib/user-admin/review-security';

type LockedKycRow =
  Readonly<{
    userId:
      string;
    currentStatus:
      'UNVERIFIED' |
      'VERIFIED';
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
          'USER_ADMIN',
        );

      assertAuthorized(
        canReviewKyc(
          authentication
            .actor,
        ),
      );

      const input =
        parseKycReview(
          await readJsonBody(
            request,
          ),
        );

      return executeMutation({
        request,
        requestContext,
        authentication,
        routeKey:
          'POST:/api/user-admin/review',
        requestBody:
          toTransactionJsonValue({
            userId:
              input.userId,
            status:
              input.status,
            comment:
              input.comment,
          }),
        audit: {
          action:
            'USER_ADMIN_KYC_REVIEWED',
          resourceType:
            'USER',
          resourceId:
            input.userId,
          metadata:
            toTransactionJsonValue({
              requestedStatus:
                input.status,
            }),
        },
        operation:
          async (
            transaction,
          ) => {
            const rows =
              await transaction<
                LockedKycRow[]
              >`
                SELECT
                  k.user_id
                    AS "userId",
                  k.status
                    AS "currentStatus"
                FROM kyc_profiles k
                JOIN users u
                  ON u.id = k.user_id
                WHERE
                  k.user_id =
                    ${input.userId}
                  AND u.user_type =
                    'PUBLIC'
                FOR UPDATE OF k, u
              `;

            if (
              rows.length ===
                0
            ) {
              throw createDomainError(
                'INVALID_INPUT',
                'No KYC profile exists for the supplied User ID.',
                {
                  details: {
                    field:
                      'userId',
                    userId:
                      input.userId,
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
                'KYC profile uniqueness projection is invalid.',
              );
            }

            const current =
              rows[0];

            if (
              current.currentStatus !==
                'UNVERIFIED' &&
              current.currentStatus !==
                'VERIFIED'
            ) {
              throw new Error(
                'KYC status projection is invalid.',
              );
            }

            if (
              current.currentStatus ===
                input.status
            ) {
              throw createDomainError(
                'ALREADY_PROCESSED',
                'KYC profile already has the requested status.',
                {
                  details: {
                    userId:
                      input.userId,
                    status:
                      input.status,
                  },
                },
              );
            }

            const now =
              requestContext
                .receivedAt;

            const updated =
              await transaction<
                ReadonlyArray<
                  Readonly<{
                    userId:
                      string;
                  }>
                >
              >`
                UPDATE kyc_profiles
                SET
                  status =
                    ${input.status},
                  admin_comment =
                    ${input.comment},
                  verified_at =
                    ${
                      input.status ===
                        'VERIFIED'
                        ? now
                        : null
                    },
                  updated_at =
                    ${now}
                WHERE
                  user_id =
                    ${input.userId}
                  AND status =
                    ${current
                      .currentStatus}
                RETURNING
                  user_id
                    AS "userId"
              `;

            if (
              updated.length !==
                1 ||
              updated[0]
                ?.userId !==
                input.userId
            ) {
              throw createDomainError(
                'AUCTION_STATE_CHANGED',
                'KYC profile changed during review.',
                {
                  retryable:
                    true,
                  details: {
                    userId:
                      input.userId,
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
                  userId:
                    input.userId,
                  previousStatus:
                    current
                      .currentStatus,
                  status:
                    input.status,
                  adminComment:
                    input.comment,
                  verifiedAt:
                    input.status ===
                      'VERIFIED'
                      ? now
                      : null,
                }),
              audit: {
                resourceId:
                  input.userId,
                metadata:
                  toTransactionJsonValue({
                    userId:
                      input.userId,
                    previousStatus:
                      current
                        .currentStatus,
                    status:
                      input.status,
                    commentProvided:
                      input.comment !==
                      null,
                    reviewedAt:
                      now,
                  }),
              },
            };
          },
      });
    },
  );
}
