// @file workers/indexer/src/index.ts

import { createPublicClient, http } from 'viem';
import { arbitrumSepolia } from 'viem/chains';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { chainEvents, indexerState } from '../../../packages/db/src/schema';
import { eq } from 'drizzle-orm';
import type { Env } from './types';
import abi from './abi.json';
import { processEvents } from './process';

async function getSecret(
  binding: { get(): Promise<string> },
  bindingName: string
): Promise<string> {
  const value = await binding.get();

  if (typeof value !== 'string') {
    throw new Error(
      `${bindingName} Secrets Store binding did not return a string`
    );
  }

  const normalizedValue = value.trim();

  if (!normalizedValue) {
    throw new Error(`${bindingName} is empty`);
  }

  return normalizedValue;
}

async function runIndexer(env: Env) {
  const databaseUrl = await getSecret(
    env.DATABASE_URL,
    'DATABASE_URL'
  );

  const arbitrumRpcUrl = await getSecret(
    env.ARBITRUM_RPC_URL,
    'ARBITRUM_RPC_URL'
  );

  if (
    !arbitrumRpcUrl.startsWith('https://') &&
    !arbitrumRpcUrl.startsWith('http://')
  ) {
    throw new Error(
      'ARBITRUM_RPC_URL must start with https:// or http://'
    );
  }

  if (
    !databaseUrl.startsWith('postgres://') &&
    !databaseUrl.startsWith('postgresql://')
  ) {
    throw new Error(
      'DATABASE_URL must start with postgres:// or postgresql://'
    );
  }

  const sqlClient = neon(databaseUrl);
  const db = drizzle(sqlClient);

  const client = createPublicClient({
    chain: arbitrumSepolia,
    transport: http(arbitrumRpcUrl),
  });

  const finalizedBlock = await client.getBlock({
    blockTag: 'finalized',
  });

  const latestBlock = finalizedBlock.number;

  // 1. Ambil kursor dari indexer_state
  const stateRows = await db
    .select()
    .from(indexerState)
    .where(eq(indexerState.id, 'main_cursor'))
    .limit(1);

  const START_BLOCK = BigInt(
    env.START_BLOCK || '325236150'
  );

  let fromBlock =
    stateRows.length > 0
      ? BigInt(stateRows[0].lastScannedBlock) + 1n
      : START_BLOCK;

  if (fromBlock > latestBlock) {
    return {
      message: 'Indexer is up to date',
      latestBlock: latestBlock.toString(),
    };
  }

  // Dipercepat untuk catch-up
  const MAX_BLOCKS_PER_RUN = 5000n;

  const MAX_BLOCK_RANGE = BigInt(
    env.MAX_BLOCK_RANGE || '100'
  );

  if (MAX_BLOCK_RANGE <= 0n) {
    throw new Error(
      'MAX_BLOCK_RANGE must be greater than zero'
    );
  }

  let toBlock =
    fromBlock + MAX_BLOCKS_PER_RUN - 1n;

  if (toBlock > latestBlock) {
    toBlock = latestBlock;
  }

  let insertedCount = 0;
  let currentFrom = fromBlock;
  const allLogs: any[] = [];

  // 2. Fetch Log
  while (currentFrom <= toBlock) {
    let currentTo =
      currentFrom + MAX_BLOCK_RANGE - 1n;

    if (currentTo > toBlock) {
      currentTo = toBlock;
    }

    const logs = await client.getContractEvents({
      address:
        env.AUCTION_CONTRACT_ADDRESS as `0x${string}`,
      abi: abi as any,
      fromBlock: currentFrom,
      toBlock: currentTo,
    });

    allLogs.push(...logs);
    currentFrom = currentTo + 1n;
  }

  // 3. Simpan Log jika ada
  if (allLogs.length > 0) {
    const uniqueBlockNumbers = Array.from(
      new Set<bigint>(
        allLogs.map(
          (log: any) => log.blockNumber as bigint
        )
      )
    );

    const blockTimestamps =
      new Map<bigint, bigint>();

    await Promise.all(
      uniqueBlockNumbers.map(async (blockNumber) => {
        const block = await client.getBlock({
          blockNumber,
        });

        blockTimestamps.set(
          blockNumber,
          block.timestamp
        );
      })
    );

    const eventsToInsert = allLogs.map(
      (log: any) => {
        const safeArgs = JSON.parse(
          JSON.stringify(
            log.args,
            (_key, value) =>
              typeof value === 'bigint'
                ? value.toString()
                : value
          )
        );

        const timestamp =
          blockTimestamps.get(log.blockNumber) ??
          0n;

        return {
          chainId: arbitrumSepolia.id,
          blockNumber: log.blockNumber,
          blockTs: new Date(
            Number(timestamp) * 1000
          ),
          txHash: log.transactionHash,
          logIndex: log.logIndex,
          eventName: log.eventName,
          args: safeArgs,
          processed: false,
        };
      }
    );

    await db
      .insert(chainEvents)
      .values(eventsToInsert)
      .onConflictDoNothing();

    insertedCount = eventsToInsert.length;
  }

  // 4. Update state kursor meskipun fetched 0
  await db
    .insert(indexerState)
    .values({
      id: 'main_cursor',
      lastScannedBlock: toBlock,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: indexerState.id,
      set: {
        lastScannedBlock: toBlock,
        updatedAt: new Date(),
      },
    });

  // 5. Proses event ke tabel turunan
  const result = await processEvents(db, client);

  return {
    message: 'Indexer run successful',
    fromBlock: fromBlock.toString(),
    toBlock: toBlock.toString(),
    latestFinalizedBlock: latestBlock.toString(),
    fetched: insertedCount,
    processed: result.processed,
    failed: result.failed,
  };
}

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    try {
      const res = await runIndexer(env);

      return new Response(JSON.stringify(res), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch (error: unknown) {
      console.error(
        'Indexer request failed:',
        error
      );

      const message =
        error instanceof Error
          ? error.message
          : 'Unknown indexer error';

      return new Response(
        JSON.stringify({
          error: message,
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }
  },

  async scheduled(
    event: ScheduledEvent,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {
    try {
      const res = await runIndexer(env);

      console.log('Cron run result:', res);
    } catch (error) {
      console.error('Cron run failed:', error);
    }
  },
};