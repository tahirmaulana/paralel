// @file workers/keeper/src/index.ts
// Cloudflare Worker: cron * * * * * — trigger on-chain untuk PARALEL.
//
// Kondisi yang dipicu:
//   A. SCHEDULED & now >= closeAt
//      -> startAwarding(auctionKey, roundNo)
//
//   B. AWARDING & now > awardingDeadline
//      -> advanceCandidate(auctionKey, roundNo)
//
//   C. COLLECTION & now > collectionDeadline
//      -> expireCollection(auctionKey, roundNo)
//
// Keeper TIDAK menulis ke database. Database hanya dibaca.
// Deadline dibaca dari getRound() pada smart contract.
//
// Idempoten: revert karena TooEarly, WrongPhase, dan kondisi serupa
// hanya dicatat ke log dan tidak membuat Worker crash.

import {
  createPublicClient,
  createWalletClient,
  http,
  parseAbi,
  keccak256,
  toBytes,
  type PublicClient,
  type WalletClient,
} from 'viem';

import { privateKeyToAccount } from 'viem/accounts';
import { arbitrumSepolia } from 'viem/chains';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { and, eq, inArray } from 'drizzle-orm';

import {
  auctions,
  auctionRounds,
} from '../../../packages/db/src/schema';

import type {
  Env,
  KeeperActionKind,
  DbAuctionStatus,
  RoundDeadlines,
  Candidate,
  KeeperAction,
  ExecutionResult,
  SecretsStoreSecret,
} from './types';

// ABI hanya berisi fungsi yang diperlukan keeper.
const keeperAbi = parseAbi([
  'function startAwarding(bytes32 auctionKey, uint16 roundNo)',
  'function advanceCandidate(bytes32 auctionKey, uint16 roundNo)',
  'function expireCollection(bytes32 auctionKey, uint16 roundNo)',
  'function getRound(bytes32 auctionKey, uint16 roundNo) view returns ((uint128 startingBid, uint128 bidIncrement, uint64 openAt, uint64 closeAt, uint128 currentBid, address currentLeader, uint64 bidSeq, address[10] topRanks, uint8 awardingIndex, uint64 awardingDeadline, address winner, uint128 winnerStake, uint64 collectionDeadline, uint64 claimPeriodEnd))',
] as const);

// ─── Binding dan configuration helpers ─────────────────────────

async function getSecret(
  binding: SecretsStoreSecret | undefined,
  bindingName: string
): Promise<string> {
  if (!binding) {
    throw new Error(
      `Missing Secrets Store binding: ${bindingName}`
    );
  }

  if (typeof binding.get !== 'function') {
    throw new Error(
      `${bindingName} is not a valid Secrets Store binding`
    );
  }

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

function validateRpcUrl(value: string): string {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(value);
  } catch {
    throw new Error(
      'ARBITRUM_RPC_URL is not a valid URL'
    );
  }

  if (
    parsedUrl.protocol !== 'https:' &&
    parsedUrl.protocol !== 'http:'
  ) {
    throw new Error(
      'ARBITRUM_RPC_URL must start with https:// or http://'
    );
  }

  return value;
}

function validateDatabaseUrl(value: string): string {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(value);
  } catch {
    throw new Error(
      'DATABASE_URL is not a valid PostgreSQL connection URL'
    );
  }

  if (
    parsedUrl.protocol !== 'postgres:' &&
    parsedUrl.protocol !== 'postgresql:'
  ) {
    throw new Error(
      'DATABASE_URL must start with postgres:// or postgresql://'
    );
  }

  return value;
}

function validateContractAddress(
  value: string | undefined
): `0x${string}` {
  if (!value) {
    throw new Error(
      'Missing AUCTION_CONTRACT_ADDRESS environment variable'
    );
  }

  const normalizedValue = value.trim();

  if (!/^0x[a-fA-F0-9]{40}$/.test(normalizedValue)) {
    throw new Error(
      'AUCTION_CONTRACT_ADDRESS must be a valid EVM address'
    );
  }

  return normalizedValue as `0x${string}`;
}

function normalizePrivateKey(
  value: string
): `0x${string}` {
  const normalizedValue = value.startsWith('0x')
    ? value
    : `0x${value}`;

  if (!/^0x[a-fA-F0-9]{64}$/.test(normalizedValue)) {
    throw new Error(
      'RELAYER_PRIVATE_KEY must contain exactly 32 bytes'
    );
  }

  return normalizedValue as `0x${string}`;
}

