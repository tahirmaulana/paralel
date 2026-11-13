// @file apps/web/src/app/api/auction/[code]/confirm/route.ts
//
// Durable Consignor confirmation and registerAuction relay.
//
// PENDING -> REGISTERING is committed before broadcast.
// SCHEDULED remains exclusively owned by AuctionRegistered projection.
import {
  ARBITRUM_SEPOLIA_CHAIN_ID,
  readFeeConfig,
} from '@paralel/contracts';

import {
  assertAuthorized,
  canConfirmAuction,
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
  computeAuctionKey,
} from '@/lib/auction/auction-code';

import {
  buildRegisterAuctionInput,
  serializeRegisterAuctionInput,
} from '@/lib/auction/confirm-registration';

import {
  assertConfirmSigningWindow,
  parseConfirmAuctionInput,
} from '@/lib/auction/confirm-security';

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
  type PreparedRelayPayload,
} from '@/lib/api/relay-intent';

import {
  requireWorkspace,
} from '@/lib/auth';

import {
  getContractAddress,
  getRelayPublicClient,
} from '@shared/relay/client';

import {
  broadcastPreparedRegisterAuction,
  prepareSignedRegisterAuction,
} from '@shared/relay/durable-register';

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

type AuctionRow =
  Readonly<{
    auctionId: string;
    auctionCode: string;
    status: string;
    currentRound: number;
    consignorId: string;
    consignorWallet: string;
    guarantorId: string;
    guarantorWallet: string;
    guarantorActive: boolean;
  }>;

type ConfirmationRow =
  Readonly<{
    codeHash: Buffer;
    usedAt: Date | null;
  }>;

type ApprovalRow =
  Readonly<{
    type: string;
    signerWallet: string;
    signature: Buffer;
    payload: unknown;
  }>;

type NotaryPartnerRow =
  Readonly<{
    partnerId: string;
    wallet: string;
    active: boolean;
  }>;

type AssetRow =
  Readonly<{
    specHash: Buffer;
  }>;

type RoundRow =
  Readonly<{
    startingBid: bigint;
    bidIncrement: bigint;
    openAt: Date;
    durationHours: number;
  }>;

type FeeRow =
  Readonly<{
    feeConfigId: string;
    platformBps: number;
    guarantorBps: number;
    notaryBps: number;
    taxBps: number;
    defaultFeeBps: number;
    withdrawFee: string;
  }>;

function normalizeAuctionCode(
  value: unknown,
): string {
  if (
    typeof value !==
      'string'
  ) {
    throw createDomainError(
      'INVALID_INPUT',
      'Auction code is required.',
    );
  }

  const code =
    value.trim();

  if (
    code.length === 0 ||
    code.length > 64 ||
    !/^[A-Z0-9-]+$/.test(code)
  ) {
    throw createDomainError(
      'INVALID_INPUT',
      'Auction code is invalid.',
    );
  }

  return code;
}

