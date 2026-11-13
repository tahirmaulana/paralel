// @file apps/web/src/app/api/auction/[code]/submit/route.ts
//
// Canonical CREATED -> PENDING transition.
//
// Actor comes exclusively from the signed session.
// Submission freezes the current transactional manifest and starts the
// 48-hour PENDING deadline.
//
// No contract transaction occurs at this phase.
import {
  assertAuthorized,
  canSubmitAuction,
  createDomainError,
  isDatabaseAuctionStatus,
} from '@paralel/domain';

import {
  isAddress,
  type Address,
} from 'viem';

import {
  executeApiHandler,
} from '@/lib/api/handler';

import {
  toTransactionJsonValue,
} from '@/lib/api/idempotency';

import {
  executeMutation,
} from '@/lib/api/mutation-executor';

import {
  assertEmptySubmitBody,
  derivePendingWindow,
  normalizeSubmitAuctionCode,
} from '@/lib/auction/submit-security';

import {
  readAuctionManifestFrozen,
} from '@/lib/auction/manifest-snapshot';

import {
  requireWorkspace,
} from '@/lib/auth';

type RouteContext =
  Readonly<{
    params:
      Promise<
        Readonly<{
          code: string;
        }>
      >;
  }>;

type LockedAuction =
  Readonly<{
    id: string;
    auctionCode: string;
    status: string;
    consignorId: string;
    consignorWallet: string;
    currentRound: number;
  }>;

async function requireEmptyBody(
  request: Request,
): Promise<
  Readonly<Record<string, never>>
> {
  let value: unknown;

  try {
    value =
      await request.json();
  } catch {
    throw createDomainError(
      'INVALID_INPUT',
      'Request body must contain valid JSON.',
    );
  }

  assertEmptySubmitBody(
    value,
  );

  return value;
}

export async function POST(
  request: Request,
  context: RouteContext,
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
          'USER',
        );

      const {
        code: rawCode,
      } =
        await context.params;

      const auctionCode =
        normalizeSubmitAuctionCode(
          rawCode,
        );

      const requestBody =
        await requireEmptyBody(
          request,
        );

      return executeMutation({
        request,
        requestContext,
        authentication,
        routeKey:
          `POST:/api/auction/${auctionCode}/submit`,
        requestBody:
          toTransactionJsonValue(
            requestBody,
          ),
        audit: {
          action:
            'AUCTION_SUBMITTED',
          resourceType:
            'AUCTION',
          resourceId:
            null,
          metadata:
            toTransactionJsonValue({
              auctionCode,
              fromStatus:
                'CREATED',
              toStatus:
                'PENDING',
            }),
        },
        operation:
          async (
            transaction,
          ) => {
            const auctionRows =
              await transaction<
                LockedAuction[]
              >`
                SELECT
                  a.id,
                  a.auction_code
                    AS "auctionCode",
                  a.status,
                  a.consignor_id
                    AS "consignorId",
                  u.wallet
                    AS "consignorWallet",
                  a.current_round
                    AS "currentRound"
                FROM auctions a
                JOIN users u
                  ON u.id =
                    a.consignor_id
                WHERE
                  a.auction_code =
                    ${auctionCode}
                FOR UPDATE OF a, u
              `;

            const auction =
              auctionRows[0];

            if (!auction) {
              throw createDomainError(
                'AUCTION_NOT_FOUND',
                'Auction was not found.',
                {
                  details: {
                    auctionCode,
                  },
                },
              );
            }

            if (
              !isAddress(
                auction
                  .consignorWallet,
              ) ||
              !isDatabaseAuctionStatus(
                auction.status,
              )
            ) {
              throw new Error(
                `Invalid auction projection for ${auctionCode}.`,
              );
            }

            const consignorWallet =
              auction
                .consignorWallet
                .toLowerCase() as Address;

            const auctionStatus =
              auction.status;

            if (
              auction.auctionCode !==
              auctionCode
            ) {
              throw new Error(
                `Auction code projection mismatch for ${auctionCode}.`,
              );
            }

            const manifestFrozen =
              await readAuctionManifestFrozen(
                transaction,
                {
                  auctionId:
                    auction.id,
                  currentRound:
                    auction.currentRound,
                },
              );

            assertAuthorized(
              canSubmitAuction(
                authentication
                  .actor,
                {
                  auctionId:
                    auction.id,
                  auctionCode:
                    auction
                      .auctionCode,
                  consignorWallet,
                  status:
                    auctionStatus,
                  manifestFrozen,
                },
              ),
            );

            const {
              pendingAt,
              pendingDeadline,
            } =
              derivePendingWindow(
                requestContext
                  .receivedAt,
              );

            const updatedRows =
              await transaction<
                Array<{
                  id: string;
                }>
              >`
                UPDATE auctions
                SET
                  status =
                    'PENDING',
                  pending_at =
                    ${pendingAt},
                  pending_deadline =
                    ${pendingDeadline},
                  updated_at =
                    ${pendingAt}
                WHERE
                  id =
                    ${auction.id}
                  AND status =
                    'CREATED'
                RETURNING id
              `;

            if (
              updatedRows.length !==
              1
            ) {
              throw createDomainError(
                'AUCTION_STATE_CHANGED',
                'Auction state changed before submission completed.',
                {
                  retryable:
                    true,
                  details: {
                    auctionCode,
                    expectedStatus:
                      'CREATED',
                  },
                },
              );
            }

            await transaction`
              INSERT INTO status_log (
                auction_id,
                round_no,
                from_status,
                to_status,
                actor_user_id,
                reason,
                tx_hash
              ) VALUES (
                ${auction.id},
                ${auction.currentRound},
                'CREATED',
                'PENDING',
                ${auction.consignorId},
                NULL,
                NULL
              )
            `;

            return {
              status: 200,
              body:
                toTransactionJsonValue({
                  data: {
                    auctionId:
                      auction.id,
                    auctionCode,
                    status:
                      'PENDING',
                    currentRound:
                      auction.currentRound,
                    pendingAt:
                      pendingAt
                        .toISOString(),
                    pendingDeadline:
                      pendingDeadline
                        .toISOString(),
                  },
                }),
              audit: {
                resourceId:
                  auction.id,
                metadata:
                  toTransactionJsonValue({
                    auctionCode,
                    currentRound:
                      auction
                        .currentRound,
                    fromStatus:
                      'CREATED',
                    toStatus:
                      'PENDING',
                    pendingAt,
                    pendingDeadline,
                  }),
              },
            };
          },
      });
    },
  );
}
