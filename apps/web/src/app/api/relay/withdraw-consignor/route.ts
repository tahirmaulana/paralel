// @file apps/web/src/app/api/relay/withdraw-consignor/route.ts
import {
  ARBITRUM_SEPOLIA_CHAIN_ID,
  readAuction,
  readAuctionRound,
  readNonce,
} from '@paralel/contracts';
import {
  assertAuthorized,
  canWithdrawConsignor,
  createDomainError,
} from '@paralel/domain';
import type { Address } from 'viem';
import { executeApiHandler } from '@/lib/api/handler';
import { toTransactionJsonValue } from '@/lib/api/idempotency';
import {
  createPreparedRelayIntent,
  findRelayIntentForUpdate,
  type PreparedWithdrawConsignorPayload,
} from '@/lib/api/relay-intent';
import { executeRelayMutation } from '@/lib/api/relay-mutation-executor';
import { requireWorkspace } from '@/lib/auth';
import {
  parseWithdrawConsignor,
  validateWithdrawConsignorEvidence,
} from '@/lib/relay/withdraw-consignor-security';
import { readWithdrawConsignorDatabaseSnapshot } from '@/lib/relay/withdraw-consignor-snapshot';
import {
  getContractAddress,
  getRelayPublicClient,
} from '@shared/relay/client';
import {
  broadcastPreparedTransaction,
  prepareSignedWithdrawConsignor,
} from '@shared/relay/durable-withdraw-consignor';
import {
  WITHDRAW_REQUEST_TYPES,
  eip712Domain,
} from '@shared/relay/sign';

async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch (error: unknown) {
    throw createDomainError(
      'INVALID_INPUT',
      'Request body must contain valid JSON.',
      { cause: error },
    );
  }
}

export async function POST(request: Request): Promise<Response> {
  return executeApiHandler(request, async (requestContext) => {
    const authentication = await requireWorkspace(
      request,
      requestContext.correlationId,
      'USER',
    );
    const input = parseWithdrawConsignor(await readJsonBody(request));
    const consignor = authentication.actor.wallet.toLowerCase() as Address;
    const publicClient = getRelayPublicClient();
    const contractAddress = getContractAddress();

    const [auction, round, currentNonce, block] = await Promise.all([
      readAuction(publicClient, input.auctionKey),
      readAuctionRound(publicClient, input.auctionKey, input.roundNo),
      readNonce(publicClient, consignor),
      publicClient.getBlock({ blockTag: 'latest' }),
    ]);

    const evidence = validateWithdrawConsignorEvidence({
      auction,
      round,
      requestedRoundNo: input.roundNo,
      requestedNonce: input.nonce,
      currentNonce,
      authenticatedWallet: consignor,
      blockTimestamp: block.timestamp,
      expiry: input.expiry,
    });

    const signatureValid = await publicClient.verifyTypedData({
      address: consignor,
      domain: eip712Domain(
        ARBITRUM_SEPOLIA_CHAIN_ID,
        contractAddress,
      ),
      types: WITHDRAW_REQUEST_TYPES,
      primaryType: 'WithdrawRequest',
      message: {
        auctionKey: input.auctionKey,
        roundNo: input.roundNo,
        wallet: consignor,
        nonce: input.nonce,
        expiry: input.expiry,
      },
      signature: input.signature,
    });

    if (!signatureValid) {
      throw createDomainError(
        'INVALID_SIGNATURE',
        'WithdrawRequest signature is invalid.',
      );
    }

    const prepared = await prepareSignedWithdrawConsignor(publicClient, {
      auctionKey: input.auctionKey,
      roundNo: input.roundNo,
      consignor,
      nonce: input.nonce,
      expiry: input.expiry,
      signature: input.signature,
    });

    return executeRelayMutation({
      request,
      requestContext,
      authentication,
      routeKey: 'POST:/api/relay/withdraw-consignor',
      requestBody: toTransactionJsonValue({
        auctionKey: input.auctionKey,
        roundNo: input.roundNo,
        nonce: input.nonce.toString(),
        expiry: input.expiry.toString(),
        signature: input.signature,
      }),
      audit: {
        action: 'CONSIGNOR_WITHDRAWAL_RELAYED',
        resourceType: 'AUCTION',
        resourceId: null,
        metadata: toTransactionJsonValue({
          operation: 'WITHDRAW_CONSIGNOR',
          consignor,
          roundNo: input.roundNo,
        }),
      },
      prepare: async (transaction, binding) => {
        const snapshot = await readWithdrawConsignorDatabaseSnapshot(
          transaction,
          {
            auctionKey: input.auctionKey,
            roundNo: input.roundNo,
            consignorWallet: consignor,
          },
        );

        assertAuthorized(
          canWithdrawConsignor(authentication.actor, {
            auctionId: snapshot.auctionId,
            auctionCode: snapshot.auctionCode,
            status: snapshot.status,
            consignorWallet: snapshot.consignorWallet,
          }),
        );

        if (
          snapshot.auctionKey !== input.auctionKey ||
          snapshot.currentRound !== input.roundNo ||
          snapshot.consignorWallet !== evidence.consignor
        ) {
          throw createDomainError(
            'AUCTION_STATE_CHANGED',
            'Consignor settlement projection changed before persistence.',
            { retryable: true },
          );
        }

        const existing = await findRelayIntentForUpdate(
          transaction,
          snapshot.auctionId,
          'WITHDRAW_CONSIGNOR',
        );

        if (existing !== null) {
          if (
            existing.routeKey !== binding.routeKey ||
            existing.idempotencyKey !== binding.idempotencyKey ||
            existing.requestHash !== binding.requestHash
          ) {
            throw new Error(
              'Consignor settlement relay intent binding is inconsistent.',
            );
          }
          return existing;
        }

        const payload: PreparedWithdrawConsignorPayload = Object.freeze({
          version: 1,
          operation: 'WITHDRAW_CONSIGNOR',
          auctionCode: snapshot.auctionCode,
          serializedTransaction: prepared.serializedTransaction,
          derivedTxHash: prepared.txHash,
          withdrawConsignor: toTransactionJsonValue({
            auctionKey: input.auctionKey,
            roundNo: input.roundNo,
            consignor,
            nonce: input.nonce.toString(),
            expiry: input.expiry.toString(),
            signature: input.signature,
            blockTimestamp: block.timestamp.toString(),
            claimPeriodEnd: evidence.claimPeriodEnd.toString(),
            winnerStake: evidence.winnerStake.toString(),
          }),
        });

        return createPreparedRelayIntent(transaction, {
          resourceId: snapshot.auctionId,
          routeKey: binding.routeKey,
          idempotencyKey: binding.idempotencyKey,
          requestHash: binding.requestHash,
          payload,
          preparedAt: requestContext.receivedAt,
        });
      },
      broadcast: async (durablePrepared) =>
        broadcastPreparedTransaction(publicClient, durablePrepared),
      response: (decision, intent) => {
        const confirmed = decision.action === 'RETURN_CONFIRMED';
        return {
          status: confirmed ? 200 : 202,
          body: toTransactionJsonValue({
            ok: true,
            txHash: decision.txHash,
            relayStatus: intent.status,
            projectionPending: !confirmed,
            operation: 'WITHDRAW_CONSIGNOR',
          }),
          auditMetadata: toTransactionJsonValue({
            consignor,
            roundNo: input.roundNo,
            relayStatus: intent.status,
            txHash: decision.txHash,
            projectionPending: !confirmed,
          }),
        };
      },
    });
  });
}