function parsePositiveInteger(
  value: string | undefined,
  fallback: number,
  variableName: string
): number {
  if (!value || !value.trim()) {
    return fallback;
  }

  const result = Number(value);

  if (
    !Number.isSafeInteger(result) ||
    result <= 0
  ) {
    throw new Error(
      `${variableName} must be a positive integer`
    );
  }

  return result;
}

// ─── General helpers ───────────────────────────────────────────

function auctionKeyOf(
  auctionCode: string
): `0x${string}` {
  return keccak256(toBytes(auctionCode));
}

function parseRoundDeadlines(
  result: unknown
): RoundDeadlines | null {
  if (!result || typeof result !== 'object') {
    return null;
  }

  // Viem dapat mengembalikan tuple sebagai array.
  if (Array.isArray(result)) {
    const closeAt = result[3];
    const awardingDeadline = result[9];
    const collectionDeadline = result[12];

    if (
      typeof closeAt === 'bigint' &&
      typeof awardingDeadline === 'bigint' &&
      typeof collectionDeadline === 'bigint'
    ) {
      return {
        closeAt,
        awardingDeadline,
        collectionDeadline,
      };
    }
  }

  // Fallback jika hasil tuple dikembalikan sebagai object bernama.
  const objectResult =
    result as Record<string, unknown>;

  if (
    typeof objectResult.closeAt === 'bigint' &&
    typeof objectResult.awardingDeadline === 'bigint' &&
    typeof objectResult.collectionDeadline === 'bigint'
  ) {
    return {
      closeAt: objectResult.closeAt,
      awardingDeadline:
        objectResult.awardingDeadline,
      collectionDeadline:
        objectResult.collectionDeadline,
    };
  }

  return null;
}

function classifyError(
  error: unknown
): {
  message: string;
  expected: boolean;
} {
  const candidateError = error as {
    shortMessage?: unknown;
    message?: unknown;
  };

  const rawMessage =
    typeof candidateError?.shortMessage === 'string'
      ? candidateError.shortMessage
      : typeof candidateError?.message === 'string'
        ? candidateError.message
        : typeof error === 'string'
          ? error
          : 'unknown error';

  const expectedPatterns = [
    'TooEarly',
    'WrongPhase',
    'NotRelayer',
    'BiddingClosed',
    'AuctionNotBiddable',
  ];

  const expected = expectedPatterns.some(
    (pattern) => rawMessage.includes(pattern)
  );

  return {
    message: rawMessage,
    expected,
  };
}

// ─── Kandidat dan deadline ─────────────────────────────────────

async function fetchCandidates(
  db: any,
  maxCandidates: number
): Promise<Candidate[]> {
  const rows = await db
    .select({
      auctionId: auctions.id,
      auctionCode: auctions.auctionCode,
      status: auctions.status,
      currentRound: auctions.currentRound,
    })
    .from(auctions)
    .innerJoin(
      auctionRounds,
      and(
        eq(auctionRounds.auctionId, auctions.id),
        eq(
          auctionRounds.roundNo,
          auctions.currentRound
        )
      )
    )
    .where(
      inArray(auctions.status, [
        'SCHEDULED',
        'AWARDING',
        'COLLECTION',
      ])
    )
    .limit(maxCandidates);

  return rows.map((row: any) => ({
    auctionId: row.auctionId,
    auctionCode: row.auctionCode,
    auctionKey: auctionKeyOf(row.auctionCode),
    status: row.status as DbAuctionStatus,
    currentRound: Number(row.currentRound),
  }));
}

