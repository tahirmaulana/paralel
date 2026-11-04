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

// 1. Fungsi Utama Logika Indexer
async function runIndexer(env: Env) {
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

  // TITIK AWAL: Block sebelum kontrak di-deploy
  const START_BLOCK = 325236150n; 
  
  let fromBlock = latestEvent.length > 0
    ? latestEvent[0].blockNumber + 1n
    : START_BLOCK;

  // BATAS PER EKSEKUSI: 400 blok (Aman dari limit Cloudflare)
  const MAX_BLOCKS_PER_RUN = 400n; 
  
  let toBlock = fromBlock + MAX_BLOCKS_PER_RUN - 1n;
  if (toBlock > latestBlock) {
    toBlock = latestBlock;
  }

  let insertedCount = 0;
  
  if (fromBlock <= toBlock) {
    const MAX_BLOCK_RANGE = 10n; // Batas Alchemy Free Tier
    let currentFrom = fromBlock;
    const allLogs: any[] = [];
    
    while (currentFrom <= toBlock) {
      let currentTo = currentFrom + MAX_BLOCK_RANGE - 1n;
      if (currentTo > toBlock) currentTo = toBlock;

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

  return {
    message: 'Indexer run successful',
    fromBlock: fromBlock.toString(),
    toBlock: toBlock.toString(),
    latestFinalizedBlock: latestBlock.toString(),
    fetched: insertedCount,
    processed: result.processed,
    failed: result.failed,
    note: toBlock < latestBlock ? "Belum selesai. Menunggu putaran berikutnya." : "Sinkronisasi selesai."
  };
}

// 2. Export handler (HTTP & Cron)
export default {
  // Untuk testing manual
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
      const res = await runIndexer(env);
      return new Response(JSON.stringify(res), { status: 200 });
    } catch (error: any) {
      console.error(error);
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
  },

  // AUTOPILOT: Berjalan otomatis sesuai jadwal Cron
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    try {
      const res = await runIndexer(env);
      console.log("Cron run result:", res);
    } catch (error) {
      console.error("Cron run failed:", error);
    }
  },
};