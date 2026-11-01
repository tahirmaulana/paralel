// @file workers/indexer/src/index.ts — Core indexer logic to sync smart contract events to Neon
import { createPublicClient, http } from 'viem';
import { arbitrumSepolia } from 'viem/chains';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { chainEvents } from '../../../packages/db/src/schema';
import { desc } from 'drizzle-orm';
import { Env } from './types';
import abi from './abi.json';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
      const sqlClient = neon(env.DATABASE_URL);
      const db = drizzle(sqlClient);

      const client = createPublicClient({
        chain: arbitrumSepolia,
        transport: http(env.ARBITRUM_RPC_URL),
      });

      // 1. Cari block terakhir dari database
      const latestEvent = await db.select({ blockNumber: chainEvents.blockNumber })
        .from(chainEvents)
        .orderBy(desc(chainEvents.blockNumber))
        .limit(1);

      const latestBlock = await client.getBlockNumber();
      const fromBlock = latestEvent.length > 0 ? BigInt(latestEvent[0].blockNumber) + 1n : latestBlock - 100n;

      if (fromBlock > latestBlock) {
        return new Response(JSON.stringify({ 
          message: 'Indexer is up to date', 
          latestBlock: latestBlock.toString() 
        }), { status: 200 });
      }

      // 2. Ambil log (event) dari Smart Contract menggunakan ABI JSON secara langsung
      const logs = await client.getContractEvents({
        address: env.AUCTION_CONTRACT_ADDRESS,
        abi: abi as any, // Casting ke any untuk menghindari error tipe viem JSON ABI
        fromBlock: fromBlock,
        toBlock: latestBlock,
      });

      // 3. Simpan ke Database
      if (logs.length > 0) {
        const eventsToInsert = await Promise.all(logs.map(async (log: any) => {
          const block = await client.getBlock({ blockNumber: log.blockNumber });
          
          // Ubah BigInt menjadi String agar aman disimpan di JSONB Postgres
          const safeArgs = JSON.parse(JSON.stringify(log.args, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
          ));

          return {
            chainId: arbitrumSepolia.id,
            blockNumber: Number(log.blockNumber),
            blockTs: new Date(Number(block.timestamp) * 1000),
            txHash: log.transactionHash,
            logIndex: log.logIndex,
            eventName: log.eventName,
            args: safeArgs,
            processed: false,
          };
        }));

        await db.insert(chainEvents).values(eventsToInsert).onConflictDoNothing();
      }

      return new Response(JSON.stringify({ 
        message: 'Indexer run successful', 
        fromBlock: fromBlock.toString(), 
        toBlock: latestBlock.toString(), 
        eventsProcessed: logs.length 
      }), { status: 200 });

    } catch (error: any) {
      console.error(error);
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
  },
};