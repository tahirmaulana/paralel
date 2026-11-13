import {
  dataResponse,
  executeApiHandler,
} from '@/lib/api';

import {
  requireSession,
} from '@/lib/auth';

export async function GET(
  request: Request,
): Promise<Response> {
  return executeApiHandler(
    request,
    async (requestContext) => {
      const session =
        await requireSession(
          request,
          requestContext
            .correlationId,
        );

      return dataResponse(
        {
          authenticated:
            true,
          sessionId:
            session.sessionId,
          wallet:
            session.wallet,
          chainId:
            session.chainId,
          issuedAt:
            session.issuedAt
              .toISOString(),
          expiresAt:
            session.expiresAt
              .toISOString(),
          generation:
            session.generation,
        },
        requestContext.correlationId,
      );
    },
  );
}
