import {
  readAllowedIncrements,
  readAuctionTimingConfig,
  readBidConfig,
} from "@paralel/contracts";
import type { PublicClient } from "viem";

export interface AuctionCreationPolicy {
  readonly allowedIncrements: readonly bigint[];
  readonly maxIncrementBps: number;
  readonly minDurationHours: number;
  readonly maxDurationHours: number;
  readonly minOpenDelay: number;
  readonly maxOpenDelay: number;
  readonly blockTimestamp: bigint;
}

export const readAuctionCreationPolicy = async (
  client: PublicClient,
): Promise<AuctionCreationPolicy> => {
  const [
    timing,
    bid,
    allowedIncrements,
    block,
  ] = await Promise.all([
    readAuctionTimingConfig(client),
    readBidConfig(client),
    readAllowedIncrements(client),
    client.getBlock({
      blockTag: "latest",
    }),
  ]);

  return Object.freeze({
    allowedIncrements,
    maxIncrementBps: bid.maxIncrementBps,
    minDurationHours: timing.minDurationHours,
    maxDurationHours: timing.maxDurationHours,
    minOpenDelay: timing.minOpenDelay,
    maxOpenDelay: timing.maxOpenDelay,
    blockTimestamp: block.timestamp,
  });
};
