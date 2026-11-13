import { connection } from 'next/server';
import { createDomainError } from '@paralel/domain';
import {
  dataResponse,
  executeApiHandler,
} from '@/lib/api';
import {
  requireSession,
} from '@/lib/auth';
import {
  getUserKycStatus,
} from '@/lib/db';

export async function GET(
  request: Request,
): Promise<Response> {
  await connection();

  return executeApiHandler(
    request,
    async (requestContext) => {
      const session =
        await requireSession(
          request,
          requestContext.correlationId,
        );
      const wallet = new URL(request.url).searchParams.get('wallet');
      if (!wallet || !/^0x[0-9a-fA-F]{40}$/.test(wallet)) {
        throw createDomainError(
          'INVALID_INPUT',
          'A valid wallet address is required.',
        );
      }
      if (session.wallet.toLowerCase() !== wallet.toLowerCase()) {
        throw createDomainError(
          'RESOURCE_FORBIDDEN',
          'The authenticated session does not match the connected wallet.',
        );
      }
      const kyc =
        await getUserKycStatus(
          wallet,
        );

      return dataResponse(
        {
          kycStatus: kyc.kycStatus,
        },
        requestContext.correlationId,
      );
    },
  );
}
