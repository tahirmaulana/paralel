// @file apps/web/src/app/api/notary/data/route.ts
//
// Signed-session Notary dashboard data.
//
// Submission and run lists remain global according to the canonical Notary
// workspace behavior. Collections and passed lists are scoped to the
// authenticated Notary wallet.
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
  getNotaryByWallet,
  getNotaryCollections,
  getNotaryPassedAuctions,
  getNotaryPendingApprovals,
  getNotaryRunAuctions,
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
          'NOTARY',
        );

      const notary =
        await getNotaryByWallet(
          authentication
            .actor
            .wallet,
        );

      if (!notary) {
        throw createDomainError(
          'PARTNER_INACTIVE',
          'Authenticated Notary registry is unavailable.',
        );
      }

      const [
        pending,
        collections,
        run,
        passed,
      ] =
        await Promise.all([
          getNotaryPendingApprovals(),
          getNotaryCollections(
            authentication
              .actor
              .wallet,
          ),
          getNotaryRunAuctions(),
          getNotaryPassedAuctions(
            authentication
              .actor
              .wallet,
          ),
        ]);

      return dataResponse(
        {
          pendingApprovals:
            pending.map(
              (row) => ({
                auctionId:
                  row.auctionId,
                auctionCode:
                  row.auctionCode,
                title:
                  row.title,
                startingBid:
                  row.startingBid
                    .toString(),
                bidIncrement:
                  row.bidIncrement
                    .toString(),
                openAt:
                  row.openAt
                    .toISOString(),
                durationHours:
                  row.durationHours,
                consignorWallet:
                  row.consignorWallet,
                guarantorName:
                  row.guarantorName,
                hasGuarantorApproval:
                  row
                    .hasGuarantorApproval,
                guarantorApprovedAt:
                  row
                    .guarantorApprovedAt
                    ?.toISOString() ??
                  null,
                pendingAt:
                  row.pendingAt
                    ?.toISOString() ??
                  null,
              }),
            ),

          collections:
            collections.map(
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
                winnerWallet:
                  row.winnerWallet,
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
              }),
            ),

          passed:
            passed.map(
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
