import type { Env } from "../../../../env";
import {
  json,
  methodNotAllowed,
} from "../../../../http";
import {
  readAuctionCreationPolicy,
} from "../../../../lib/contracts/auction-creation-policy";
import {
  createApplicationPublicClient,
} from "../../../../lib/contracts/public-client";

export const handleAuctionConfig = async (
  request: Request,
  env: Env,
): Promise<Response> => {
  if (request.method !== "GET") {
    return methodNotAllowed(["GET"]);
  }

  const client =
    await createApplicationPublicClient(env);

  const policy =
    await readAuctionCreationPolicy(client);

  return json({
    data: {
      allowedIncrements:
        policy.allowedIncrements.map(String),
      maxIncrementBps:
        policy.maxIncrementBps,
      minDurationHours:
        policy.minDurationHours,
      maxDurationHours:
        policy.maxDurationHours,
      minOpenDelay:
        policy.minOpenDelay,
      maxOpenDelay:
        policy.maxOpenDelay,
      blockTimestamp:
        policy.blockTimestamp.toString(),
    },
  });
};
