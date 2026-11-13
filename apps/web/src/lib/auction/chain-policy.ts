import {
  readAllowedIncrements,
  readAuctionTimingConfig,
  readBidConfig,
} from '@paralel/contracts';
import type { PublicClient } from 'viem';

import type {
  AuctionCreationPolicy,
} from './create-input';

export async function readAuctionCreationPolicy(
  client: PublicClient,
): Promise<AuctionCreationPolicy> {
  const [timing, bid, allowedIncrements, block] = await Promise.all([
    readAuctionTimingConfig(client),
    readBidConfig(client),
    readAllowedIncrements(client),
    client.getBlock({ blockTag: 'latest' }),
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
}
