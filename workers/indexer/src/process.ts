// @file workers/indexer/src/process.ts
import { eq, inArray, sql } from 'drizzle-orm';
import { keccak256, toBytes } from 'viem';
import {
  chainEvents, auctions, auctionRounds, bids, bidderStakes, withdrawals
} from '../../../packages/db/src/schema';

type Db = any;

async function buildAuctionMap(db: Db): Promise<Map<string, string>> {
  const rows = await db.select({ id: auctions.id, auctionCode: auctions.auctionCode }).from(auctions);
  const map = new Map<string, string>();
  for (const r of rows) {
    map.set(keccak256(toBytes(r.auctionCode)), r.id);
  }
  return map;
}

type TxCache = Map<string, number>;
async function getTxIndex(client: any, txHash: string, cache: TxCache): Promise<number> {
  if (cache.has(txHash)) return cache.get(txHash)!;
  const tx = await client.getTransaction({ hash: txHash as `0x${string}` });
  const i = tx.transactionIndex;
  cache.set(txHash, i);
  return i;
}

// 1 Subrequest: Window Function untuk rank
async function recomputeRanks(db: Db, auctionId: string, roundNo: number) {
  await db.execute(sql`
    UPDATE bidder_stakes AS bs
    SET rank = r.new_rank
    FROM (
      SELECT bidder_wallet, ROW_NUMBER() OVER (ORDER BY my_bid DESC, reached_seq ASC) as new_rank
      FROM bidder_stakes
      WHERE auction_id = ${auctionId} AND round_no = ${roundNo}
    ) AS r
    WHERE bs.auction_id = ${auctionId} AND bs.round_no = ${roundNo} AND bs.bidder_wallet = r.bidder_wallet
    AND bs.rank IS DISTINCT FROM (CASE WHEN r.new_rank <= 10 THEN r.new_rank::int ELSE NULL END);
  `);
}

