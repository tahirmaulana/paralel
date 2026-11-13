// @file apps/web/src/app/api/guarantor/collected/route.ts
//
// Durable Guarantor collected() relay.
//
// The route stores the exact signed transaction before broadcast.
// Auction lifecycle projection and attestation finalization remain owned
// by the authoritative on-chain event projector.
import {
  ARBITRUM_SEPOLIA_CHAIN_ID,
} from '@paralel/contracts';

import {
  assertAuthorized,
  canMarkCollected,
  createDomainError,
  isDatabaseAuctionStatus,
} from '@paralel/domain';

import {
  isAddress,
  verifyTypedData,
  type Address,
} from 'viem';

import {
  computeAuctionKey,
} from '@/lib/auction/auction-code';

import {
  executeApiHandler,
} from '@/lib/api/handler';

import {
  toTransactionJsonValue,
} from '@/lib/api/idempotency';

import {
  executeRelayMutation,
} from '@/lib/api/relay-mutation-executor';

import {
  createPreparedRelayIntent,
  findRelayIntentForUpdate,
  type PreparedMarkCollectedPayload,
} from '@/lib/api/relay-intent';

import {
  assertGuarantorReviewSigningWindow,
  parseGuarantorCollected,
} from '@/lib/guarantor/review-security';

import {
  requireWorkspace,
} from '@/lib/auth';

import {
  getContractAddress,
  getRelayPublicClient,
} from '@shared/relay/client';

import {
  broadcastPreparedTransaction,
  prepareSignedCollected,
} from '@shared/relay/durable-guarantor';

import {
  COLLECTED_TYPES,
  eip712Domain,
} from '@shared/relay/sign';

type CollectedProjection =
  Readonly<{
    auctionId: string;
    auctionCode: string;
    status: string;
    currentRound: number;
    consignorWallet: string;
    guarantorPartnerId: string;
    guarantorWallet: string;
  }>;

