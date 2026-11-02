// @file workers/indexer/src/process.ts
// Dispatch event mentah dari chain_events ke handler, lalu mark processed=true.
// Idempoten: aman dijalankan berkali-kali. Kalau gagal di tengah, event tetap
// processed=false dan akan di-retry run berikutnya.
import { eq, and } from 'drizzle-orm';
import { keccak256, toBytes } from 'viem';
import {
  chainEvents, auctions, auctionRounds, bids, bidderStakes,
  awardingAttempts, receipts, payouts, withdrawals,
} from '../../../packages/db/src/schema';

type Db = any; // drizzle client

// Cari auctions.id dari auctionKey (bytes32 keccak256(auctionCode)).
// Pilot: brute-force match. Kalau lambat, tambah kolom auctions.auction_key.
async function findAuctionId(db: Db, auctionKey: string): Promise<string | null> {
  const all = await db
    .select({ id: auctions.id, auctionCode: auctions.auctionCode })
    .from(auctions);
  for (const a of all) {
    if (keccak256(toBytes(a.auctionCode)) === auctionKey) return a.id;
  }
  return null;
}

// Hitung rank 1..10 untuk bidder_stakes pada auction+round tertentu.
// Aturan: my_bid DESC, reached_seq ASC. Di luar 10 → NULL.
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

async function onRoundScheduled(db: Db, ev: any) {
  const auctionId = await findAuctionId(db, ev.args.auctionKey);
  if (!auctionId) return; // auctions row belum ada (backend belum insert)
  const roundNo = Number(ev.args.roundNo);
  // upsert auction_rounds
  await db.insert(auctionRounds).values({
    auctionId, roundNo,
    startingBid: BigInt(ev.args.startingBid),
    bidIncrement: BigInt(ev.args.bidIncrement),
    openAt: new Date(Number(ev.args.openAt) * 1000),
    closeAt: new Date(Number(ev.args.closeAt) * 1000),
    durationHours: Math.round((Number(ev.args.closeAt) - Number(ev.args.openAt)) / 3600),
    scheduledAt: ev.blockTs,
  }).onConflictDoNothing();
}

async function onAuctionRegistered(db: Db, ev: any) {
  const auctionId = await findAuctionId(db, ev.args.auctionKey);
  if (!auctionId) return;
  await db.update(auctions).set({
    status: 'SCHEDULED',
    onchainTxHash: ev.txHash,
    onchainRegisteredAt: ev.blockTs,
  }).where(eq(auctions.id, auctionId));
}

async function onBidPlaced(db: Db, ev: any) {
  const auctionId = await findAuctionId(db, ev.args.auctionKey);
  if (!auctionId) return;
  const roundNo = Number(ev.args.roundNo);
  const bidder = ev.args.bidder.toLowerCase();

  // insert bids
  await db.insert(bids).values({
    auctionId, roundNo,
    phase: ev.args.isPreBid ? 'PRE_BID' : 'LIVE_BID',
    bidderWallet: bidder,
    amountAdded: BigInt(ev.args.added),
    myBidAfter: BigInt(ev.args.myBidAfter),
    currentBidAfter: BigInt(ev.args.currentBidAfter),
    seq: BigInt(ev.args.seq),
    blockNumber: BigInt(ev.blockNumber),
    txIndex: 0, // tidak ada di event; hanya untuk audit; seq yang menentukan urutan
    logIndex: ev.logIndex,
    blockTs: ev.blockTs,
    txHash: ev.txHash,
  }).onConflictDoNothing();

  // upsert bidder_stakes
  await db.insert(bidderStakes).values({
    auctionId, roundNo, bidderWallet: bidder,
    myBid: BigInt(ev.args.myBidAfter),
    reachedSeq: BigInt(ev.args.seq),
    status: 'ACTIVE',
  }).onConflictDoUpdate({
    target: [bidderStakes.auctionId, bidderStakes.roundNo, bidderStakes.bidderWallet],
    set: { myBid: BigInt(ev.args.myBidAfter), reachedSeq: BigInt(ev.args.seq) },
  });

  await recomputeRanks(db, auctionId, roundNo);
}

async function onClosed(db: Db, ev: any) {
  const auctionId = await findAuctionId(db, ev.args.auctionKey);
  if (!auctionId) return;
  await db.update(auctions).set({ status: 'CLOSED' }).where(eq(auctions.id, auctionId));
}

// ─── Dispatcher ─────────────────────────────────────────────

const HANDLERS: Record<string, (db: Db, ev: any) => Promise<void>> = {
  RoundScheduled: onRoundScheduled,
  AuctionRegistered: onAuctionRegistered,
  BidPlaced: onBidPlaced,
  Closed: onClosed,
  // Fase 3.2 akan menambahkan:
  // AwardingStarted, AwardSigned, Defaulted, PassedIn,
  // Collected, ClaimPeriodStarted, WithdrawnItem, Withdrawal, Settled
};

export async function processEvents(db: Db, limit = 200): Promise<{ processed: number; failed: number }> {
  const pending = await db
    .select()
    .from(chainEvents)
    .where(eq(chainEvents.processed, false))
    .limit(limit);

  let ok = 0, failed = 0;
  for (const ev of pending) {
    const h = HANDLERS[ev.eventName];
    if (!h) {
      // Tidak ada handler (FeeCredited — derived tidak butuh). Mark processed supaya tidak nyangkut.
      await db.update(chainEvents).set({ processed: true }).where(eq(chainEvents.id, ev.id));
      ok++;
      continue;
    }
    try {
      await h(db, ev);
      await db.update(chainEvents).set({ processed: true }).where(eq(chainEvents.id, ev.id));
      ok++;
    } catch (err) {
      console.error(`[handler fail] ${ev.eventName} tx=${ev.txHash}:`, err);
      failed++;
    }
  }
  return { processed: ok, failed };
}