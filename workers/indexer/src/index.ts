// @file workers/indexer/src/index.ts

import { createPublicClient, http } from 'viem';
import { arbitrumSepolia } from 'viem/chains';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
import {
  chainEvents,
  indexerCheckpoint,
  indexerState,
} from '../../../packages/db/src/schema';

import * as schema from '../../../packages/db/src/schema';
import { eq } from 'drizzle-orm';
import type { Env } from './types';
import {
  ARBITRUM_SEPOLIA_CHAIN_ID,
  ParalelAuctionAbi,
  ParalelAuctionV3Abi,
  ParalelAuctionV3PolicyAbi,
  getParalelContractAddress,
  getParalelDeployment,
  getParalelPolicyRegistryAddress,
} from '@paralel/contracts';
import { processEvents } from './process';

import {
  assertCheckpointAdvance,
  assertCheckpointCanonical,
  type IndexerCheckpointEvidence,
} from './checkpoint';

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

  const pool =
    new Pool({
      connectionString:
        databaseUrl,
    });

  const db =
    drizzle({
      client:
        pool,
      schema,
    });

  const client = createPublicClient({
    chain: arbitrumSepolia,
    transport: http(arbitrumRpcUrl),
  });

  const finalizedBlock =
    await client.getBlock({
      blockTag:
        'finalized',
    });

  if (
    finalizedBlock.hash ===
      null
  ) {
    throw new Error(
      'Finalized Arbitrum Sepolia block has no hash.'
    );
  }

  const latestBlock =
    finalizedBlock.number;

  const deployment =
    getParalelDeployment(
      ARBITRUM_SEPOLIA_CHAIN_ID,
    );

  const contractAddress =
    getParalelContractAddress(
      ARBITRUM_SEPOLIA_CHAIN_ID,
    );
  const contractAbi =
    deployment.contractVersion === 'v3'
      ? ParalelAuctionV3Abi
      : ParalelAuctionAbi;
  const policyRegistryAddress =
    deployment.contractVersion === 'v3'
      ? getParalelPolicyRegistryAddress(
          ARBITRUM_SEPOLIA_CHAIN_ID,
        )
      : null;

  if (
    deployment.contractVersion === 'v3' &&
    !policyRegistryAddress
  ) {
    throw new Error(
      'V3 deployment metadata is missing the policy registry address.',
    );
  }

  const indexingStartBlock =
    deployment.deploymentBlock;

  /*
   * indexer_checkpoint is authoritative for finalized progress.
   * indexer_state remains a temporary compatibility cursor.
   */
  const checkpointRows =
    await db
      .select()
      .from(
        indexerCheckpoint,
      )
      .where(
        eq(
          indexerCheckpoint.chainId,
          ARBITRUM_SEPOLIA_CHAIN_ID,
        ),
      )
      .limit(
        1,
      );

  const legacyStateRows =
    await db
      .select()
      .from(
        indexerState,
      )
      .where(
        eq(
          indexerState.id,
          'main_cursor',
        ),
      )
      .limit(
        1,
      );

  let checkpoint:
    IndexerCheckpointEvidence |
    null =
    null;

  if (
    checkpointRows[0]
  ) {
    checkpoint =
      Object.freeze({
        chainId:
          checkpointRows[0]
            .chainId,
        blockNumber:
          checkpointRows[0]
            .blockNumber,
        blockHash:
          checkpointRows[0]
            .blockHash as
              `0x${string}`,
      });

    const checkpointBlock =
      await client.getBlock({
        blockNumber:
          checkpoint
            .blockNumber,
      });

    if (
      checkpointBlock.hash ===
        null
    ) {
      throw new Error(
        'Stored indexer checkpoint block has no canonical RPC hash.'
      );
    }

    assertCheckpointCanonical(
      checkpoint,
      {
        chainId:
          ARBITRUM_SEPOLIA_CHAIN_ID,
        blockNumber:
          checkpointBlock
            .number,
        blockHash:
          checkpointBlock
            .hash
            .toLowerCase() as
              `0x${string}`,
      },
    );
  } else if (
    legacyStateRows[0]
  ) {
    /*
     * Bootstrap the first verified checkpoint from the legacy cursor.
     * The block hash comes from finalized RPC evidence, never from inference.
     */
    const legacyBlockNumber =
      legacyStateRows[0]
        .lastScannedBlock;

    if (
      legacyBlockNumber >
        latestBlock
    ) {
      throw new Error(
        'Legacy indexer cursor is ahead of the finalized chain.'
      );
    }

    const legacyBlock =
      await client.getBlock({
        blockNumber:
          legacyBlockNumber,
      });

    if (
      legacyBlock.hash ===
        null
    ) {
      throw new Error(
        'Legacy indexer cursor block has no canonical RPC hash.'
      );
    }

    const bootstrapCheckpoint:
      IndexerCheckpointEvidence =
      Object.freeze({
        chainId:
          ARBITRUM_SEPOLIA_CHAIN_ID,
        blockNumber:
          legacyBlock.number,
        blockHash:
          legacyBlock.hash
            .toLowerCase() as
              `0x${string}`,
      });

    assertCheckpointAdvance(
      null,
      bootstrapCheckpoint,
    );

    await db
      .insert(
        indexerCheckpoint,
      )
      .values({
        chainId:
          bootstrapCheckpoint
            .chainId,
        blockNumber:
          bootstrapCheckpoint
            .blockNumber,
        blockHash:
          bootstrapCheckpoint
            .blockHash,
        updatedAt:
          new Date(),
      })
      .onConflictDoNothing();

    checkpoint =
      bootstrapCheckpoint;
  }

  const fromBlock =
    checkpoint
      ? checkpoint
          .blockNumber +
        1n
      : indexingStartBlock;

  /*
   * Pending projections must still be processed when no new finalized block
   * exists. Do not return before processEvents().
   */
  if (
    fromBlock >
      latestBlock
  ) {
    const pendingResult =
      await processEvents(
        db,
        client,
        Number.MAX_SAFE_INTEGER,
      );

    if (
      pendingResult.failed !==
        0
    ) {
      throw new Error(
        `Indexer has ${pendingResult.failed} failed pending projections.`
      );
    }

    return {
      message:
        'Indexer is up to date',
      latestBlock:
        latestBlock
          .toString(),
      processed:
        pendingResult
          .processed,
      failed:
        pendingResult
          .failed,
      checkpointBlock:
        checkpoint
          ?.blockNumber
          .toString() ??
        null,
      checkpointHash:
        checkpoint
          ?.blockHash ??
        null,
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
      address: contractAddress,
      abi: contractAbi,
      strict: true,
      fromBlock: currentFrom,
      toBlock: currentTo,
    });

    allLogs.push(...logs);
    if (policyRegistryAddress) {
      const policyLogs = await client.getContractEvents({
        address: policyRegistryAddress,
        abi: ParalelAuctionV3PolicyAbi,
        strict: true,
        fromBlock: currentFrom,
        toBlock: currentTo,
      });
      allLogs.push(...policyLogs);
    }
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

    const blockEvidence =
      new Map<
        bigint,
        Readonly<{
          timestamp:
            bigint;
          blockHash:
            `0x${string}`;
        }>
      >();

    await Promise.all(
      uniqueBlockNumbers.map(async (blockNumber) => {
        const block =
          await client.getBlock({
            blockNumber,
          });

        if (
          block.hash ===
            null
        ) {
          throw new Error(
            `Finalized block ${blockNumber} has no hash.`
          );
        }

        blockEvidence.set(
          blockNumber,
          Object.freeze({
            timestamp:
              block.timestamp,
            blockHash:
              block.hash
                .toLowerCase() as
                  `0x${string}`,
          }),
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

        const evidence =
          blockEvidence.get(
            log.blockNumber,
          );

        if (!evidence) {
          throw new Error(
            `Missing finalized block evidence for ${log.blockNumber}.`
          );
        }

        if (
          log.transactionIndex ===
            null ||
          log.transactionIndex ===
            undefined ||
          !Number.isSafeInteger(
            log.transactionIndex,
          ) ||
          log.transactionIndex <
            0
        ) {
          throw new Error(
            [
              'Canonical transaction index is unavailable.',
              `txHash=${log.transactionHash}`,
              `logIndex=${log.logIndex}`,
            ].join(' ')
          );
        }

        if (
          log.transactionHash ===
            null ||
          log.logIndex ===
            null ||
          log.eventName ===
            undefined
        ) {
          throw new Error(
            'Canonical contract log projection is incomplete.'
          );
        }

        return {
          chainId:
            arbitrumSepolia.id,

          contractAddress:
            log.address
              .toLowerCase(),

          blockNumber:
            log.blockNumber,

          blockHash:
            evidence
              .blockHash,

          blockTs:
            new Date(
              Number(
                evidence.timestamp,
              ) * 1000,
            ),

          transactionIndex:
            log.transactionIndex,

          txHash:
            log.transactionHash
              .toLowerCase(),

          logIndex:
            log.logIndex,

          eventName:
            log.eventName,

          args:
            safeArgs,

          canonical:
            true,

          projectionVersion:
            1,

          processed:
            false,

          processingError:
            null,
        };
      }
    );

    await db
      .insert(chainEvents)
      .values(eventsToInsert)
      .onConflictDoNothing();

    insertedCount = eventsToInsert.length;
  }

  /*
   * Project all pending canonical transaction groups before advancing the
   * finalized checkpoint. A failed projection leaves both checkpoint and
   * legacy cursor unchanged.
   */
  const result =
    await processEvents(
      db,
      client,
      Number.MAX_SAFE_INTEGER,
    );

  if (
    result.failed !==
      0
  ) {
    throw new Error(
      `Indexer projection failed for ${result.failed} canonical events.`
    );
  }

  const checkpointBlock =
    toBlock ===
      latestBlock
      ? finalizedBlock
      : await client.getBlock({
          blockNumber:
            toBlock,
        });

  if (
    checkpointBlock.hash ===
      null
  ) {
    throw new Error(
      `Finalized checkpoint block ${toBlock} has no hash.`
    );
  }

  const nextCheckpoint:
    IndexerCheckpointEvidence =
    Object.freeze({
      chainId:
        ARBITRUM_SEPOLIA_CHAIN_ID,
      blockNumber:
        checkpointBlock
          .number,
      blockHash:
        checkpointBlock
          .hash
          .toLowerCase() as
            `0x${string}`,
    });

  assertCheckpointAdvance(
    checkpoint,
    nextCheckpoint,
  );

  /*
   * Keep checkpoint and compatibility cursor synchronized atomically.
   */
  await db.transaction(
    async (
      transaction,
    ) => {
      await transaction
        .insert(
          indexerCheckpoint,
        )
        .values({
          chainId:
            nextCheckpoint
              .chainId,
          blockNumber:
            nextCheckpoint
              .blockNumber,
          blockHash:
            nextCheckpoint
              .blockHash,
          updatedAt:
            new Date(),
        })
        .onConflictDoUpdate({
          target:
            indexerCheckpoint
              .chainId,
          set: {
            blockNumber:
              nextCheckpoint
                .blockNumber,
            blockHash:
              nextCheckpoint
                .blockHash,
            updatedAt:
              new Date(),
          },
        });

      await transaction
        .insert(
          indexerState,
        )
        .values({
          id:
            'main_cursor',
          lastScannedBlock:
            nextCheckpoint
              .blockNumber,
          updatedAt:
            new Date(),
        })
        .onConflictDoUpdate({
          target:
            indexerState.id,
          set: {
            lastScannedBlock:
              nextCheckpoint
                .blockNumber,
            updatedAt:
              new Date(),
          },
        });
    },
  );

  return {
    message: 'Indexer run successful',
    fromBlock: fromBlock.toString(),
    toBlock: toBlock.toString(),
    latestFinalizedBlock: latestBlock.toString(),
    fetched: insertedCount,
    processed: result.processed,
    failed: result.failed,
    checkpointBlock:
      nextCheckpoint
        .blockNumber
        .toString(),
    checkpointHash:
      nextCheckpoint
        .blockHash,
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
