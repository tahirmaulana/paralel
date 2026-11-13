// @file apps/web/src/app/api/guarantor/approve/route.ts
//
// Off-chain Guarantor approval.
//
// This route verifies the signed GuarantorApproval and stores one durable
// attestation. The auction remains PENDING until Notary approval and
// Consignor confirmation complete the pre-registration workflow.
import {
  ARBITRUM_SEPOLIA_CHAIN_ID,
} from '@paralel/contracts';

import {
  assertAuthorized,
  canApproveAsGuarantor,
  createDomainError,
  isDatabaseAuctionStatus,
} from '@paralel/domain';

import {
  isAddress,
  verifyTypedData,
  type Address,
  type Hex,
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
  parseGuarantorApproval,
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
  eip712Domain,
  GUARANTOR_APPROVAL_TYPES,
} from '@shared/relay/sign';

type ApprovalProjection =
  Readonly<{
    auctionId: string;
    auctionCode: string;
    status: string;
    currentRound: number;
    consignorWallet: string;
    guarantorPartnerId: string;
    guarantorWallet: string;
    guarantorActive: boolean;
    specHash: Buffer;
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

function bytes32ToHex(
  value: Buffer,
  field: string,
): Hex {
  if (
    value.byteLength !== 32
  ) {
    throw new Error(
      `Invalid ${field} projection.`,
    );
  }

  return `0x${value.toString('hex')}`;
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
        parseGuarantorApproval(
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
          'POST:/api/guarantor/approve',

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
            'GUARANTOR_AUCTION_APPROVED',
          resourceType:
            'AUCTION',
          resourceId:
            input.auctionId,
          metadata:
            toTransactionJsonValue({
              attestationType:
                'GUARANTOR_APPROVED',
            }),
        },

        operation:
          async (
            transaction,
          ) => {
            const projectionRows =
              await transaction<
                ApprovalProjection[]
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
                    AS "guarantorWallet",
                  guarantor.active
                    AS "guarantorActive",
                  asset.spec_hash
                    AS "specHash"
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
                JOIN auction_assets asset
                  ON asset.auction_id =
                    a.id
                WHERE
                  a.id =
                    ${input.auctionId}
                FOR UPDATE OF
                  a,
                  consignor,
                  guarantor,
                  guarantor_user,
                  asset
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
                'Guarantor approval projection is not unique.',
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
                'Guarantor approval projection is invalid.',
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

            /*
             * Domain authorization validates:
             * - authenticated synchronized Guarantor role;
             * - exact partner assignment;
             * - active partner lifecycle;
             * - PENDING auction status;
             * - frozen canonical manifest.
             */
            assertAuthorized(
              canApproveAsGuarantor(
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

            const specHash =
              bytes32ToHex(
                projection.specHash,
                'asset specification hash',
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
                  GUARANTOR_APPROVAL_TYPES,

                primaryType:
                  'GuarantorApproval',

                message: {
                  auctionKey,
                  specHash,
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
                'Guarantor approval signature is invalid.',
              );
            }

            const now =
              requestContext
                .receivedAt;

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
                  'GUARANTOR_APPROVED',
                  ${guarantorWallet},
                  ${transaction.json({
                    auctionKey,
                    specHash,
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
                ON CONFLICT DO NOTHING
                RETURNING id
              `;

            if (
              inserted.length !== 1
            ) {
              throw createDomainError(
                'ALREADY_PROCESSED',
                'Guarantor approval lost the concurrent review race.',
                {
                  details: {
                    auctionId:
                      projection
                        .auctionId,
                  },
                },
              );
            }

            await transaction`
              UPDATE auctions
              SET
                updated_at =
                  ${now}
              WHERE
                id =
                  ${projection.auctionId}
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
                      projection.status,
                    attestationType:
                      'GUARANTOR_APPROVED',
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
                      'GUARANTOR_APPROVED',
                    signerWallet:
                      guarantorWallet,
                  }),
              },
            };
          },
      });
    },
  );
}
