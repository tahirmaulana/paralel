// @file workers/indexer/src/process.ts
import { eq, and } from 'drizzle-orm';
import { keccak256, toBytes } from 'viem';
import {
  chainEvents, auctions, auctionRounds, bids, bidderStakes,
} from '../../../packages/db/src/schema';

type Db = any;

// Fix #3: cache auctionKey → id per run
async function buildAuctionMap(db: Db): Promise<Map<string, string>> {
  const rows = await db
    .select({ id: auctions.id, auctionCode: auctions.auctionCode })
    .from(auctions);
  const map = new Map<string, string>();
  for (const r of rows) {
    map.set(keccak256(toBytes(r.auctionCode)), r.id);
  }
  return map;
}

// Fix #4: cache block per run
type BlockCache = Map<string, Date>;
async function getBlockTs(client: any, blockNumber: bigint, cache: BlockCache): Promise<Date> {
  const key = blockNumber.toString();
  if (cache.has(key)) return cache.get(key)!;
  const block = await client.getBlock({ blockNumber });
  const d = new Date(Number(block.timestamp) * 1000);
  cache.set(key, d);
  return d;
}

// Fix #2: cache txIndex per run
type TxCache = Map<string, number>;
async function getTxIndex(client: any, txHash: string, cache: TxCache): Promise<number> {
  if (cache.has(txHash)) return cache.get(txHash)!;
  const tx = await client.getTransaction({ hash: txHash as `0x${string}` });
  const i = tx.transactionIndex;
  cache.set(txHash, i);
  return i;
}

async function recomputeRanks(db: Db, auctionId: string, roundNo: number) {
  const stakes = await db
    .select({ bidderWallet: bidderStakes.bidderWallet, myBid: bidderStakes.myBid, reachedSeq: bidderStakes.reachedSeq })
    .from(bidderStakes)
    .where(and(eq(bidderStakes.auctionId, auctionId), eq(bidderStakes.roundNo, roundNo)));

  stakes.sort((a: any, b: any) => {
    if (a.myBid > b.myBid) return -1;
    if (a.myBid < b.myBid) return 1;
    return a.reachedSeq < b.reachedSeq ? -1 : 1;
  });

  for (let i = 0; i < stakes.length; i++) {
    const rank = i < 10 ? i + 1 : null;
    await db.update(bidderStakes).set({ rank })
      .where(and(
        eq(bidderStakes.auctionId, auctionId),
        eq(bidderStakes.roundNo, roundNo),
        eq(bidderStakes.bidderWallet, stakes[i].bidderWallet),
      ));
  }
}

// ─── Handlers ───────────────────────────────────────────────

async function onRoundScheduled(ctx: any, ev: any) {
  const auctionId = ctx.auctionMap.get(ev.args.auctionKey);
  // Fix #1: throw supaya retry, jangan mark processed
  if (!auctionId) throw new Error(`auction not found for key ${ev.args.auctionKey} (backend belum insert?)`);

  const roundNo = Number(ev.args.roundNo);
  await ctx.db.insert(auctionRounds).values({
    auctionId, roundNo,
    startingBid: BigInt(ev.args.startingBid),
    bidIncrement: BigInt(ev.args.bidIncrement),
    openAt: new Date(Number(ev.args.openAt) * 1000),
    closeAt: new Date(Number(ev.args.closeAt) * 1000),
    durationHours: Math.round((Number(ev.args.closeAt) - Number(ev.args.openAt)) / 3600),
    scheduledAt: ev.blockTs,
  }).onConflictDoNothing();
}

async function onAuctionRegistered(ctx: any, ev: any) {
  const auctionId = ctx.auctionMap.get(ev.args.auctionKey);
  if (!auctionId) throw new Error(`auction not found for key ${ev.args.auctionKey}`);
  await ctx.db.update(auctions).set({
    status: 'SCHEDULED',
    onchainTxHash: ev.txHash,
    onchainRegisteredAt: ev.blockTs,
  }).where(eq(auctions.id, auctionId));
}

