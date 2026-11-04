// @file workers/keeper/src/index.ts
// Cloudflare Worker: cron * * * * * — trigger on-chain untuk PARALEL.
//
// Kondisi yang dipicu (lihat docs/CONTRACT_SPEC.md §3.4, §3.6, §3.8):
//   A. SCHEDULED & now >= closeAt        -> startAwarding(auctionKey, roundNo)
//   B. AWARDING  & now >  awardingDeadline -> advanceCandidate(auctionKey, roundNo)
//   C. COLLECTION & now > collectionDeadline -> expireCollection(auctionKey, roundNo)
//
// Keeper TIDAK menulis ke DB; DB hanya dibaca. Deadline B/C dibaca dari
// getRound() on-chain karena schema DB tidak menyimpan awarding_deadline /
// collection_deadline (lihat packages/db/src/schema.ts).
//
// Idempoten: revert karena "TooEarly" / "WrongPhase" / dll hanya di-log,
// tidak membuat Worker crash (paralel-indexer-keeper_SKILL.md).

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
import { privateKeyToAccount } from 'viem/accounts'; // ← FIX: dari viem/accounts
import { arbitrumSepolia } from 'viem/chains';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { and, eq, inArray } from 'drizzle-orm';

import { auctions, auctionRounds } from '../../../packages/db/src/schema';
import type {
  Env,
  KeeperActionKind,
  DbAuctionStatus,
  RoundDeadlines,
  Candidate,
  KeeperAction,
  ExecutionResult,
} from './types';

// ─── ABI (hanya fungsi yang dipakai keeper) ────────────────────
const keeperAbi = parseAbi([
  'function startAwarding(bytes32 auctionKey, uint16 roundNo)',
  'function advanceCandidate(bytes32 auctionKey, uint16 roundNo)',
  'function expireCollection(bytes32 auctionKey, uint16 roundNo)',
  'function getRound(bytes32 auctionKey, uint16 roundNo) view returns ((uint128 startingBid, uint128 bidIncrement, uint64 openAt, uint64 closeAt, uint128 currentBid, address currentLeader, uint64 bidSeq, address[10] topRanks, uint8 awardingIndex, uint64 awardingDeadline, address winner, uint128 winnerStake, uint64 collectionDeadline, uint64 claimPeriodEnd))',
] as const);

// ─── Helpers ───────────────────────────────────────────────────

function auctionKeyOf(auctionCode: string): `0x${string}` {
  return keccak256(toBytes(auctionCode));
}

function parseRoundDeadlines(result: unknown): RoundDeadlines | null {
  if (!result || typeof result !== 'object') return null;

  const obj = result as Record<string, unknown>;
  if (
    typeof obj.closeAt === 'bigint' &&
    typeof obj.awardingDeadline === 'bigint' &&
    typeof obj.collectionDeadline === 'bigint'
  ) {
    return {
      closeAt: obj.closeAt,
      awardingDeadline: obj.awardingDeadline,
      collectionDeadline: obj.collectionDeadline,
    };
  }

  if (Array.isArray(result)) {
    const closeAt = result[3];
    const awardingDeadline = result[9];
    const collectionDeadline = result[12];
    if (
      typeof closeAt === 'bigint' &&
      typeof awardingDeadline === 'bigint' &&
      typeof collectionDeadline === 'bigint'
    ) {
      return { closeAt, awardingDeadline, collectionDeadline };
    }
  }

  return null;
}

function classifyError(err: any): { message: string; expected: boolean } {
  const raw =
    err?.shortMessage ||
    err?.message ||
    (typeof err === 'string' ? err : 'unknown error');

  const expectedPatterns = [
    'TooEarly',
    'WrongPhase',
    'NotRelayer',
    'BiddingClosed',
    'AuctionNotBiddable',
  ];
  const expected = expectedPatterns.some((p) => raw.includes(p));

  return { message: raw, expected };
}

// ─── Kandidat & deadline ──────────────────────────────────────

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
        eq(auctionRounds.roundNo, auctions.currentRound)
      )
    )
    .where(inArray(auctions.status, ['SCHEDULED', 'AWARDING', 'COLLECTION']))
    .limit(maxCandidates);

  return rows.map((r: any) => ({
    auctionId: r.auctionId,
    auctionCode: r.auctionCode,
    auctionKey: auctionKeyOf(r.auctionCode),
    status: r.status as DbAuctionStatus,
    currentRound: Number(r.currentRound),
  }));
}

async function fetchDeadlines(
  publicClient: PublicClient,
  contractAddress: `0x${string}`,
  candidates: Candidate[]
): Promise<Map<string, RoundDeadlines>> {
  const result = new Map<string, RoundDeadlines>();
  if (candidates.length === 0) return result;

  let multicallResults: any[];
  try {
    multicallResults = await publicClient.multicall({
      contracts: candidates.map((c) => ({
        address: contractAddress,
        abi: keeperAbi,
        functionName: 'getRound' as const,
        args: [c.auctionKey, c.currentRound] as const,
      })),
      allowFailure: true,
    });
  } catch (err: any) {
    console.error('[keeper] multicall getRound failed:', err?.message ?? err);
    return result;
  }

  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i];
    const res = multicallResults[i];

    if (res.status !== 'success') {
      console.error(
        `[keeper] getRound failed for ${c.auctionCode} round ${c.currentRound}:`,
        res.error?.shortMessage ?? res.error?.message ?? res.error
      );
      continue;
    }

    const deadlines = parseRoundDeadlines(res.result);
    if (!deadlines) {
      console.error(
        `[keeper] cannot parse getRound result for ${c.auctionCode} round ${c.currentRound}`
      );
      continue;
    }
    result.set(c.auctionId, deadlines);
  }

  return result;
}

