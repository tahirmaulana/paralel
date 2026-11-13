// @file apps/web/src/app/api/relay/submit-award/route.ts
//
// Authenticated crash-safe AwardSign relay.
//
// Contract evidence, signature verification, simulation, and exact transaction
// preparation occur before PostgreSQL locks are acquired.
//
// The database transaction then:
// - resolves and locks the exact auction/current round;
// - revalidates the domain authorization boundary;
// - reuses or creates the durable SUBMIT_AWARD intent;
// - commits the exact serialized transaction before broadcast.
//
// AwardSigned event projection remains authoritative for winner and lifecycle
// finalization.
import {
  ARBITRUM_SEPOLIA_CHAIN_ID,
  readAuction,
  readAuctionRound,
  readNonce,
} from '@paralel/contracts';

import {
  assertAuthorized,
  canSignAward,
  createDomainError,
} from '@paralel/domain';

import {
  type Address,
} from 'viem';

import {
  executeApiHandler,
} from '@/lib/api/handler';

import {
  toTransactionJsonValue,
} from '@/lib/api/idempotency';

import {
  createPreparedRelayIntent,
  findRelayIntentForUpdate,
  type PreparedSubmitAwardPayload,
} from '@/lib/api/relay-intent';

import {
  executeRelayMutation,
} from '@/lib/api/relay-mutation-executor';

import {
  requireWorkspace,
} from '@/lib/auth';

import {
  validateSubmitAwardContractEvidence,
} from '@/lib/relay/submit-award-evidence';

import {
  assertSubmitAwardSigningWindow,
  parseSubmitAward,
} from '@/lib/relay/submit-award-security';

import {
  readSubmitAwardDatabaseSnapshot,
} from '@/lib/relay/submit-award-snapshot';

import {
  getContractAddress,
  getRelayPublicClient,
} from '@shared/relay/client';

import {
  broadcastPreparedTransaction,
  prepareSignedSubmitAward,
} from '@shared/relay/durable-submit-award';