async function readBody(
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

function assertAddress(
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
        normalizeAuctionCode(
          rawAuctionCode,
        );

      const input =
        parseConfirmAuctionInput(
          await readBody(request),
        );

      assertConfirmSigningWindow({
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

      const routeKey =
        `POST:/api/auction/${auctionCode}/confirm`;

      return executeRelayMutation({
        request,
        requestContext,
        authentication,
        routeKey,
        requestBody:
          toTransactionJsonValue({
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
            'AUCTION_REGISTRATION_RELAYED',
          resourceType:
            'AUCTION',
          resourceId:
            null,
          metadata:
            toTransactionJsonValue({
              auctionCode,
            }),
        },

        prepare:
          async (
            transaction,
            binding,
          ) => {
            const auctionRows =
              await transaction<
                AuctionRow[]
              >`
                SELECT
                  a.id
                    AS "auctionId",
                  a.auction_code
                    AS "auctionCode",
                  a.status,
                  a.current_round
                    AS "currentRound",
                  a.consignor_id
                    AS "consignorId",
                  cu.wallet
                    AS "consignorWallet",
                  a.guarantor_id
                    AS "guarantorId",
                  gu.wallet
                    AS "guarantorWallet",
                  gp.active
                    AS "guarantorActive"
                FROM auctions a
                JOIN users cu
                  ON cu.id =
                    a.consignor_id
                JOIN partners gp
                  ON gp.id =
                    a.guarantor_id
                  AND gp.type =
                    'GUARANTOR'
                JOIN users gu
                  ON gu.id =
                    gp.user_id
                WHERE
                  a.auction_code =
                    ${auctionCode}
                FOR UPDATE OF a, cu, gp, gu
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
              !isDatabaseAuctionStatus(
                auction.status,
              )
            ) {
              throw new Error(
                `Invalid auction projection for ${auctionCode}.`,
              );
            }

            const consignorWallet =
              assertAddress(
                auction.consignorWallet,
                'Consignor wallet',
              );

            if (
              consignorWallet !==
              authentication
                .actor.wallet
                .toLowerCase()
            ) {
              throw createDomainError(
                'RESOURCE_FORBIDDEN',
                'Auction is not owned by the authenticated wallet.',
              );
            }

            /*
             * REGISTERING/SCHEDULED recovery must reuse the exact
             * durable signed transaction. It must never rebuild it.
             */
            const existingIntent =
              await findRelayIntentForUpdate(
                transaction,
                auction.auctionId,
              );

            if (existingIntent) {
              return existingIntent;
            }

            const confirmationRows =
              await transaction<
                ConfirmationRow[]
              >`
                SELECT
                  code_hash
                    AS "codeHash",
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

            const approvalRows =
              await transaction<
                ApprovalRow[]
              >`
                SELECT
                  type,
                  signer_wallet
                    AS "signerWallet",
                  signature,
                  payload
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

            const guarantorApproval =
              approvalRows.find(
                (row) =>
                  row.type ===
                    'GUARANTOR_APPROVED',
              );

            const notaryApproval =
              approvalRows.find(
                (row) =>
                  row.type ===
                    'NOTARY_APPROVED',
              );

            assertAuthorized(
              canConfirmAuction(
                authentication.actor,
                {
                  auctionId:
                    auction.auctionId,
                  auctionCode:
                    auction.auctionCode,
                  status:
                    auction.status,
                  consignorWallet,
                  guarantorApproved:
                    guarantorApproval !==
                    undefined,
                  notaryApproved:
                    notaryApproval !==
                    undefined,
                  confirmationReady:
                    confirmationRows
                      .length === 1 &&
                    confirmation !==
                      undefined &&
                    confirmation
                      .usedAt === null,
                },
              ),
            );

            if (
              !confirmation ||
              !notaryApproval
            ) {
              throw createDomainError(
                'AUCTION_STATE_CHANGED',
                'Auction confirmation material is not ready.',
              );
            }

            const notaryRows =
              await transaction<
                NotaryPartnerRow[]
              >`
                SELECT
                  p.id
                    AS "partnerId",
                  u.wallet,
                  p.active
                FROM partners p
                JOIN users u
                  ON u.id =
                    p.user_id
                WHERE
                  p.type =
                    'NOTARY'
                  AND LOWER(u.wallet) =
                    ${notaryApproval
                      .signerWallet
                      .toLowerCase()}
                FOR UPDATE OF p, u
              `;

            const notary =
              notaryRows[0];

            if (
              !notary ||
              !notary.active
            ) {
              throw createDomainError(
                'PARTNER_INACTIVE',
                'Assigned Notary is not active.',
              );
            }

            if (
              !auction
                .guarantorActive
            ) {
              throw createDomainError(
                'PARTNER_INACTIVE',
                'Assigned Guarantor is not active.',
              );
            }

            const assetRows =
              await transaction<
                AssetRow[]
              >`
                SELECT
                  spec_hash
                    AS "specHash"
                FROM auction_assets
                WHERE
                  auction_id =
                    ${auction.auctionId}
                FOR UPDATE
              `;

            const roundRows =
              await transaction<
                RoundRow[]
              >`
                SELECT
                  starting_bid
                    AS "startingBid",
                  bid_increment
                    AS "bidIncrement",
                  open_at
                    AS "openAt",
                  duration_hours
                    AS "durationHours"
                FROM auction_rounds
                WHERE
                  auction_id =
                    ${auction.auctionId}
                  AND round_no =
                    ${auction.currentRound}
                FOR UPDATE
              `;

            const feeRows =
              await transaction<
                FeeRow[]
              >`
                SELECT
                  id
                    AS "feeConfigId",
                  platform_bps
                    AS "platformBps",
                  guarantor_bps
                    AS "guarantorBps",
                  notary_bps
                    AS "notaryBps",
                  tax_bps
                    AS "taxBps",
                  default_fee_bps
                    AS "defaultFeeBps",
                  withdraw_fee::text
                    AS "withdrawFee"
                FROM fee_config
                WHERE
                  effective_from <=
                    ${requestContext
                      .receivedAt}
                ORDER BY
                  effective_from DESC,
                  created_at DESC
                LIMIT 1
                FOR UPDATE
              `;

            const asset =
              assetRows[0];

            const round =
              roundRows[0];

            const chainFeeConfig =
              await readFeeConfig(
                publicClient,
              );

            let fee =
              feeRows[0];

            if (
              assetRows.length !== 1 ||
              !asset ||
              roundRows.length !== 1 ||
              !round
            ) {
              throw createDomainError(
                'INTERNAL_SERVER_ERROR',
                'Auction registration data is incomplete. Contact platform support.',
                {
                  details: {
                    auctionCode,
                    missing: [
                      ...(assetRows.length !== 1 || !asset
                        ? ['auction_asset']
                        : []),
                      ...(roundRows.length !== 1 || !round
                        ? ['current_auction_round']
                        : []),
                    ],
                  },
                },
              );
            }

            const feeMatchesChain =
              fee !== undefined &&
              fee.platformBps ===
                chainFeeConfig.platformBps &&
              fee.guarantorBps ===
                chainFeeConfig.guarantorBps &&
              fee.notaryBps ===
                chainFeeConfig.notaryBps &&
              fee.taxBps ===
                chainFeeConfig.taxBps &&
              fee.defaultFeeBps ===
                chainFeeConfig.defaultFeeBps &&
              BigInt(fee.withdrawFee) ===
                chainFeeConfig.withdrawalFee;

            /*
             * The V3 policy registry is the authoritative fee source. The
             * indexer normally creates this snapshot from AuctionRegistered,
             * but registration needs the snapshot before that event exists.
             * Project the live policy here so a healthy relayer is not blocked
             * by indexer lag or a fresh database.
             */
            if (!feeMatchesChain) {
              const projectedFeeRows =
                await transaction<
                  FeeRow[]
                >`
                  INSERT INTO fee_config (
                    platform_bps,
                    guarantor_bps,
                    notary_bps,
                    tax_bps,
                    default_fee_bps,
                    withdraw_fee,
                    effective_from,
                    source_tx_hash,
                    source_log_index,
                    created_at
                  )
                  VALUES (
                    ${chainFeeConfig.platformBps},
                    ${chainFeeConfig.guarantorBps},
                    ${chainFeeConfig.notaryBps},
                    ${chainFeeConfig.taxBps},
                    ${chainFeeConfig.defaultFeeBps},
                    ${chainFeeConfig.withdrawalFee},
                    ${requestContext.receivedAt},
                    NULL,
                    NULL,
                    ${requestContext.receivedAt}
                  )
                  RETURNING
                    id
                      AS "feeConfigId",
                    platform_bps
                      AS "platformBps",
                    guarantor_bps
                      AS "guarantorBps",
                    notary_bps
                      AS "notaryBps",
                    tax_bps
                      AS "taxBps",
                    default_fee_bps
                      AS "defaultFeeBps",
                    withdraw_fee::text
                      AS "withdrawFee"
                `;

              fee =
                projectedFeeRows[0];
            }

            if (!fee) {
              throw createDomainError(
                'INTERNAL_SERVER_ERROR',
                'The live on-chain fee configuration could not be stored. Contact platform support.',
                {
                  details: {
                    auctionCode,
                    missing: [
                      'effective_fee_configuration',
                    ],
                  },
                },
              );
            }

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
                    consignorWallet,
                  ],
                }) as bigint;

            if (
              onchainNonce !==
              input.nonce
            ) {
              throw createDomainError(
                'AUCTION_STATE_CHANGED',
                'Consignor nonce changed after signing initialization.',
                {
                  retryable:
                    true,
                  details: {
                    auctionCode,
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

            const auctionKey =
              computeAuctionKey(
                auction.auctionCode,
              );

            const confirmationCodeHash =
              bytes32ToHex(
                confirmation.codeHash,
                'confirmation code hash',
              );

            const signatureValid =
              await verifyTypedData({
                address:
                  consignorWallet,
                domain:
                  eip712Domain(
                    ARBITRUM_SEPOLIA_CHAIN_ID,
                    contractAddress,
                  ),
                types:
                  CONSIGNOR_CONFIRM_TYPES,
                primaryType:
                  CONSIGNOR_CONFIRM_PRIMARY_TYPE,
                message: {
                  auctionKey,
                  confirmationCodeHash,
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
                'Consignor confirmation signature is invalid.',
              );
            }

            const registerInput =
              buildRegisterAuctionInput({
                auctionKey,
                consignorWallet,
                guarantorWallet:
                  auction
                    .guarantorWallet,
                notaryWallet:
                  notary.wallet,
                specHash:
                  asset.specHash,
                startingBid:
                  round.startingBid,
                bidIncrement:
                  round.bidIncrement,
                openAt:
                  round.openAt,
                durationHours:
                  round.durationHours,
                confirmationCodeHash:
                  confirmation.codeHash,
                notarySignature:
                  notaryApproval
                    .signature,
                notaryPayload:
                  notaryApproval
                    .payload,
                consignorSignature:
                  input.signature,
                consignorNonce:
                  input.nonce,
                consignorExpiry:
                  input.expiry,
              });

            const prepared =
              await prepareSignedRegisterAuction(
                publicClient,
                registerInput,
              );

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
                    'REGISTERING',
                  notary_id =
                    ${notary.partnerId},
                  fee_config_id =
                    ${fee.feeConfigId},
                  updated_at =
                    ${now}
                WHERE
                  id =
                    ${auction.auctionId}
                  AND status =
                    'PENDING'
                RETURNING id
              `;

            if (
              updated.length !== 1
            ) {
              throw createDomainError(
                'AUCTION_STATE_CHANGED',
                'Auction state changed before registration preparation.',
              );
            }

            await transaction`
              UPDATE confirmation_codes
              SET
                used_at =
                  ${now}
              WHERE
                auction_id =
                  ${auction.auctionId}
                AND used_at IS NULL
            `;

            await transaction`
              INSERT INTO attestations (
                auction_id,
                round_no,
                type,
                signer_wallet,
                payload,
                signature,
                created_at
              )
              VALUES (
                ${auction.auctionId},
                ${auction.currentRound},
                'CONSIGNOR_CONFIRM',
                ${consignorWallet},
                ${transaction.json({
                  auctionKey,
                  confirmationCodeHash,
                  nonce:
                    input.nonce
                      .toString(),
                  expiry:
                    input.expiry
                      .toString(),
                })},
                ${Buffer.from(
                  input.signature.slice(2),
                  'hex',
                )},
                ${now}
              )
            `;

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
                ${auction.auctionId},
                ${auction.currentRound},
                'PENDING',
                'REGISTERING',
                ${auction.consignorId},
                NULL,
                NULL,
                ${now}
              )
            `;

            const payload:
              PreparedRelayPayload =
              Object.freeze({
                version: 1,
                operation:
                  'REGISTER_AUCTION',
                auctionCode:
                  auction.auctionCode,
                serializedTransaction:
                  prepared
                    .serializedTransaction,
                derivedTxHash:
                  prepared.txHash,
                registerAuction:
                  serializeRegisterAuctionInput(
                    registerInput,
                  ),
              });

            return createPreparedRelayIntent(
              transaction,
              {
                resourceId:
                  auction.auctionId,
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
            broadcastPreparedRegisterAuction(
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

            const txHash =
              decision.txHash;

            return {
              status:
                confirmed
                  ? 200
                  : 202,
              body:
                toTransactionJsonValue({
                  data: {
                    auctionCode,
                    status:
                      confirmed
                        ? 'SCHEDULED'
                        : 'REGISTERING',
                    relayStatus:
                      intent.status,
                    txHash,
                    projectionPending:
                      !confirmed,
                  },
                }),
              auditMetadata:
                toTransactionJsonValue({
                  auctionCode,
                  relayStatus:
                    intent.status,
                  txHash,
                  projectionPending:
                    !confirmed,
                }),
            };
          },
      });
    },
  );
}
