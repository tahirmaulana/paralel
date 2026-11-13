import {
  ARBITRUM_SEPOLIA_CHAIN_ID,
  readAllowedIncrements,
  readAuction,
  readAuctionConfigSnapshot,
  readNonce,
} from '@paralel/contracts';
import { assertAuthorized, canReuseRound, createDomainError } from '@paralel/domain';
import { zeroHash, type Address } from 'viem';
import { executeApiHandler } from '@/lib/api/handler';
import { toTransactionJsonValue } from '@/lib/api/idempotency';
import {
  createOrReplacePreparedRelayIntent,
  findRelayIntentForUpdate,
  type PreparedReuseRoundPayload,
} from '@/lib/api/relay-intent';
import { executeRelayMutation } from '@/lib/api/relay-mutation-executor';
import { requireWorkspace } from '@/lib/auth';
import { parseReuseRound, validateReuseRoundEvidence } from '@/lib/relay/reuse-round-security';
import { readReuseRoundSnapshot } from '@/lib/relay/reuse-round-snapshot';
import { getContractAddress, getRelayPublicClient } from '@shared/relay/client';
import {
  broadcastPreparedTransaction,
  prepareSignedReuseRound,
} from '@shared/relay/durable-reuse-round';
import { CONSIGNOR_CONFIRM_TYPES, eip712Domain } from '@shared/relay/sign';

async function readJsonBody(request: Request): Promise<unknown> {
  try { return await request.json(); }
  catch (error: unknown) {
    throw createDomainError('INVALID_INPUT', 'Request body must contain valid JSON.', { cause: error });
  }
}
export async function POST(request: Request): Promise<Response> {
  return executeApiHandler(request, async (requestContext) => {
    const authentication = await requireWorkspace(request, requestContext.correlationId, 'USER');
    const input = parseReuseRound(await readJsonBody(request));
    const consignor = authentication.actor.wallet.toLowerCase() as Address;
    const publicClient = getRelayPublicClient();
    const contractAddress = getContractAddress();
    const [auction, configSnapshot, allowedIncrements, currentNonce, block] = await Promise.all([
      readAuction(publicClient, input.auctionKey),
      readAuctionConfigSnapshot(publicClient, input.auctionKey),
      readAllowedIncrements(publicClient),
      readNonce(publicClient, consignor),
      publicClient.getBlock({ blockTag: 'latest' }),
    ]);
    validateReuseRoundEvidence({
      auction,
      authenticatedWallet: consignor,
      currentNonce,
      request: input,
      blockTimestamp: block.timestamp,
      configSnapshot,
      allowedIncrements,
    });
    const signatureValid = await publicClient.verifyTypedData({
      address: consignor,
      domain: eip712Domain(ARBITRUM_SEPOLIA_CHAIN_ID, contractAddress),
      types: CONSIGNOR_CONFIRM_TYPES,
      primaryType: 'ConsignorConfirm',
      message: {
        auctionKey: input.auctionKey,
        confirmationCodeHash: zeroHash,
        nonce: input.nonce,
        expiry: input.expiry,
      },
      signature: input.signature,
    });
    if (!signatureValid) throw createDomainError('INVALID_SIGNATURE', 'ConsignorConfirm signature is invalid.');

    const prepared = await prepareSignedReuseRound(publicClient, input);
    const expectedRound = auction.currentRound;
    return executeRelayMutation({
      request,
      requestContext,
      authentication,
      routeKey: 'POST:/api/relay/reuse-round',
      requestBody: toTransactionJsonValue({
        auctionKey: input.auctionKey,
        startingBid: input.startingBid.toString(),
        bidIncrement: input.bidIncrement.toString(),
        openAt: input.openAt.toString(),
        durationHours: input.durationHours,
        nonce: input.nonce.toString(),
        expiry: input.expiry.toString(),
        signature: input.signature,
      }),
      audit: {
        action: 'AUCTION_ROUND_REUSE_RELAYED',
        resourceType: 'AUCTION',
        resourceId: null,
        metadata: toTransactionJsonValue({ operation: 'REUSE_ROUND', consignor }),
      },
      prepare: async (transaction, binding) => {
        const snapshot = await readReuseRoundSnapshot(transaction, {
          auctionKey: input.auctionKey,
          expectedRound,
          consignorWallet: consignor,
        });
        assertAuthorized(canReuseRound(authentication.actor, {
          auctionId: snapshot.auctionId,
          auctionCode: snapshot.auctionCode,
          status: 'PASSED_IN',
          consignorWallet: snapshot.consignorWallet,
        }));
        const existing = await findRelayIntentForUpdate(
          transaction, snapshot.auctionId, 'REUSE_ROUND',
        );
        const payload: PreparedReuseRoundPayload = Object.freeze({
          version: 1,
          operation: 'REUSE_ROUND',
          auctionCode: snapshot.auctionCode,
          serializedTransaction: prepared.serializedTransaction,
          derivedTxHash: prepared.txHash,
          reuseRound: toTransactionJsonValue({
            auctionKey: input.auctionKey,
            previousRoundNo: snapshot.currentRound,
            expectedRoundNo: snapshot.currentRound + 1,
            startingBid: input.startingBid.toString(),
            bidIncrement: input.bidIncrement.toString(),
            openAt: input.openAt.toString(),
            durationHours: input.durationHours,
            nonce: input.nonce.toString(),
            expiry: input.expiry.toString(),
            signature: input.signature,
            blockTimestamp: block.timestamp.toString(),
          }),
        });
        return createOrReplacePreparedRelayIntent(transaction, existing, {
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
            operation: 'REUSE_ROUND',
            expectedRoundNo: expectedRound + 1,
          }),
          auditMetadata: toTransactionJsonValue({
            consignor,
            relayStatus: intent.status,
            txHash: decision.txHash,
            projectionPending: !confirmed,
          }),
        };
      },
    });
  });
}