async function fetchDeadlines(
  publicClient: PublicClient,
  contractAddress: `0x${string}`,
  candidates: Candidate[]
): Promise<Map<string, RoundDeadlines>> {
  const deadlinesByAuction =
    new Map<string, RoundDeadlines>();

  if (candidates.length === 0) {
    return deadlinesByAuction;
  }

  let multicallResults: any[];

  try {
    multicallResults =
      await publicClient.multicall({
        contracts: candidates.map(
          (candidate) => ({
            address: contractAddress,
            abi: keeperAbi,
            functionName: 'getRound' as const,
            args: [
              candidate.auctionKey,
              candidate.currentRound,
            ] as const,
          })
        ),
        allowFailure: true,
      });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : String(error);

    console.error(
      '[keeper] multicall getRound failed:',
      message
    );

    return deadlinesByAuction;
  }

  for (
    let index = 0;
    index < candidates.length;
    index++
  ) {
    const candidate = candidates[index];
    const multicallResult =
      multicallResults[index];

    if (!multicallResult) {
      console.error(
        `[keeper] missing getRound result for ` +
          `${candidate.auctionCode} ` +
          `round ${candidate.currentRound}`
      );

      continue;
    }

    if (multicallResult.status !== 'success') {
      const errorMessage =
        multicallResult.error?.shortMessage ??
        multicallResult.error?.message ??
        multicallResult.error ??
        'unknown multicall error';

      console.error(
        `[keeper] getRound failed for ` +
          `${candidate.auctionCode} ` +
          `round ${candidate.currentRound}:`,
        errorMessage
      );

      continue;
    }

    const deadlines = parseRoundDeadlines(
      multicallResult.result
    );

    if (!deadlines) {
      console.error(
        `[keeper] cannot parse getRound result for ` +
          `${candidate.auctionCode} ` +
          `round ${candidate.currentRound}`
      );

      continue;
    }

    deadlinesByAuction.set(
      candidate.auctionId,
      deadlines
    );
  }

  return deadlinesByAuction;
}

function planActions(
  candidates: Candidate[],
  deadlines: Map<string, RoundDeadlines>,
  nowSec: bigint
): KeeperAction[] {
  const actions: KeeperAction[] = [];

  for (const candidate of candidates) {
    const roundDeadlines = deadlines.get(
      candidate.auctionId
    );

    if (!roundDeadlines) {
      continue;
    }

    if (
      candidate.status === 'SCHEDULED' &&
      nowSec >= roundDeadlines.closeAt
    ) {
      actions.push({
        kind: 'startAwarding',
        candidate,
        nowSec,
        deadline: roundDeadlines.closeAt,
      });

      continue;
    }

    if (
      candidate.status === 'AWARDING' &&
      roundDeadlines.awardingDeadline > 0n &&
      nowSec > roundDeadlines.awardingDeadline
    ) {
      actions.push({
        kind: 'advanceCandidate',
        candidate,
        nowSec,
        deadline:
          roundDeadlines.awardingDeadline,
      });

      continue;
    }

    if (
      candidate.status === 'COLLECTION' &&
      roundDeadlines.collectionDeadline > 0n &&
      nowSec > roundDeadlines.collectionDeadline
    ) {
      actions.push({
        kind: 'expireCollection',
        candidate,
        nowSec,
        deadline:
          roundDeadlines.collectionDeadline,
      });
    }
  }

  const priority: Record<
    KeeperActionKind,
    number
  > = {
    startAwarding: 1,
    advanceCandidate: 2,
    expireCollection: 3,
  };

  actions.sort(
    (firstAction, secondAction) =>
      priority[firstAction.kind] -
      priority[secondAction.kind]
  );

  return actions;
}

// ─── Eksekusi ─────────────────────────────────────────────────

async function executeAction(
  publicClient: PublicClient,
  walletClient: WalletClient,
  contractAddress: `0x${string}`,
  action: KeeperAction
): Promise<ExecutionResult> {
  const { kind, candidate } = action;

  const args = [
    candidate.auctionKey,
    candidate.currentRound,
  ] as const;

  const account = walletClient.account;

  if (!account) {
    throw new Error(
      'Keeper wallet client has no relayer account'
    );
  }

  try {
    let txHash: `0x${string}`;

    switch (kind) {
      case 'startAwarding': {
        const { request } =
          await publicClient.simulateContract({
            account,
            address: contractAddress,
            abi: keeperAbi,
            functionName: 'startAwarding',
            args,
          });

        txHash =
          await walletClient.writeContract(
            request
          );

        break;
      }

      case 'advanceCandidate': {
        const { request } =
          await publicClient.simulateContract({
            account,
            address: contractAddress,
            abi: keeperAbi,
            functionName: 'advanceCandidate',
            args,
          });

        txHash =
          await walletClient.writeContract(
            request
          );

        break;
      }

      case 'expireCollection': {
        const { request } =
          await publicClient.simulateContract({
            account,
            address: contractAddress,
            abi: keeperAbi,
            functionName: 'expireCollection',
            args,
          });

        txHash =
          await walletClient.writeContract(
            request
          );

        break;
      }

      default: {
        const exhaustiveCheck: never = kind;

        throw new Error(
          `Unsupported keeper action: ${exhaustiveCheck}`
        );
      }
    }

    console.log(
      `[keeper] sent: ${kind} ` +
        `${candidate.auctionCode} ` +
        `round ${candidate.currentRound} ` +
        `tx=${txHash}`
    );

    return {
      kind,
      auctionCode: candidate.auctionCode,
      roundNo: candidate.currentRound,
      txHash,
      ok: true,
    };
  } catch (error: unknown) {
    const {
      message,
      expected,
    } = classifyError(error);

    if (expected) {
      console.log(
        `[keeper] skip (idempotent): ${kind} ` +
          `${candidate.auctionCode} ` +
          `round ${candidate.currentRound} ` +
          `- ${message}`
      );
    } else {
      console.error(
        `[keeper] failed: ${kind} ` +
          `${candidate.auctionCode} ` +
          `round ${candidate.currentRound} ` +
          `- ${message}`
      );
    }

    return {
      kind,
      auctionCode: candidate.auctionCode,
      roundNo: candidate.currentRound,
      ok: false,
      error: message,
    };
  }
}