export async function processEvents(db: Db, client: any, limit = 50) {
  const auctionMap = await buildAuctionMap(db);        
  const txCache: TxCache = new Map();                  

  const pending = await db
    .select()
    .from(chainEvents)
    .where(eq(chainEvents.processed, false))
    .limit(limit);

  if (pending.length === 0) return { processed: 0, failed: 0 };

  let ok = 0, failed = 0;

  // Tempat penampungan sementara (Batch Arrays)
  const processedIds: number[] = [];
  const newBids: any[] = [];
  const newStakes: any[] = [];
  const newWithdrawals: any[] = [];
  const auctionStatusUpdates = new Map<string, string>(); // auctionId -> status
  const stakesToRecompute = new Set<string>(); // `${auctionId}:${roundNo}`

  for (const ev of pending) {
    try {
      const auctionId = ev.args.auctionKey ? auctionMap.get(ev.args.auctionKey) : null;
      
      // Jika butuh auctionId tapi tidak ketemu, skip (nanti di-retry)
      const requiresAuction = !['FeeCredited'].includes(ev.eventName);
      if (requiresAuction && !auctionId) {
        throw new Error(`auction not found for key ${ev.args.auctionKey}`);
      }

      switch (ev.eventName) {
        case 'AuctionRegistered':
          auctionStatusUpdates.set(auctionId!, 'SCHEDULED');
          break;

        case 'RoundScheduled':
          await db.insert(auctionRounds).values({
            auctionId, roundNo: Number(ev.args.roundNo),
            startingBid: BigInt(ev.args.startingBid),
            bidIncrement: BigInt(ev.args.bidIncrement),
            openAt: new Date(Number(ev.args.openAt) * 1000),
            closeAt: new Date(Number(ev.args.closeAt) * 1000),
            durationHours: Math.round((Number(ev.args.closeAt) - Number(ev.args.openAt)) / 3600),
            scheduledAt: ev.blockTs,
          }).onConflictDoNothing();
          break;

        case 'BidPlaced': {
          const roundNo = Number(ev.args.roundNo);
          const bidder = ev.args.bidder.toLowerCase();
          const txIndex = await getTxIndex(client, ev.txHash, txCache);

          newBids.push({
            auctionId, roundNo,
            phase: ev.args.isPreBid ? 'PRE_BID' : 'LIVE_BID',
            bidderWallet: bidder,
            amountAdded: BigInt(ev.args.added),
            myBidAfter: BigInt(ev.args.myBidAfter),
            currentBidAfter: BigInt(ev.args.currentBidAfter),
            seq: BigInt(ev.args.seq),
            blockNumber: BigInt(ev.blockNumber),
            txIndex, logIndex: ev.logIndex, blockTs: ev.blockTs, txHash: ev.txHash,
          });

          newStakes.push({
            auctionId, roundNo, bidderWallet: bidder,
            myBid: BigInt(ev.args.myBidAfter),
            reachedSeq: BigInt(ev.args.seq),
            status: 'ACTIVE',
          });

          stakesToRecompute.add(`${auctionId}:${roundNo}`);
          break;
        }

        case 'AwardingStarted':
          auctionStatusUpdates.set(auctionId!, 'AWARDING');
          break;

        case 'AwardSigned':
          auctionStatusUpdates.set(auctionId!, 'COLLECTION');
          await db.update(bidderStakes).set({ status: 'WINNER' })
            .where(sql`${bidderStakes.auctionId} = ${auctionId} AND ${bidderStakes.roundNo} = ${ev.args.roundNo} AND ${bidderStakes.bidderWallet} = ${ev.args.winner.toLowerCase()}`);
          break;

        case 'Defaulted':
          await db.update(bidderStakes).set({ status: 'DEFAULTED' })
            .where(sql`${bidderStakes.auctionId} = ${auctionId} AND ${bidderStakes.roundNo} = ${ev.args.roundNo} AND ${bidderStakes.bidderWallet} = ${ev.args.candidate.toLowerCase()}`);
          break;

        case 'PassedIn':
          auctionStatusUpdates.set(auctionId!, 'PASSED_IN');
          break;

        case 'Collected':
        case 'ClaimPeriodStarted':
          auctionStatusUpdates.set(auctionId!, 'CLAIM_PERIOD');
          break;

        case 'Settled':
          auctionStatusUpdates.set(auctionId!, 'SETTLED');
          break;

        case 'WithdrawnItem':
          auctionStatusUpdates.set(auctionId!, 'WITHDRAWN');
          break;

        case 'Withdrawal': {
          const kindMap = ['REFUND', 'CONSIGNOR_PAYOUT', 'FEE_BALANCE'];
          newWithdrawals.push({
            auctionId,
            roundNo: Number(ev.args.roundNo),
            wallet: ev.args.wallet.toLowerCase(),
            kind: kindMap[Number(ev.args.kind)],
            grossAmount: BigInt(ev.args.gross),
            withdrawFee: BigInt(ev.args.fee),
            netAmount: BigInt(ev.args.net),
            relayed: false,
            txHash: ev.txHash,
          });
          break;
        }

        case 'FeeCredited':
          // DIABAIKAN: Tidak ada auctionKey, tidak cocok dengan skema payouts.
          // Biarkan ter-mark processed tanpa mengubah DB.
          break;

        case 'Closed':
          // Status CLOSED terjadi transisi waktu. Bisa diabaikan karena langsung ke AWARDING/PASSED_IN.
          break;
      }

      processedIds.push(ev.id);
      ok++;
    } catch (err) {
      console.error(`[handler fail] ${ev.eventName} tx=${ev.txHash}:`, err);
      failed++;
    }
  }

  // ─── EKSEKUSI BATCH (Hanya ~5 Subrequest) ─────────────────────
  if (processedIds.length > 0) {
    await db.update(chainEvents).set({ processed: true }).where(inArray(chainEvents.id, processedIds));
  }

  if (newBids.length > 0) {
    await db.insert(bids).values(newBids).onConflictDoNothing();
  }

  if (newStakes.length > 0) {
    // Upsert batch untuk bidder_stakes
    await db.insert(bidderStakes).values(newStakes).onConflictDoUpdate({
      target: [bidderStakes.auctionId, bidderStakes.roundNo, bidderStakes.bidderWallet],
      set: { myBid: sql`EXCLUDED.my_bid`, reachedSeq: sql`EXCLUDED.reached_seq` }
    });
  }

  if (newWithdrawals.length > 0) {
    await db.insert(withdrawals).values(newWithdrawals).onConflictDoNothing();
  }

  // Update status lelang
  for (const [aId, status] of auctionStatusUpdates.entries()) {
    await db.update(auctions).set({ status }).where(eq(auctions.id, aId));
  }

  // Recompute ranks (hanya untuk round yang ada bid baru)
  for (const key of stakesToRecompute) {
    const [aId, rNo] = key.split(':');
    await recomputeRanks(db, aId, Number(rNo));
  }

  return { processed: ok, failed };
}