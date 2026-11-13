// @file apps/web/src/app/api/auction/[code]/confirm/init/route.ts
//
// Initializes the ConsignorConfirm EIP-712 signing material.
//
// This endpoint:
// - derives actor identity exclusively from the signed session;
// - verifies both approvals and the pending registration commitment;
// - reads the current on-chain Consignor nonce;
// - returns signing material with the immutable 300-second window.
//
// It does not submit a transaction or change auction lifecycle status.
import {
  ARBITRUM_SEPOLIA_CHAIN_ID,
} from '@paralel/contracts';

import {
  assertAuthorized,
  canConfirmAuction,
  createDomainError,
  isDatabaseAuctionStatus,
} from '@paralel/domain';

import {
  isAddress,
  type Address,
  type Hex,
} from 'viem';

import {
  computeAuctionKey,
} from '@/lib/auction/auction-code';

import {
  deriveConsignorSigningExpiry,
  hasRequiredConfirmApprovals,
  normalizeConfirmInitAuctionCode,
  parseConfirmInitInput,
} from '@/lib/auction/confirm-init-security';

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
  requireWorkspace,
} from '@/lib/auth';

import {
  relayAbi,
} from '@shared/relay/abi';

import {
  assertRelayConfiguration,
  getContractAddress,
  getRelayPublicClient,
} from '@shared/relay/client';

import {
  CONSIGNOR_CONFIRM_PRIMARY_TYPE,
  CONSIGNOR_CONFIRM_TYPES,
  eip712Domain,
} from '@shared/relay/sign';

type RouteContext =
  Readonly<{
    params:
      Promise<
        Readonly<{
          code: string;
        }>
      >;
  }>;

type LockedAuctionRow =
  Readonly<{
    auctionId: string;
    auctionCode: string;
    status: string;
    consignorWallet: string;
    currentRound: number;
  }>;

type ConfirmationCodeRow =
  Readonly<{
    codeHashHex: string;
    usedAt: Date | null;
  }>;

type AttestationRow =
  Readonly<{
    type: string;
  }>;

function toHex32(
  value: string,
  field: string,
): Hex {
  const normalized =
    value.toLowerCase();

  if (
    !/^[0-9a-f]{64}$/.test(
      normalized,
    )
  ) {
    throw new Error(
      `Invalid ${field} projection.`,
    );
  }

  return `0x${normalized}`;
}

