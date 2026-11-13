// @file apps/web/src/app/api/user/data/route.ts

import {
  connection,
} from 'next/server';

import {
  dataResponse,
  executeApiHandler,
} from '@/lib/api';

import {
  requireWorkspace,
} from '@/lib/auth';

import {
  serializeUserData,
} from '@/lib/user/data-response';

import {
  getUserCreatedAuctions,
  getUserJoinedAuctions,
  getUserKycStatus,
  getUserLiveAuctions,
} from '@/lib/db';

export async function GET(
  request: Request,
): Promise<Response> {
  await connection();

  return executeApiHandler(
    request,
    async (requestContext) => {
      const authentication =
        await requireWorkspace(
          request,
          requestContext.correlationId,
          'USER',
        );

      const wallet =
        authentication.actor.wallet;

      const [
        kyc,
        liveAuctions,
        joinedAuctions,
        createdAuctions,
      ] = await Promise.all([
        getUserKycStatus(
          wallet,
        ),
        getUserLiveAuctions(
          wallet,
        ),
        getUserJoinedAuctions(
          wallet,
        ),
        getUserCreatedAuctions(
          wallet,
        ),
      ]);

      return dataResponse(
        serializeUserData({
          kycStatus:
            kyc.kycStatus,
          adminComment:
            kyc.adminComment,
          verifiedAt:
            kyc.verifiedAt,
          liveAuctions,
          joinedAuctions,
          createdAuctions,
        }),
        requestContext.correlationId,
      );
    },
  );
}