function planActions(
  candidates: Candidate[],
  deadlines: Map<string, RoundDeadlines>,
  nowSec: bigint
): KeeperAction[] {
  const actions: KeeperAction[] = [];

  for (const c of candidates) {
    const d = deadlines.get(c.auctionId);
    if (!d) continue;

    if (c.status === 'SCHEDULED' && nowSec >= d.closeAt) {
      actions.push({
        kind: 'startAwarding',
        candidate: c,
        nowSec,
        deadline: d.closeAt,
      });
      continue;
    }

    if (
      c.status === 'AWARDING' &&
      d.awardingDeadline > 0n &&
      nowSec > d.awardingDeadline
    ) {
      actions.push({
        kind: 'advanceCandidate',
        candidate: c,
        nowSec,
        deadline: d.awardingDeadline,
      });
      continue;
    }

    if (
      c.status === 'COLLECTION' &&
      d.collectionDeadline > 0n &&
      nowSec > d.collectionDeadline
    ) {
      actions.push({
        kind: 'expireCollection',
        candidate: c,
        nowSec,
        deadline: d.collectionDeadline,
      });
    }
  }

  const priority: Record<KeeperActionKind, number> = {
    startAwarding: 1,
    advanceCandidate: 2,
    expireCollection: 3,
  };
  actions.sort((a, b) => priority[a.kind] - priority[b.kind]);

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
  const args = [candidate.auctionKey, candidate.currentRound] as const;
  const account = walletClient.account!;

  try {
    let txHash: `0x${string}`;

    // switch per kind → functionName definitif per cabang,
    // sehingga request dari simulateContract bertipe konklusif.
    switch (kind) {
      case 'startAwarding': {
        const { request } = await publicClient.simulateContract({
          account,
          address: contractAddress,
          abi: keeperAbi,
          functionName: 'startAwarding',
          args,
        });
        txHash = await walletClient.writeContract(request);
        break;
      }
      case 'advanceCandidate': {
        const { request } = await publicClient.simulateContract({
          account,
          address: contractAddress,
          abi: keeperAbi,
          functionName: 'advanceCandidate',
          args,
        });
        txHash = await walletClient.writeContract(request);
        break;
      }
      case 'expireCollection': {
        const { request } = await publicClient.simulateContract({
          account,
          address: contractAddress,
          abi: keeperAbi,
          functionName: 'expireCollection',
          args,
        });
        txHash = await walletClient.writeContract(request);
        break;
      }
    }

    console.log(
      `[keeper] sent: ${kind} ${candidate.auctionCode} round ${candidate.currentRound} tx=${txHash}`
    );

    return {
      kind,
      auctionCode: candidate.auctionCode,
      roundNo: candidate.currentRound,
      txHash,
      ok: true,
    };
  } catch (err: any) {
    const { message, expected } = classifyError(err);
    if (expected) {
      console.log(
        `[keeper] skip (idempotent): ${kind} ${candidate.auctionCode} round ${candidate.currentRound} — ${message}`
      );
    } else {
      console.error(
        `[keeper] failed: ${kind} ${candidate.auctionCode} round ${candidate.currentRound} — ${message}`
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

// ─── Orchestrator ─────────────────────────────────────────────

async function runKeeper(env: Env) {
  const sqlClient = neon(env.DATABASE_URL);
  const db = drizzle(sqlClient);

  const publicClient: PublicClient = createPublicClient({
    chain: arbitrumSepolia,
    transport: http(env.ARBITRUM_RPC_URL),
  });

  const rawPk = env.RELAYER_PRIVATE_KEY.startsWith('0x')
    ? env.RELAYER_PRIVATE_KEY
    : (`0x${env.RELAYER_PRIVATE_KEY}` as `0x${string}`);

  const account = privateKeyToAccount(rawPk);

  const walletClient = createWalletClient({
    account,
    chain: arbitrumSepolia,
    transport: http(env.ARBITRUM_RPC_URL),
  });

  const maxActions = Math.max(1, Number(env.MAX_ACTIONS_PER_RUN ?? '5'));
  const maxCandidates = Math.max(1, Number(env.MAX_CANDIDATES ?? '25'));

  const latestBlock = await publicClient.getBlock({ blockTag: 'latest' });
  const nowSec = latestBlock.timestamp;

  const candidates = await fetchCandidates(db, maxCandidates);
  const deadlines = await fetchDeadlines(
    publicClient,
    env.AUCTION_CONTRACT_ADDRESS,
    candidates
  );

  const actions = planActions(candidates, deadlines, nowSec);
  const toExecute = actions.slice(0, maxActions);

  const results: ExecutionResult[] = [];
  for (const action of toExecute) {
    results.push(
      await executeAction(
        publicClient,
        walletClient,
        env.AUCTION_CONTRACT_ADDRESS,
        action
      )
    );
  }

  return {
    ok: true,
    nowSec: nowSec.toString(),
    latestBlock: latestBlock.number.toString(),
    candidates: candidates.length,
    actions: actions.length,
    executed: results.length,
    results,
  };
}

// ─── Worker entry ─────────────────────────────────────────────

export default {
  async scheduled(
    _event: ScheduledEvent,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {
    ctx.waitUntil(
      runKeeper(env).catch((err) => {
        console.error('[keeper] cron fatal:', err?.message ?? err);
      })
    );
  },

  async fetch(_request: Request, env: Env): Promise<Response> {
    try {
      const result = await runKeeper(env);
      return Response.json(result, { status: 200 });
    } catch (err: any) {
      console.error('[keeper] manual run fatal:', err?.message ?? err);
      return Response.json(
        { ok: false, error: err?.message ?? 'unknown error' },
        { status: 500 }
      );
    }
  },
};