async function onBidPlaced(ctx: any, ev: any) {
  const auctionId = ctx.auctionMap.get(ev.args.auctionKey);
  if (!auctionId) throw new Error(`auction not found for key ${ev.args.auctionKey}`);
  const roundNo = Number(ev.args.roundNo);
  const bidder = ev.args.bidder.toLowerCase();

  // Fix #2: ambil txIndex dari receipt
  const txIndex = await getTxIndex(ctx.client, ev.txHash, ctx.txCache);

  await ctx.db.insert(bids).values({
    auctionId, roundNo,
    phase: ev.args.isPreBid ? 'PRE_BID' : 'LIVE_BID',
    bidderWallet: bidder,
    amountAdded: BigInt(ev.args.added),
    myBidAfter: BigInt(ev.args.myBidAfter),
    currentBidAfter: BigInt(ev.args.currentBidAfter),
    seq: BigInt(ev.args.seq),
    blockNumber: BigInt(ev.blockNumber),
    txIndex,
    logIndex: ev.logIndex,
    blockTs: ev.blockTs,
    txHash: ev.txHash,
  }).onConflictDoNothing();

  await ctx.db.insert(bidderStakes).values({
    auctionId, roundNo, bidderWallet: bidder,
    myBid: BigInt(ev.args.myBidAfter),
    reachedSeq: BigInt(ev.args.seq),
    status: 'ACTIVE',
  }).onConflictDoUpdate({
    target: [bidderStakes.auctionId, bidderStakes.roundNo, bidderStakes.bidderWallet],
    set: { myBid: BigInt(ev.args.myBidAfter), reachedSeq: BigInt(ev.args.seq) },
  });

  await recomputeRanks(ctx.db, auctionId, roundNo);
}

async function onClosed(ctx: any, ev: any) {
  const auctionId = ctx.auctionMap.get(ev.args.auctionKey);
  if (!auctionId) throw new Error(`auction not found for key ${ev.args.auctionKey}`);
  await ctx.db.update(auctions).set({ status: 'CLOSED' }).where(eq(auctions.id, auctionId));
}

// ─── Dispatcher ─────────────────────────────────────────────

const HANDLERS: Record<string, (ctx: any, ev: any) => Promise<void>> = {
  RoundScheduled: onRoundScheduled,
  AuctionRegistered: onAuctionRegistered,
  BidPlaced: onBidPlaced,
  Closed: onClosed,
};

export async function processEvents(db: Db, client: any, limit = 200) {
  const auctionMap = await buildAuctionMap(db);        // Fix #3
  const blockCache: BlockCache = new Map();            // Fix #4
  const txCache: TxCache = new Map();                  // Fix #2

  const pending = await db
    .select()
    .from(chainEvents)
    .where(eq(chainEvents.processed, false))
    .limit(limit);

  let ok = 0, failed = 0;
  for (const ev of pending) {
    const h = HANDLERS[ev.eventName];
    if (!h) {
      await db.update(chainEvents).set({ processed: true }).where(eq(chainEvents.id, ev.id));
      ok++;
      continue;
    }
    try {
      // Fix #4: pakai cached blockTs (timpa ev.blockTs saat disimpan — sudah tersimpan
      // di chain_events, jadi untuk handler kita pastikan blockTs akurat)
      const blockTs = await getBlockTs(client, BigInt(ev.blockNumber), blockCache);
      const ctx = { db, client, auctionMap, txCache };
      await h(ctx, { ...ev, blockTs });
      await db.update(chainEvents).set({ processed: true }).where(eq(chainEvents.id, ev.id));
      ok++;
    } catch (err) {
      console.error(`[handler fail] ${ev.eventName} tx=${ev.txHash}:`, err);
      failed++;
    }
  }
  return { processed: ok, failed };
}