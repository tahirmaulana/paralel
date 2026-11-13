// @file apps/web/src/app/api/notary/approve/route.ts
//
// Signed-session phase 2 of the Notary first-to-sign approval flow.
//
// Security boundaries:
// - authenticated NOTARY wallet is authoritative;
// - body wallet authority is forbidden by strict parsing;
// - current contract nonce must equal the signed nonce;
// - signing expiry must remain inside the canonical 3600-second window;
// - auction, round, manifest, and attestations are re-read under lock;
// - signing material is reconstructed canonically;
// - EIP-712 signature must recover the authenticated Notary wallet;
// - Notary assignment, attestation, and registration commitment hash persist
//   atomically in one PostgreSQL transaction.
import {
  assertAuthorized,
  canApproveAsNotary,
  createDomainError,
} from '@paralel/domain';

import {
  verifyTypedData,
} from 'viem';

import {
  arbitrumSepolia,
} from 'viem/chains';

import {
  relayAbi,
} from '@shared/relay/abi';

import {
  getContractAddress,
  getRelayPublicClient,
} from '@shared/relay/client';

import {
  eip712Domain,
  NOTARY_APPROVAL_TYPES,
} from '@shared/relay/sign';

import {
  executeApiHandler,
  executeMutation,
  toTransactionJsonValue,
} from '@/lib/api';

import {
  requireWorkspace,
} from '@/lib/auth';

import {
  assertNotaryApprovalSigningWindow,
  normalizeNotarySignerWallet,
  parseNotaryApproval,
} from '@/lib/notary/approval-security';

import {
  deriveNotarySigningMaterial,
  readNotaryApprovalSnapshot,
} from '@/lib/notary/approval-snapshot';

