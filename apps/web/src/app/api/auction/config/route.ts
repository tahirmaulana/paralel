import { executeApiHandler } from '@/lib/api/handler';
import { readAuctionCreationPolicy } from '@/lib/auction/chain-policy';
import { getPublicClient } from '@/lib/contracts';

export async function GET(request: Request): Promise<Response> {
  return executeApiHandler(request, async () => {
    const policy = await readAuctionCreationPolicy(getPublicClient());
    return Response.json({
      data: {
        allowedIncrements: policy.allowedIncrements.map(String),
        maxIncrementBps: policy.maxIncrementBps,
        minDurationHours: policy.minDurationHours,
        maxDurationHours: policy.maxDurationHours,
        minOpenDelay: policy.minOpenDelay,
        maxOpenDelay: policy.maxOpenDelay,
        blockTimestamp: policy.blockTimestamp.toString(),
      },
    });
  });
}