async function readJsonBody(
  request: Request,
): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw createDomainError(
      'INVALID_INPUT',
      'Request body must contain valid JSON.',
    );
  }
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
        code: rawAuctionCode,
      } =
        await context.params;

      const auctionCode =
        normalizeConfirmInitAuctionCode(
          rawAuctionCode,
        );

      const rawBody =
        await readJsonBody(
          request,
        );

      parseConfirmInitInput(
        rawBody,
      );

      /*
       * Public RPC only. No relayer private key is loaded.
       *
       * The database transaction below revalidates every mutable
       * application-owned fact after this read.
       */
      const publicClient =
        getRelayPublicClient();

      const contractAddress =
        getContractAddress();

      await assertRelayConfiguration(
        publicClient,
        contractAddress,
      );

      const nonce =
        await publicClient.readContract({
          address:
            contractAddress,
          abi:
            relayAbi,
          functionName:
            'nonces',
          args: [
            authentication
              .actor
              .wallet,
          ],
        }) as bigint;

      const expiry =
        deriveConsignorSigningExpiry(
          requestContext
            .receivedAt,
        );

      return executeMutation({
        request,
        requestContext,
        authentication,
        routeKey:
          `POST:/api/auction/${auctionCode}/confirm/init`,
        requestBody:
          toTransactionJsonValue({}),
        audit: {
          action:
            'AUCTION_CONFIRMATION_INITIALIZED',
          resourceType:
            'AUCTION',
          resourceId:
            null,
          metadata:
            toTransactionJsonValue({
              auctionCode,
            }),
        },
        operation:
          async (
            transaction,
          ) => {
            const auctionRows =
              await transaction<
                LockedAuctionRow[]
              >`
                SELECT
                  a.id
                    AS "auctionId",
                  a.auction_code
                    AS "auctionCode",
                  a.status,
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
              auction.auctionCode !==
                auctionCode ||
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

            const confirmationRows =
              await transaction<
                ConfirmationCodeRow[]
              >`
                SELECT
                  encode(
                    code_hash,
                    'hex'
                  ) AS "codeHashHex",
                  used_at
                    AS "usedAt"
                FROM confirmation_codes
                WHERE
                  auction_id =
                    ${auction.auctionId}
                FOR UPDATE
              `;

            const confirmation =
              confirmationRows[0];

            const confirmationReady =
              confirmationRows.length ===
                1 &&
              confirmation !==
                undefined &&
              confirmation.usedAt ===
                null;

            const attestationRows =
              await transaction<
                AttestationRow[]
              >`
                SELECT type
                FROM attestations
                WHERE
                  auction_id =
                    ${auction.auctionId}
                  AND type IN (
                    'GUARANTOR_APPROVED',
                    'NOTARY_APPROVED'
                  )
                FOR UPDATE
              `;

            const attestationTypes =
              attestationRows.map(
                (row) =>
                  row.type,
              );

            const approvalsReady =
              hasRequiredConfirmApprovals(
                attestationTypes,
              );

            assertAuthorized(
              canConfirmAuction(
                authentication
                  .actor,
                {
                  auctionId:
                    auction
                      .auctionId,
                  auctionCode:
                    auction
                      .auctionCode,
                  status:
                    auction.status,
                  consignorWallet,
                  guarantorApproved:
                    approvalsReady &&
                    attestationTypes
                      .includes(
                        'GUARANTOR_APPROVED',
                      ),
                  notaryApproved:
                    approvalsReady &&
                    attestationTypes
                      .includes(
                        'NOTARY_APPROVED',
                      ),
                  confirmationReady,
                },
              ),
            );

            if (
              !confirmation
            ) {
              throw createDomainError(
                'AUCTION_STATE_CHANGED',
                'Auction confirmation material is not ready.',
                {
                  details: {
                    auctionCode,
                  },
                },
              );
            }

            const storedHash =
              toHex32(
                confirmation
                  .codeHashHex,
                'confirmation code hash',
              );

            /*
             * Revalidate ownership against the nonce-read identity.
             * The actor wallet is immutable for the authenticated request.
             */
            if (
              consignorWallet !==
              authentication
                .actor
                .wallet
                .toLowerCase()
            ) {
              throw createDomainError(
                'RESOURCE_FORBIDDEN',
                'Auction is not owned by the authenticated wallet.',
              );
            }

            const auctionKey =
              computeAuctionKey(
                auction
                  .auctionCode,
              );

            const domain =
              eip712Domain(
                ARBITRUM_SEPOLIA_CHAIN_ID,
                contractAddress,
              );

            return {
              status: 200,
              body:
                toTransactionJsonValue({
                  data: {
                    auctionId:
                      auction
                        .auctionId,
                    auctionCode:
                      auction
                        .auctionCode,
                    currentRound:
                      auction
                        .currentRound,
                    signer:
                      consignorWallet,
                    domain,
                    primaryType:
                      CONSIGNOR_CONFIRM_PRIMARY_TYPE,
                    types:
                      CONSIGNOR_CONFIRM_TYPES,
                    message: {
                      auctionKey,
                      confirmationCodeHash:
                        storedHash,
                      nonce:
                        nonce
                          .toString(),
                      expiry:
                        expiry
                          .toString(),
                    },
                  },
                }),
              audit: {
                resourceId:
                  auction
                    .auctionId,
                metadata:
                  toTransactionJsonValue({
                    auctionCode:
                      auction
                        .auctionCode,
                    currentRound:
                      auction
                        .currentRound,
                    signer:
                      consignorWallet,
                    nonce:
                      nonce
                        .toString(),
                    expiry:
                      expiry
                        .toString(),
                  }),
              },
            };
          },
      });
    },
  );
}