type PartnerRow =
  Readonly<{
    partnerId:
      string;
  }>;

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
          'NOTARY',
        );
      const notaryWallet =
        normalizeNotarySignerWallet(
          authentication.actor.wallet,
        );

      const input =
        parseNotaryApproval(
          await request.json(),
        );

      assertNotaryApprovalSigningWindow({
        expiry:
          input.expiry,
        now:
          requestContext
            .receivedAt,
      });

      /*
       * RPC must remain outside the PostgreSQL transaction so row locks
       * are never held across a network request.
       *
       * The locked operation below binds this exact nonce to the
       * canonical snapshot and signature before any durable write.
       */
      const publicClient =
        getRelayPublicClient();

      const contractAddress =
        getContractAddress();

      const currentNonce =
        await publicClient
          .readContract({
            address:
              contractAddress,
            abi:
              relayAbi,
            functionName:
              'nonces',
            args: [
              notaryWallet,
            ],
          });

      if (
        typeof currentNonce !==
          'bigint' ||
        currentNonce < 0n
      ) {
        throw new Error(
          'Canonical Notary nonce is invalid.',
        );
      }

      if (
        currentNonce !==
        input.nonce
      ) {
        throw createDomainError(
          'INVALID_INPUT',
          'Notary signing nonce is stale.',
          {
            retryable:
              true,
            details: {
              expectedNonce:
                currentNonce
                  .toString(),
              receivedNonce:
                input.nonce
                  .toString(),
            },
          },
        );
      }

      return executeMutation({
        request,
        requestContext,
        authentication,
        routeKey:
          'POST:/api/notary/approve',
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
            'NOTARY_APPROVED',
          resourceType:
            'AUCTION',
          resourceId:
            input.auctionId,
          metadata:
            toTransactionJsonValue({
              auctionId:
                input.auctionId,
              nonce:
                input.nonce
                  .toString(),
              expiry:
                input.expiry
                  .toString(),
            }),
        },
        operation:
          async (
            transaction,
          ) => {
            const snapshot =
              await readNotaryApprovalSnapshot(
                transaction,
                input.auctionId,
              );

            assertAuthorized(
              canApproveAsNotary(
                authentication
                  .actor,
                {
                  auctionId:
                    snapshot
                      .auctionId,
                  auctionCode:
                    snapshot
                      .auctionCode,
                  status:
                    snapshot
                      .status,
                  consignorWallet:
                    snapshot
                      .consignorWallet,
                  manifestFrozen:
                    snapshot
                      .manifestFrozen,
                  guarantorApproved:
                    snapshot
                      .guarantorApproved,
                  notaryApproved:
                    snapshot
                      .notaryApproved,
                },
              ),
            );

            const partnerRows =
              await transaction<
                PartnerRow[]
              >`
                SELECT
                  p.id
                    AS "partnerId"
                FROM partners p
                JOIN users u
                  ON u.id =
                    p.user_id
                WHERE
                  LOWER(u.wallet) =
                    ${notaryWallet}
                  AND u.user_type =
                    'NOTARY'
                  AND p.type =
                    'NOTARY'
                  AND p.active =
                    TRUE
                FOR SHARE OF p, u
              `;

            if (
              partnerRows.length !==
                1 ||
              !partnerRows[0]
            ) {
              throw createDomainError(
                'PARTNER_INACTIVE',
                'Authenticated Notary registry is unavailable.',
              );
            }

            const partnerId =
              partnerRows[0]
                .partnerId;

            const signingMaterial =
              deriveNotarySigningMaterial({
                snapshot,
                notaryWallet:
                  notaryWallet,
                nonce:
                  input.nonce,
                expiry:
                  input.expiry,
              });

            const validSignature =
              await verifyTypedData({
                address:
                  notaryWallet,
                domain:
                  eip712Domain(
                    arbitrumSepolia
                      .id,
                    contractAddress,
                  ),
                types:
                  NOTARY_APPROVAL_TYPES,
                primaryType:
                  'NotaryApproval',
                message: {
                  auctionKey:
                    signingMaterial
                      .auctionKey,
                  paramsHash:
                    signingMaterial
                      .paramsHash,
                  confirmationCodeHash:
                    signingMaterial
                      .codeHash,
                  nonce:
                    signingMaterial
                      .nonce,
                  expiry:
                    signingMaterial
                      .expiry,
                },
                signature:
                  input.signature,
              });

            if (
              !validSignature
            ) {
              throw createDomainError(
                'INVALID_INPUT',
                'Notary approval signature is invalid.',
              );
            }

            const payload =
              toTransactionJsonValue({
                auctionKey:
                  signingMaterial
                    .auctionKey,
                paramsHash:
                  signingMaterial
                    .paramsHash,
                confirmationCodeHash:
                  signingMaterial
                    .codeHash,
                nonce:
                  signingMaterial
                    .nonce
                    .toString(),
                expiry:
                  signingMaterial
                    .expiry
                    .toString(),
                derivation:
                  signingMaterial
                    .derivation,
              });

            const persisted =
              await transaction<
                ReadonlyArray<
                  Readonly<{
                    auctionId:
                      string;
                  }>
                >
              >`
                WITH assigned AS (
                  UPDATE auctions
                  SET
                    notary_id =
                      ${partnerId},
                    updated_at =
                      NOW()
                  WHERE
                    id =
                      ${snapshot
                        .auctionId}
                    AND notary_id
                      IS NULL
                    AND status =
                      'PENDING'
                  RETURNING id
                ),
                attested AS (
                  INSERT INTO attestations (
                    auction_id,
                    round_no,
                    type,
                    signer_wallet,
                    payload,
                    signature
                  )
                  SELECT
                    assigned.id,
                    ${snapshot
                      .currentRound},
                    'NOTARY_APPROVED',
                    LOWER(${notaryWallet}),
                    ${transaction.json(
                      payload,
                    )}::jsonb,
                    decode(
                      substring(
                        ${input
                          .signature}
                        FROM 3
                      ),
                      'hex'
                    )
                  FROM assigned
                  RETURNING auction_id
                ),
                coded AS (
                  INSERT INTO confirmation_codes (
                    auction_id,
                    code_hash,
                    issued_by_notary,
                    signature
                  )
                  SELECT
                    attested.auction_id,
                    decode(
                      substring(
                        ${signingMaterial
                          .codeHash}
                        FROM 3
                      ),
                      'hex'
                    ),
                    ${partnerId},
                    decode(
                      substring(
                        ${input
                          .signature}
                        FROM 3
                      ),
                      'hex'
                    )
                  FROM attested
                  RETURNING auction_id
                )
                SELECT
                  coded.auction_id
                    AS "auctionId"
                FROM coded
              `;

            if (
              persisted.length !==
                1 ||
              persisted[0]
                ?.auctionId !==
                snapshot.auctionId
            ) {
              throw createDomainError(
                'AUCTION_STATE_CHANGED',
                'Another Notary already completed this approval.',
                {
                  retryable:
                    false,
                  details: {
                    auctionId:
                      snapshot
                        .auctionId,
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
                  auctionId:
                    snapshot
                      .auctionId,
                  auctionCode:
                    snapshot
                      .auctionCode,
                  currentRound:
                    snapshot
                      .currentRound,
                  notaryWallet:
                    authentication
                      .actor
                      .wallet,
                  codeHash:
                    signingMaterial
                      .codeHash,
                }),
              audit: {
                resourceId:
                  snapshot
                    .auctionId,
                metadata:
                  toTransactionJsonValue({
                    auctionId:
                      snapshot
                        .auctionId,
                    auctionCode:
                      snapshot
                        .auctionCode,
                    currentRound:
                      snapshot
                        .currentRound,
                    notaryPartnerId:
                      partnerId,
                    nonce:
                      signingMaterial
                        .nonce
                        .toString(),
                    expiry:
                      signingMaterial
                        .expiry
                        .toString(),
                    codeHash:
                      signingMaterial
                        .codeHash,
                    derivation:
                      signingMaterial
                        .derivation,
                  }),
              },
            };
          },
      });
    },
  );
}
