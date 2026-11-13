// @file apps/web/src/app/api/guarantor/data/route.ts
//
// Signed-session Guarantor dashboard data.
//
// All lists are scoped to the authenticated synchronized Guarantor partner.
// Missing canonical deadlines remain null and are never approximated from
// unrelated timestamps.
import {
  createDomainError,
} from '@paralel/domain';

import {
  dataResponse,
  executeApiHandler,
} from '@/lib/api';

import {
  requireWorkspace,
} from '@/lib/auth';

import {
  getGuarantorByWallet,
  getGuarantorCollection,
  getGuarantorHistory,
  getGuarantorRun,
  getGuarantorSubmission,
  getGuarantorWithdrawal,
} from '@/lib/db';

export async function GET(
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

      const guarantor =
        await getGuarantorByWallet(
          authentication
            .actor
            .wallet,
        );

      if (!guarantor) {
        throw createDomainError(
          'PARTNER_INACTIVE',
          'Authenticated Guarantor registry is unavailable.',
        );
      }

      const [
        submission,
        collection,
        withdrawal,
        run,
        history,
      ] =
        await Promise.all([
          getGuarantorSubmission(
            guarantor.partnerId,
          ),
          getGuarantorCollection(
            guarantor.partnerId,
          ),
          getGuarantorWithdrawal(
            guarantor.partnerId,
          ),
          getGuarantorRun(
          ),
          getGuarantorHistory(
            guarantor.partnerId,
          ),
        ]);

      return dataResponse(
        {
          submission:
            submission.map(
              (row) => ({
                auctionId:
                  row.auctionId,
                auctionCode:
                  row.auctionCode,
                auctionKey:
                  row.auctionKey,
                title:
                  row.title,
                consignorWallet:
                  row.consignorWallet,
                startingBid:
                  row.startingBid
                    .toString(),
                pendingAt:
                  row.pendingAt
                    ?.toISOString() ??
                  null,
                specHash:
                  row.specHash,
                hasGuarantorApproval:
                  row
                    .hasGuarantorApproval,
                hasNotaryApproval:
                  row
                    .hasNotaryApproval,
              }),
            ),

          collection:
            collection.map(
              (row) => ({
                auctionId:
                  row.auctionId,
                auctionCode:
                  row.auctionCode,
                auctionKey:
                  row.auctionKey,
                title:
                  row.title,
                currentRound:
                  row.currentRound,
                winnerWallet:
                  row.winnerWallet,
                winnerStake:
                  row.winnerStake
                    ?.toString() ??
                  null,

                /*
                 * UNKNOWN until a canonical collection deadline
                 * projection is available from Neon.
                 */
                collectionDeadline:
                  null,

                updatedAt:
                  row.updatedAt
                    .toISOString(),
              }),
            ),

          withdrawal:
            withdrawal.map(
              (row) => ({
                auctionId:
                  row.auctionId,
                auctionCode:
                  row.auctionCode,
                auctionKey:
                  row.auctionKey,
                title:
                  row.title,
                currentRound:
                  row.currentRound,
                consignorWallet:
                  row.consignorWallet,
                updatedAt:
                  row.updatedAt
                    .toISOString(),
              }),
            ),

          run:
            run.map(
              (row) => ({
                auctionId:
                  row.auctionId,
                auctionCode:
                  row.auctionCode,
                title:
                  row.title,
                status:
                  row.status,
                currentRound:
                  row.currentRound,
                startingBid:
                  row.startingBid
                    .toString(),
                currentBid:
                  row.currentBid
                    .toString(),
                openAt:
                  row.openAt
                    .toISOString(),
                closeAt:
                  row.closeAt
                    .toISOString(),
                bidCount:
                  row.bidCount,
                updatedAt:
                  row.updatedAt
                    .toISOString(),
              }),
            ),

          history:
            history.map(
              (row) => ({
                auctionId:
                  row.auctionId,
                auctionCode:
                  row.auctionCode,
                title:
                  row.title,
                status:
                  row.status,
                updatedAt:
                  row.updatedAt
                    .toISOString(),
              }),
            ),
        },
        requestContext
          .correlationId,
      );
    },
  );
}