function normalizeAddress(
  value: string,
  field: string,
): Address {
  if (!isAddress(value)) {
    throw new Error(
      `Invalid ${field} projection.`,
    );
  }

  return value
    .toLowerCase() as Address;
}

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
          'GUARANTOR',
        );

      const input =
        parseGuarantorCollected(
          await readJsonBody(
            request,
          ),
        );

      assertGuarantorReviewSigningWindow({
        expiry:
          input.expiry,
        now:
          requestContext
            .receivedAt,
      });

      const publicClient =
        getRelayPublicClient();

      const contractAddress =
        getContractAddress();

      return executeRelayMutation({
        request,
        requestContext,
        authentication,

        routeKey:
          'POST:/api/guarantor/collected',

        requestBody:
          toTransactionJsonValue({
            auctionId:
              input.auctionId,
            signature:
              input.signature,
            nonce:
              input.nonce
                .toString(),
            expiry:
              input.expiry
                .toString(),
          }),

        audit: {
          action:
            'GUARANTOR_COLLECTION_RELAYED',
          resourceType:
            'AUCTION',
          resourceId:
            input.auctionId,
          metadata:
            toTransactionJsonValue({
              operation:
                'MARK_COLLECTED',
            }),
        },

        prepare:
          async (
            transaction,
            binding,
          ) => {
            const projectionRows =
              await transaction<
                CollectedProjection[]
              >`
                SELECT
                  a.id
                    AS "auctionId",
                  a.auction_code
                    AS "auctionCode",
                  a.status,
                  a.current_round
                    AS "currentRound",
                  consignor.wallet
                    AS "consignorWallet",
                  guarantor.id
                    AS "guarantorPartnerId",
                  guarantor_user.wallet
                    AS "guarantorWallet"
                FROM auctions a
                JOIN users consignor
                  ON consignor.id =
                    a.consignor_id
                JOIN partners guarantor
                  ON guarantor.id =
                    a.guarantor_id
                  AND guarantor.type =
                    'GUARANTOR'
                JOIN users guarantor_user
                  ON guarantor_user.id =
                    guarantor.user_id
                WHERE
                  a.id =
                    ${input.auctionId}
                FOR UPDATE OF
                  a,
                  consignor,
                  guarantor,
                  guarantor_user
              `;

            if (
              projectionRows.length === 0
            ) {
              throw createDomainError(
                'AUCTION_NOT_FOUND',
                'Auction was not found.',
                {
                  details: {
                    auctionId:
                      input.auctionId,
                  },
                },
              );
            }

            if (
              projectionRows.length !== 1
            ) {
              throw new Error(
                'Guarantor collection projection is not unique.',
              );
            }

            const projection =
              projectionRows[0];

            if (
              !projection ||
              projection.auctionId !==
                input.auctionId ||
              !isDatabaseAuctionStatus(
                projection.status,
              )
            ) {
              throw new Error(
                'Guarantor collection projection is invalid.',
              );
            }

            const consignorWallet =
              normalizeAddress(
                projection
                  .consignorWallet,
                'Consignor wallet',
              );

            const guarantorWallet =
              normalizeAddress(
                projection
                  .guarantorWallet,
                'Guarantor wallet',
              );

            if (
              guarantorWallet !==
              authentication
                .actor.wallet
                .toLowerCase()
            ) {
              throw createDomainError(
                'RESOURCE_FORBIDDEN',
                'Auction is not assigned to the authenticated Guarantor.',
              );
            }

            /*
             * A retry after PREPARED or SUBMITTED must reuse the exact
             * durable signed transaction, even if event projection has
             * already advanced the auction lifecycle.
             */
            const existingIntent =
              await findRelayIntentForUpdate(
                transaction,
                projection.auctionId,
                'MARK_COLLECTED',
              );

            if (existingIntent) {
              return existingIntent;
            }

            assertAuthorized(
              canMarkCollected(
                authentication.actor,
                {
                  auctionId:
                    projection
                      .auctionId,
                  auctionCode:
                    projection
                      .auctionCode,
                  status:
                    projection.status,
                  consignorWallet,
                  guarantorPartnerId:
                    projection
                      .guarantorPartnerId,
                  guarantorWallet,
                },
              ),
            );

            const auctionKey =
              computeAuctionKey(
                projection
                  .auctionCode,
              );

            const onchainNonce =
              await publicClient
                .readContract({
                  address:
                    contractAddress,
                  abi: (
                    await import(
                      '@shared/relay/abi'
                    )
                  ).relayAbi,
                  functionName:
                    'nonces',
                  args: [
                    guarantorWallet,
                  ],
                }) as bigint;

            if (
              onchainNonce !==
              input.nonce
            ) {
              throw createDomainError(
                'AUCTION_STATE_CHANGED',
                'Guarantor nonce changed after signing initialization.',
                {
                  retryable:
                    true,
                  details: {
                    auctionId:
                      projection
                        .auctionId,
                    expectedNonce:
                      input.nonce
                        .toString(),
                    currentNonce:
                      onchainNonce
                        .toString(),
                  },
                },
              );
            }

            const signatureValid =
              await verifyTypedData({
                address:
                  guarantorWallet,

                domain:
                  eip712Domain(
                    ARBITRUM_SEPOLIA_CHAIN_ID,
                    contractAddress,
                  ),

                types:
                  COLLECTED_TYPES,

                primaryType:
                  'Collected',

                message: {
                  auctionKey,
                  roundNo:
                    projection
                      .currentRound,
                  nonce:
                    input.nonce,
                  expiry:
                    input.expiry,
                },

                signature:
                  input.signature,
              });

            if (!signatureValid) {
              throw createDomainError(
                'INVALID_SIGNATURE',
                'Guarantor collected signature is invalid.',
              );
            }

            const prepared =
              await prepareSignedCollected(
                publicClient,
                {
                  auctionKey,
                  roundNo:
                    projection
                      .currentRound,
                  guarantor:
                    guarantorWallet,
                  nonce:
                    input.nonce,
                  expiry:
                    input.expiry,
                  signature:
                    input.signature,
                },
              );

            const now =
              requestContext
                .receivedAt;

            const payload:
              PreparedMarkCollectedPayload =
              Object.freeze({
                version: 1,
                operation:
                  'MARK_COLLECTED',
                auctionCode:
                  projection
                    .auctionCode,
                serializedTransaction:
                  prepared
                    .serializedTransaction,
                derivedTxHash:
                  prepared.txHash,
                markCollected:
                  toTransactionJsonValue({
                    auctionKey,
                    roundNo:
                      projection
                        .currentRound,
                    guarantor:
                      guarantorWallet,
                    nonce:
                      input.nonce
                        .toString(),
                    expiry:
                      input.expiry
                        .toString(),
                    signature:
                      input.signature,
                  }),
              });

            /*
             * Do not add a final attestation here.
             * PREPARED proves only durable transaction preparation.
             * The indexer will finalize the attestation from chain evidence.
             */
            return createPreparedRelayIntent(
              transaction,
              {
                resourceId:
                  projection
                    .auctionId,
                routeKey:
                  binding.routeKey,
                idempotencyKey:
                  binding
                    .idempotencyKey,
                requestHash:
                  binding.requestHash,
                payload,
                preparedAt:
                  now,
              },
            );
          },

        broadcast:
          async (
            prepared,
          ) =>
            broadcastPreparedTransaction(
              publicClient,
              prepared,
            ),

        response:
          (
            decision,
            intent,
          ) => {
            const confirmed =
              decision.action ===
                'RETURN_CONFIRMED';

            return {
              status:
                confirmed
                  ? 200
                  : 202,

              body:
                toTransactionJsonValue({
                  data: {
                    ok:
                      true,
                    auctionId:
                      input.auctionId,
                    operation:
                      'MARK_COLLECTED',
                    relayStatus:
                      intent.status,
                    txHash:
                      decision.txHash,
                    projectionPending:
                      !confirmed,
                  },
                }),

              auditMetadata:
                toTransactionJsonValue({
                  auctionId:
                    input.auctionId,
                  operation:
                    'MARK_COLLECTED',
                  relayStatus:
                    intent.status,
                  txHash:
                    decision.txHash,
                  projectionPending:
                    !confirmed,
                }),
            };
          },
      });
    },
  );
}
