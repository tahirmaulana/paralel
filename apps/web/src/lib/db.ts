// @file apps/web/src/lib/db.ts — Server-side read-only Drizzle queries
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import * as schema from '@db/schema';
import { DB_FEED_STATUSES, type DbFeedStatus } from './web3';

const sqlClient = neon(process.env.DATABASE_URL!);
const db = drizzle(sqlClient, { schema });

// ─── PUBLIC QUERIES ──────────────────────────────────────────

export type AuctionRow = {
  id: string;
  auctionCode: string;
  status: string;
  currentRound: number;
  category: string;
  title: string | null;
  startingBid: bigint;
  currentBid: bigint;
  bidCount: number;
  openAt: Date;
  closeAt: Date;
  createdAt: Date;
};

export type ListFilter =
  | { kind: 'all' }
  | { kind: 'live' }
  | { kind: 'processing' }
  | { kind: 'ended' }
  | { kind: 'status'; status: DbFeedStatus };

const LIVE: DbFeedStatus[] = ['SCHEDULED', 'OPEN'];
const PROCESSING: DbFeedStatus[] = ['CLOSED', 'AWARDING', 'COLLECTION', 'CLAIM_PERIOD'];
const ENDED: DbFeedStatus[] = ['SETTLED', 'PASSED_IN', 'WITHDRAWN'];

function statusesOf(filter: ListFilter): DbFeedStatus[] {
  switch (filter.kind) {
    case 'live': return LIVE;
    case 'processing': return PROCESSING;
    case 'ended': return ENDED;
    case 'status': return [filter.status];
    case 'all':
    default: return [...DB_FEED_STATUSES];
  }
}

export async function listAuctions(
  filter: ListFilter = { kind: 'all' },
): Promise<AuctionRow[]> {
  const statuses = statusesOf(filter);

  const rows = await db
    .select({
      id: schema.auctions.id,
      auctionCode: schema.auctions.auctionCode,
      status: schema.auctions.status,
      currentRound: schema.auctions.currentRound,
      category: schema.auctions.category,
      title: schema.auctionAssets.title,
      startingBid: schema.auctionRounds.startingBid,
      currentBid: sql<bigint>`COALESCE((
        SELECT MAX(bs.my_bid) FROM bidder_stakes bs
        WHERE bs.auction_id = ${schema.auctions.id}
          AND bs.round_no = ${schema.auctions.currentRound}
      ), 0)`,
      bidCount: sql<number>`(
        SELECT COUNT(*)::int FROM bids b
        WHERE b.auction_id = ${schema.auctions.id}
          AND b.round_no = ${schema.auctions.currentRound}
      )`,
      openAt: schema.auctionRounds.openAt,
      closeAt: schema.auctionRounds.closeAt,
      createdAt: schema.auctions.createdAt,
    })
    .from(schema.auctions)
    .leftJoin(
      schema.auctionAssets,
      eq(schema.auctionAssets.auctionId, schema.auctions.id),
    )
    .innerJoin(
      schema.auctionRounds,
      and(
        eq(schema.auctionRounds.auctionId, schema.auctions.id),
        eq(schema.auctionRounds.roundNo, schema.auctions.currentRound),
      ),
    )
    .where(inArray(schema.auctions.status, statuses))
    .orderBy(desc(schema.auctions.createdAt));

  return rows as AuctionRow[];
}

export type AuctionDetail = {
  auction: typeof schema.auctions.$inferSelect;
  assets: typeof schema.auctionAssets.$inferSelect | null;
  round: typeof schema.auctionRounds.$inferSelect;
  consignorWallet: `0x${string}`;
  guarantorWallet: `0x${string}`;
  notaryWallet: `0x${string}`;
};

export async function getAuctionDetail(
  auctionCode: string,
): Promise<AuctionDetail | null> {
  const [row] = await db
    .select({
      auction: schema.auctions,
      assets: schema.auctionAssets,
      round: schema.auctionRounds,
      consignorWallet: sql<string>`(SELECT wallet FROM users WHERE id = ${schema.auctions.consignorId})`,
      guarantorWallet: sql<string>`(SELECT u.wallet FROM partners p JOIN users u ON u.id = p.user_id WHERE p.id = ${schema.auctions.guarantorId})`,
      notaryWallet: sql<string>`(SELECT u.wallet FROM partners p JOIN users u ON u.id = p.user_id WHERE p.id = ${schema.auctions.notaryId})`,
    })
    .from(schema.auctions)
    .leftJoin(
      schema.auctionAssets,
      eq(schema.auctionAssets.auctionId, schema.auctions.id),
    )
    .innerJoin(
      schema.auctionRounds,
      and(
        eq(schema.auctionRounds.auctionId, schema.auctions.id),
        eq(schema.auctionRounds.roundNo, schema.auctions.currentRound),
      ),
    )
    .where(eq(schema.auctions.auctionCode, auctionCode))
    .limit(1);

  if (!row) return null;

  return {
    auction: row.auction,
    assets: row.assets,
    round: row.round,
    consignorWallet: row.consignorWallet.toLowerCase() as `0x${string}`,
    guarantorWallet: row.guarantorWallet.toLowerCase() as `0x${string}`,
    notaryWallet: row.notaryWallet.toLowerCase() as `0x${string}`,
  };
}

// ─── NOTARY QUERIES ──────────────────────────────────────────

export async function getNotaryByWallet(wallet: string) {
  const [row] = await db
    .select({
      partnerId: schema.partners.id,
      name: schema.partners.name,
      email: schema.users.email,
      wallet: schema.users.wallet,
    })
    .from(schema.partners)
    .innerJoin(schema.users, eq(schema.users.id, schema.partners.userId))
    .where(
      and(
        eq(schema.partners.type, 'NOTARY'),
        eq(schema.users.wallet, wallet.toLowerCase())
      )
    )
    .limit(1);
  return row ?? null;
}