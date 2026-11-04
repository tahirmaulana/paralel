// @file workers/indexer/src/index.ts — fetch event + process handlers
import { createPublicClient, http } from 'viem';
import { arbitrumSepolia } from 'viem/chains';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { chainEvents } from '../../../packages/db/src/schema';
import { desc } from 'drizzle-orm';
import { Env } from './types';
import abi from './abi.json';
import { processEvents } from './process';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
      const sqlClient = neon(env.DATABASE_URL);
      const db = drizzle(sqlClient);

      const client = createPublicClient({
        chain: arbitrumSepolia,
        transport: http(env.ARBITRUM_RPC_URL),
      });

      // Pakai `finalized` — block yang tidak akan re-org.
      const finalizedBlock = await client.getBlock({ blockTag: 'finalized' });
      const latestBlock = finalizedBlock.number;

      const latestEvent = await db.select({ blockNumber: chainEvents.blockNumber })
        .from(chainEvents)
        .orderBy(desc(chainEvents.blockNumber))
        .limit(1);

      const fromBlock = latestEvent.length > 0
        ? latestEvent[0].blockNumber + 1n
        : latestBlock - 100n;

      let insertedCount = 0;
      if (fromBlock <= latestBlock) {
        const MAX_BLOCK_RANGE = 10n; // Batas maksimal Alchemy Free Tier
          let currentFrom = fromBlock;
          const allLogs: any[] = [];
          
         // Looping mengambil data per 10 block
        while (currentFrom <= latestBlock) {
          let currentTo = currentFrom + MAX_BLOCK_RANGE - 1n;
           if (currentTo > latestBlock) currentTo = latestBlock;

           console.log(`Fetching logs dari block ${currentFrom} sampai ${currentTo}...`);

           const logs = await client.getContractEvents({
            address: env.AUCTION_CONTRACT_ADDRESS,
            abi: abi as any,
            fromBlock: currentFrom,
            toBlock: currentTo,
          });

          allLogs.push(...logs);
          currentFrom = currentTo + 1n;
        }

        if (allLogs.length > 0) {
          const eventsToInsert = await Promise.all(allLogs.map(async (log: any) => {
            const block = await client.getBlock({ blockNumber: log.blockNumber });
            const safeArgs = JSON.parse(JSON.stringify(log.args, (_k, v) =>
              typeof v === 'bigint' ? v.toString() : v
            ));
            return {
              chainId: arbitrumSepolia.id,
              blockNumber: log.blockNumber,
              blockTs: new Date(Number(block.timestamp) * 1000),
              txHash: log.transactionHash,
              logIndex: log.logIndex,
              eventName: log.eventName,
              args: safeArgs,
              processed: false,
            };
          }));
          await db.insert(chainEvents).values(eventsToInsert).onConflictDoNothing();
          insertedCount = eventsToInsert.length;
        }
      }

      const result = await processEvents(db, client);

      return new Response(JSON.stringify({
        message: 'Indexer run successful',
        fromBlock: fromBlock.toString(),
        toBlock: latestBlock.toString(),
        fetched: insertedCount,
        processed: result.processed,
        failed: result.failed,
      }), { status: 200 });

    } catch (error: any) {
      console.error(error);
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
  },
};