// ─── Orchestrator ──────────────────────────────────────────────

async function runKeeper(env: Env) {
  // Secrets Store dibaca satu kali per invocation.
  const [
    databaseSecret,
    rpcSecret,
    relayerPrivateKeySecret,
  ] = await Promise.all([
    getSecret(
      env.DATABASE_URL,
      'DATABASE_URL'
    ),
    getSecret(
      env.ARBITRUM_RPC_URL,
      'ARBITRUM_RPC_URL'
    ),
    getSecret(
      env.RELAYER_PRIVATE_KEY,
      'RELAYER_PRIVATE_KEY'
    ),
  ]);

  const databaseUrl =
    validateDatabaseUrl(databaseSecret);

  const rpcUrl =
    validateRpcUrl(rpcSecret);

  const rawPrivateKey =
    normalizePrivateKey(
      relayerPrivateKeySecret
    );

  const contractAddress =
    validateContractAddress(
      env.AUCTION_CONTRACT_ADDRESS
    );

  const maxActions = parsePositiveInteger(
    env.MAX_ACTIONS_PER_RUN,
    5,
    'MAX_ACTIONS_PER_RUN'
  );

  const maxCandidates = parsePositiveInteger(
    env.MAX_CANDIDATES,
    25,
    'MAX_CANDIDATES'
  );

  const sqlClient = neon(databaseUrl);
  const db = drizzle(sqlClient);

  const transport = http(rpcUrl);

  const publicClient: PublicClient =
    createPublicClient({
      chain: arbitrumSepolia,
      transport,
    });

  const account =
    privateKeyToAccount(rawPrivateKey);

  const walletClient = createWalletClient({
    account,
    chain: arbitrumSepolia,
    transport,
  });

  const latestBlock =
    await publicClient.getBlock({
      blockTag: 'latest',
    });

  const nowSec = latestBlock.timestamp;

  const candidates = await fetchCandidates(
    db,
    maxCandidates
  );

  const deadlines = await fetchDeadlines(
    publicClient,
    contractAddress,
    candidates
  );

  const actions = planActions(
    candidates,
    deadlines,
    nowSec
  );

  const actionsToExecute =
    actions.slice(0, maxActions);

  const results: ExecutionResult[] = [];

  // Dieksekusi berurutan agar nonce relayer tidak bertabrakan.
  for (const action of actionsToExecute) {
    const result = await executeAction(
      publicClient,
      walletClient,
      contractAddress,
      action
    );

    results.push(result);
  }

  return {
    ok: true,
    nowSec: nowSec.toString(),
    latestBlock:
      latestBlock.number.toString(),
    candidates: candidates.length,
    actions: actions.length,
    executed: results.length,
    results,
  };
}

// ─── Worker entry ──────────────────────────────────────────────

export default {
  async scheduled(
    _event: ScheduledEvent,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {
    ctx.waitUntil(
      runKeeper(env).catch(
        (error: unknown) => {
          const message =
            error instanceof Error
              ? error.message
              : String(error);

          console.error(
            '[keeper] cron fatal:',
            message
          );
        }
      )
    );
  },

  async fetch(
    _request: Request,
    env: Env
  ): Promise<Response> {
    try {
      const result = await runKeeper(env);

      return Response.json(result, {
        status: 200,
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'unknown error';

      console.error(
        '[keeper] manual run fatal:',
        message
      );

      return Response.json(
        {
          ok: false,
          error: message,
        },
        {
          status: 500,
        }
      );
    }
  },
};