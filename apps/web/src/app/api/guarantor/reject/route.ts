// @file apps/web/src/app/api/guarantor/reject/route.ts
//
// Off-chain Guarantor rejection.
//
// Verifies GuarantorRejection, stores the durable attestation, and performs
// the atomic PENDING -> REJECTED application transition.
import {
  ARBITRUM_SEPOLIA_CHAIN_ID,
} from '@paralel/contracts';

import {
  assertAuthorized,
  canRejectAsGuarantor,
  createDomainError,
  isDatabaseAuctionStatus,
} from '@paralel/domain';

import {
  isAddress,
  verifyTypedData,
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
  assertGuarantorReviewSigningWindow,
  parseGuarantorRejection,
} from '@/lib/guarantor/review-security';

import {
  readAuctionManifestFrozen,
} from '@/lib/auction/manifest-snapshot';

import {
  requireWorkspace,
} from '@/lib/auth';

import {
  getContractAddress,
} from '@shared/relay/client';

import {
  computeAuctionKey,
  computeReasonHash,
  eip712Domain,
  GUARANTOR_REJECTION_TYPES,
} from '@shared/relay/sign';

type RejectionProjection =
  Readonly<{
    auctionId: string;
    auctionCode: string;
    status: string;
    currentRound: number;
    consignorWallet: string;
    guarantorPartnerId: string;
    guarantorUserId: string;
    guarantorWallet: string;
    guarantorActive: boolean;
  }>;

type ExistingAttestation =
  Readonly<{
    type: string;
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
        parseGuarantorRejection(
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

      const contractAddress =
        getContractAddress();

      return executeMutation({
        request,
        requestContext,
        authentication,

        routeKey:
          'POST:/api/guarantor/reject',

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
            reason:
              input.reason,
          }),

        audit: {
          action:
            'GUARANTOR_AUCTION_REJECTED',
          resourceType:
            'AUCTION',
          resourceId:
            input.auctionId,
          metadata:
            toTransactionJsonValue({
              attestationType:
                'GUARANTOR_REJECTED',
            }),
        },

        operation:
          async (
            transaction,
          ) => {
            const projectionRows =
              await transaction<
                RejectionProjection[]
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
                  guarantor.user_id
                    AS "guarantorUserId",
                  guarantor_user.wallet
                    AS "guarantorWallet",
                  guarantor.active
                    AS "guarantorActive"
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
                'Guarantor rejection projection is not unique.',
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
                'Guarantor rejection projection is invalid.',
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

            const manifestFrozen =
              await readAuctionManifestFrozen(
                transaction,
                {
                  auctionId:
                    projection.auctionId,
                  currentRound:
                    projection.currentRound,
                },
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

            assertAuthorized(
              canRejectAsGuarantor(
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
                  manifestFrozen:
                    manifestFrozen,
                },
              ),
            );

            if (
              !projection
                .guarantorActive
            ) {
              throw createDomainError(
                'PARTNER_INACTIVE',
                'Assigned Guarantor is not active.',
              );
            }

            const existingRows =
              await transaction<
                ExistingAttestation[]
              >`
                SELECT type
                FROM attestations
                WHERE
                  auction_id =
                    ${projection.auctionId}
                  AND type IN (
                    'GUARANTOR_APPROVED',
                    'GUARANTOR_REJECTED'
                  )
                FOR UPDATE
              `;

            if (
              existingRows.length !== 0
            ) {
              throw createDomainError(
                'ALREADY_PROCESSED',
                'Guarantor review has already been submitted for this auction.',
                {
                  details: {
                    auctionId:
                      projection
                        .auctionId,
                    existingTypes:
                      existingRows.map(
                        (row) =>
                          row.type,
                      ),
                  },
                },
              );
            }

            const auctionKey =
              computeAuctionKey(
                projection
                  .auctionCode,
              );

            const reasonHash =
              computeReasonHash(
                input.reason,
              );

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
                  GUARANTOR_REJECTION_TYPES,

                primaryType:
                  'GuarantorRejection',

                message: {
                  auctionKey,
                  reasonHash,
                  nonce:
                    input.nonce,
                  expiry:
                    input.expiry,
                },

                signature:
                  input.signature,
              });

            if (
              !signatureValid
            ) {
              throw createDomainError(
                'INVALID_SIGNATURE',
                'Guarantor rejection signature is invalid.',
              );
            }

            const now =
              requestContext
                .receivedAt;

            const updated =
              await transaction<
                Array<{
                  id: string;
                }>
              >`
                UPDATE auctions
                SET
                  status =
                    'REJECTED',
                  updated_at =
                    ${now}
                WHERE
                  id =
                    ${projection.auctionId}
                  AND status =
                    'PENDING'
                RETURNING id
              `;

            if (
              updated.length !== 1
            ) {
              throw createDomainError(
                'AUCTION_STATE_CHANGED',
                'Auction state changed before Guarantor rejection.',
                {
                  retryable:
                    true,
                  details: {
                    auctionId:
                      projection
                        .auctionId,
                  },
                },
              );
            }

            const inserted =
              await transaction<
                Array<{
                  id: string;
                }>
              >`
                INSERT INTO attestations (
                  auction_id,
                  round_no,
                  type,
                  signer_wallet,
                  payload,
                  signature,
                  submitted_tx_hash,
                  created_at
                )
                VALUES (
                  ${projection.auctionId},
                  ${projection.currentRound},
                  'GUARANTOR_REJECTED',
                  ${guarantorWallet},
                  ${transaction.json({
                    auctionKey,
                    reason:
                      input.reason,
                    reasonHash,
                    nonce:
                      input.nonce
                        .toString(),
                    expiry:
                      input.expiry
                        .toString(),
                  })},
                  ${Buffer.from(
                    input.signature
                      .slice(2),
                    'hex',
                  )},
                  NULL,
                  ${now}
                )
                RETURNING id
              `;

            if (
              inserted.length !== 1
            ) {
              throw new Error(
                'Guarantor rejection attestation insert returned no record.',
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
                tx_hash,
                created_at
              )
              VALUES (
                ${projection.auctionId},
                ${projection.currentRound},
                'PENDING',
                'REJECTED',
                ${projection
                  .guarantorUserId},
                ${input.reason},
                NULL,
                ${now}
              )
            `;

            return {
              status: 200,

              body:
                toTransactionJsonValue({
                  data: {
                    ok:
                      true,
                    auctionId:
                      projection
                        .auctionId,
                    auctionCode:
                      projection
                        .auctionCode,
                    status:
                      'REJECTED',
                    attestationType:
                      'GUARANTOR_REJECTED',
                  },
                }),

              audit: {
                resourceId:
                  projection
                    .auctionId,

                metadata:
                  toTransactionJsonValue({
                    auctionCode:
                      projection
                        .auctionCode,
                    currentRound:
                      projection
                        .currentRound,
                    attestationType:
                      'GUARANTOR_REJECTED',
                    signerWallet:
                      guarantorWallet,
                    reasonHash,
                  }),
              },
            };
          },
      });
    },
  );
}