import {
  AWARD_SIGN_TYPES,
  eip712Domain,
} from '@shared/relay/sign';

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
          'USER',
        );

      const input =
        parseSubmitAward(
          await readJsonBody(
            request,
          ),
        );

      const candidateWallet =
        authentication
          .actor
          .wallet
          .toLowerCase() as Address;

      const publicClient =
        getRelayPublicClient();

      const contractAddress =
        getContractAddress();

      /*
       * No PostgreSQL row lock is held during these RPC reads.
       */
      const [
        contractAuction,
        contractRound,
        currentNonce,
        latestBlock,
      ] =
        await Promise.all([
          readAuction(
            publicClient,
            input.auctionKey,
          ),
          readAuctionRound(
            publicClient,
            input.auctionKey,
            input.roundNo,
          ),
          readNonce(
            publicClient,
            candidateWallet,
          ),
          publicClient
            .getBlock({
              blockTag:
                'latest',
            }),
        ]);

      const evidence =
        validateSubmitAwardContractEvidence({
          auction:
            contractAuction,
          round:
            contractRound,
          requestedRoundNo:
            input.roundNo,
          requestedRank:
            input.rank,
          requestedNonce:
            input.nonce,
          currentNonce,
        });

      assertSubmitAwardSigningWindow({
        expiry:
          input.expiry,
        blockTimestamp:
          latestBlock.timestamp,
        awardingDeadline:
          contractRound
            .awardingDeadline,
      });

      if (
        evidence
          .activeCandidate !==
        candidateWallet
      ) {
        throw createDomainError(
          'RESOURCE_FORBIDDEN',
          'Authenticated wallet is not the active AwardSign candidate.',
          {
            details: {
              activeCandidate:
                evidence
                  .activeCandidate,
            },
          },
        );
      }

      const signatureValid =
        await publicClient
          .verifyTypedData({
            address:
              candidateWallet,
            domain:
              eip712Domain(
                ARBITRUM_SEPOLIA_CHAIN_ID,
                contractAddress,
              ),
            types:
              AWARD_SIGN_TYPES,
            primaryType:
              'AwardSign',
            message: {
              auctionKey:
                input.auctionKey,
              roundNo:
                input.roundNo,
              rank:
                input.rank,
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
          'AwardSign signature is invalid.',
        );
      }

      /*
       * Simulation, transaction request preparation, and exact transaction
       * signing also occur before the PostgreSQL transaction.
       */
      const prepared =
        await prepareSignedSubmitAward(
          publicClient,
          {
            auctionKey:
              input.auctionKey,
            roundNo:
              input.roundNo,
            rank:
              input.rank,
            nonce:
              input.nonce,
            expiry:
              input.expiry,
            signature:
              input.signature,
          },
        );

      return executeRelayMutation({
        request,
        requestContext,
        authentication,

        routeKey:
          'POST:/api/relay/submit-award',

        requestBody:
          toTransactionJsonValue({
            auctionKey:
              input.auctionKey,
            roundNo:
              input.roundNo,
            rank:
              input.rank,
            nonce:
              input.nonce
                .toString(),
            expiry:
              input.expiry
                .toString(),
            signature:
              input.signature,
          }),

        audit: {
          action:
            'AWARD_SIGNATURE_RELAYED',
          resourceType:
            'AUCTION',
          resourceId:
            null,
          metadata:
            toTransactionJsonValue({
              operation:
                'SUBMIT_AWARD',
              auctionKey:
                input.auctionKey,
              roundNo:
                input.roundNo,
              candidate:
                candidateWallet,
            }),
        },

        prepare:
          async (
            transaction,
            binding,
          ) => {
            const snapshot =
              await readSubmitAwardDatabaseSnapshot(
                transaction,
                {
                  auctionKey:
                    input.auctionKey,
                  roundNo:
                    input.roundNo,
                },
              );

            assertAuthorized(
              canSignAward(
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
                  activeCandidateWallet:
                    evidence
                      .activeCandidate,
                },
              ),
            );

            if (
              snapshot.auctionKey !==
                input.auctionKey ||
              snapshot.currentRound !==
                input.roundNo
            ) {
              throw createDomainError(
                'AUCTION_STATE_CHANGED',
                'Database auction identity changed before AwardSign persistence.',
                {
                  retryable:
                    true,
                  details: {
                    auctionId:
                      snapshot
                        .auctionId,
                  },
                },
              );
            }

            const existing =
              await findRelayIntentForUpdate(
                transaction,
                snapshot
                  .auctionId,
                'SUBMIT_AWARD',
              );

            if (
              existing !==
                null
            ) {
              if (
                existing.routeKey !==
                  binding.routeKey ||
                existing.idempotencyKey !==
                  binding.idempotencyKey ||
                existing.requestHash !==
                  binding.requestHash
              ) {
                throw new Error(
                  'AwardSign relay intent binding is inconsistent.',
                );
              }

              return existing;
            }

            const payload:
              PreparedSubmitAwardPayload =
              Object.freeze({
                version:
                  1,
                operation:
                  'SUBMIT_AWARD',
                auctionCode:
                  snapshot
                    .auctionCode,
                serializedTransaction:
                  prepared
                    .serializedTransaction,
                derivedTxHash:
                  prepared
                    .txHash,
                submitAward:
                  toTransactionJsonValue({
                    auctionKey:
                      input
                        .auctionKey,
                    roundNo:
                      input
                        .roundNo,
                    rank:
                      input.rank,
                    candidate:
                      candidateWallet,
                    nonce:
                      input
                        .nonce
                        .toString(),
                    expiry:
                      input
                        .expiry
                        .toString(),
                    signature:
                      input
                        .signature,
                    blockTimestamp:
                      latestBlock
                        .timestamp
                        .toString(),
                    awardingDeadline:
                      contractRound
                        .awardingDeadline
                        .toString(),
                  }),
              });

            return createPreparedRelayIntent(
              transaction,
              {
                resourceId:
                  snapshot
                    .auctionId,
                routeKey:
                  binding.routeKey,
                idempotencyKey:
                  binding
                    .idempotencyKey,
                requestHash:
                  binding
                    .requestHash,
                payload,
                preparedAt:
                  requestContext
                    .receivedAt,
              },
            );
          },

        broadcast:
          async (
            durablePrepared,
          ) =>
            broadcastPreparedTransaction(
              publicClient,
              durablePrepared,
            ),

        response:
          (
            decision,
            intent,
          ) => {
            const confirmed =
              decision.action ===
                'RETURN_CONFIRMED';

            /*
             * Keep the legacy top-level ok/txHash shape consumed by
             * RelayedPanel while adding durable relay state.
             */
            return {
              status:
                confirmed
                  ? 200
                  : 202,

              body:
                toTransactionJsonValue({
                  ok:
                    true,
                  txHash:
                    decision.txHash,
                  relayStatus:
                    intent.status,
                  projectionPending:
                    !confirmed,
                  operation:
                    'SUBMIT_AWARD',
                }),

              auditMetadata:
                toTransactionJsonValue({
                  operation:
                    'SUBMIT_AWARD',
                  relayStatus:
                    intent.status,
                  txHash:
                    decision.txHash,
                  projectionPending:
                    !confirmed,
                  candidate:
                    candidateWallet,
                  roundNo:
                    input.roundNo,
                  rank:
                    input.rank,
                }),
            };
          },
      });
    },
  );
}
