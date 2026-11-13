// @file apps/web/src/app/api/notary/approve/init/route.ts
//
// Signed-session phase 1 of the Notary first-to-sign approval flow.
// Returns canonical signing material without exposing the plaintext code.
import {
  assertAuthorized,
  canApproveAsNotary,
} from '@paralel/domain';

import {
  relayAbi,
} from '@shared/relay/abi';

import {
  getContractAddress,
  getRelayPublicClient,
} from '@shared/relay/client';

import {
  executeApiHandler,
  executeMutation,
  toTransactionJsonValue,
} from '@/lib/api';

import {
  requireWorkspace,
} from '@/lib/auth';

import {
  deriveNotaryApprovalSigningExpiry,
  parseNotaryApprovalInit,
} from '@/lib/notary/approval-security';

import {
  deriveNotarySigningMaterial,
  readNotaryApprovalSnapshot,
} from '@/lib/notary/approval-snapshot';

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

      const input =
        parseNotaryApprovalInit(
          await request.json(),
        );

      /*
       * RPC must not run while PostgreSQL row locks are held.
       *
       * This nonce is signing material only. The final approval route
       * must re-read and verify the exact nonce before accepting the
       * signature or writing the winning Notary attestation.
       */
      const publicClient =
        getRelayPublicClient();

      const contractAddress =
        getContractAddress();

      const nonce =
        await publicClient
          .readContract({
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
          });

      if (
        typeof nonce !==
          'bigint' ||
        nonce < 0n
      ) {
        throw new Error(
          'Canonical Notary nonce is invalid.',
        );
      }

      return executeMutation({
        request,
        requestContext,
        authentication,
        routeKey:
          'POST:/api/notary/approve/init',
        requestBody:
          toTransactionJsonValue({
            auctionId:
              input.auctionId,
          }),
        audit: {
          action:
            'NOTARY_APPROVAL_INITIALIZED',
          resourceType:
            'AUCTION',
          resourceId:
            input.auctionId,
          metadata:
            toTransactionJsonValue({
              auctionId:
                input.auctionId,
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

            const expiry =
              deriveNotaryApprovalSigningExpiry(
                requestContext
                  .receivedAt,
              );

            const signingMaterial =
              deriveNotarySigningMaterial({
                snapshot,
                notaryWallet:
                  authentication
                    .actor
                    .wallet,
                nonce,
                expiry,
              });

            return {
              status:
                200,
              body:
                toTransactionJsonValue({
                  auctionKey:
                    signingMaterial
                      .auctionKey,
                  paramsHash:
                    signingMaterial
                      .paramsHash,
                  codeHash:
                    signingMaterial
                      .codeHash,
                  nonce:
                    nonce.toString(),
                  expiry:
                    expiry.toString(),
                  derivation:
                    signingMaterial
                      .derivation,
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
                    currentRound:
                      snapshot
                        .currentRound,
                    nonce:
                      nonce.toString(),
                    expiry:
                      expiry.toString(),
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
