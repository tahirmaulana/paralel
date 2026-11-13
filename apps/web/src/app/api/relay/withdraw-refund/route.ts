// @file apps/web/src/app/api/relay/withdraw-refund/route.ts
//
// Authenticated crash-safe refund withdrawal relay.
import {
  ARBITRUM_SEPOLIA_CHAIN_ID,
  readAuction,
  readAuctionRound,
  readBidderStake,
  readNonce,
  readRefundableAmount,
} from '@paralel/contracts';

import {
  assertAuthorized,
  canWithdrawRefund,
  createDomainError,
} from '@paralel/domain';

import {
  zeroAddress,
  type Address,
} from 'viem';

import {
  executeApiHandler,
} from '@/lib/api/handler';

import {
  toTransactionJsonValue,
} from '@/lib/api/idempotency';

import {
  createOrReplacePreparedRelayIntent,
  findRelayIntentForUpdate,
  type PreparedWithdrawRefundPayload,
} from '@/lib/api/relay-intent';

import {
  executeRelayMutation,
} from '@/lib/api/relay-mutation-executor';

import {
  requireWorkspace,
} from '@/lib/auth';

import {
  assertWithdrawRefundSigningWindow,
  parseWithdrawRefund,
} from '@/lib/relay/withdraw-refund-security';

import {
  readWithdrawRefundDatabaseSnapshot,
} from '@/lib/relay/withdraw-refund-snapshot';

import {
  getContractAddress,
  getRelayPublicClient,
} from '@shared/relay/client';

import {
  broadcastPreparedTransaction,
  prepareSignedWithdrawRefund,
} from '@shared/relay/durable-withdraw-refund';

import {
  WITHDRAW_REQUEST_TYPES,
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
        parseWithdrawRefund(
          await readJsonBody(
            request,
          ),
        );

      const bidder =
        authentication
          .actor
          .wallet
          .toLowerCase() as Address;

      const publicClient =
        getRelayPublicClient();

      const contractAddress =
        getContractAddress();

      const [
        auction,
        round,
        stake,
        refundable,
        nonce,
        block,
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
          readBidderStake(
            publicClient,
            {
              auctionKey:
                input.auctionKey,
              roundNo:
                input.roundNo,
              bidder,
            },
          ),
          readRefundableAmount(
            publicClient,
            {
              auctionKey:
                input.auctionKey,
              roundNo:
                input.roundNo,
              bidder,
            },
          ),
          readNonce(
            publicClient,
            bidder,
          ),
          publicClient.getBlock({
            blockTag:
              'latest',
          }),
        ]);

      assertWithdrawRefundSigningWindow({
        expiry:
          input.expiry,
        blockTimestamp:
          block.timestamp,
      });

      if (
        auction.currentRound !==
          input.roundNo ||
        nonce !== input.nonce ||
        stake.myBid <= 0n ||
        stake.withdrawn ||
        refundable.net <= 0n
      ) {
        throw createDomainError(
          'AUCTION_STATE_CHANGED',
          'Refund contract state changed or no refund is available.',
          {
            retryable:
              true,
          },
        );
      }

      const winner =
        round.winner ===
          zeroAddress
          ? null
          : round.winner;

      const contractRankIndex =
        round.topRanks
          .findIndex(
            (wallet) =>
              wallet.toLowerCase() ===
              bidder,
          );

      const domainRank =
        contractRankIndex ===
          -1
          ? null
          : contractRankIndex + 1;

      const signatureValid =
        await publicClient
          .verifyTypedData({
            address:
              bidder,
            domain:
              eip712Domain(
                ARBITRUM_SEPOLIA_CHAIN_ID,
                contractAddress,
              ),
            types:
              WITHDRAW_REQUEST_TYPES,
            primaryType:
              'WithdrawRequest',
            message: {
              auctionKey:
                input.auctionKey,
              roundNo:
                input.roundNo,
              wallet:
                bidder,
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
          'WithdrawRequest signature is invalid.',
        );
      }

      const prepared =
        await prepareSignedWithdrawRefund(
          publicClient,
          {
            auctionKey:
              input.auctionKey,
            roundNo:
              input.roundNo,
            bidder,
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
          'POST:/api/relay/withdraw-refund',
        requestBody:
          toTransactionJsonValue({
            auctionKey:
              input.auctionKey,
            roundNo:
              input.roundNo,
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
            'REFUND_WITHDRAWAL_RELAYED',
          resourceType:
            'AUCTION',
          resourceId:
            null,
          metadata:
            toTransactionJsonValue({
              operation:
                'WITHDRAW_REFUND',
              bidder,
            }),
        },
        prepare:
          async (
            transaction,
            binding,
          ) => {
            const snapshot =
              await readWithdrawRefundDatabaseSnapshot(
                transaction,
                {
                  auctionKey:
                    input.auctionKey,
                  roundNo:
                    input.roundNo,
                  bidderWallet:
                    bidder,
                },
              );

            const decision =
              canWithdrawRefund(
                authentication.actor,
                {
                  auctionId:
                    snapshot.auctionId,
                  auctionCode:
                    snapshot.auctionCode,
                  status:
                    snapshot.status,
                  consignorWallet:
                    snapshot.consignorWallet,
                  winnerWallet:
                    winner,
                },
                {
                  now:
                    block.timestamp,
                  closeAt:
                    round.closeAt,
                  winner,
                  myBid:
                    stake.myBid,
                  withdrawn:
                    stake.withdrawn,
                  rank:
                    domainRank,
                  defaulted:
                    snapshot.defaulted,
                  passedIn:
                    snapshot.status ===
                      'PASSED_IN',
                },
              );

            assertAuthorized(
              decision,
            );

            if (
              snapshot.rank !==
                domainRank ||
              snapshot.myBid !==
                stake.myBid
            ) {
              throw createDomainError(
                'AUCTION_STATE_CHANGED',
                'Refund projection changed before durable persistence.',
                {
                  retryable:
                    true,
                },
              );
            }

            const existing =
              await findRelayIntentForUpdate(
                transaction,
                snapshot.auctionId,
                'WITHDRAW_REFUND',
              );

            const payload:
              PreparedWithdrawRefundPayload =
              Object.freeze({
                version:
                  1,
                operation:
                  'WITHDRAW_REFUND',
                auctionCode:
                  snapshot.auctionCode,
                serializedTransaction:
                  prepared.serializedTransaction,
                derivedTxHash:
                  prepared.txHash,
                withdrawRefund:
                  toTransactionJsonValue({
                    auctionKey:
                      input.auctionKey,
                    roundNo:
                      input.roundNo,
                    bidder,
                    nonce:
                      input.nonce
                        .toString(),
                    expiry:
                      input.expiry
                        .toString(),
                    signature:
                      input.signature,
                    gross:
                      refundable.gross
                        .toString(),
                    fee:
                      refundable.fee
                        .toString(),
                    net:
                      refundable.net
                        .toString(),
                  }),
              });

            return createOrReplacePreparedRelayIntent(
              transaction,
              existing,
              {
                resourceId:
                  snapshot.auctionId,
                routeKey:
                  binding.routeKey,
                idempotencyKey:
                  binding.idempotencyKey,
                requestHash:
                  binding.requestHash,
                payload,
                preparedAt:
                  requestContext.receivedAt,
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
                    'WITHDRAW_REFUND',
                }),
              auditMetadata:
                toTransactionJsonValue({
                  bidder,
                  roundNo:
                    input.roundNo,
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
