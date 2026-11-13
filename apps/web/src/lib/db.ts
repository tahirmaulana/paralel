// @file apps/web/src/lib/db.ts — Server-side Drizzle queries
// NO JSX. NO React. Only DB functions.
import { neon } from '@neondatabase/serverless';
import { keccak256, toBytes } from 'viem';
import { drizzle } from 'drizzle-orm/neon-http';
import { and, desc, eq, inArray, isNull, or, sql } from 'drizzle-orm';
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
    .where(
      and(
        eq(schema.auctions.auctionCode, auctionCode),
        inArray(schema.auctions.status, DB_FEED_STATUSES),
      ),
    )
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

// ─── NOTARY: PROFILE ─────────────────────────────────────────

export type NotaryProfile = {
  partnerId: string;
  name: string;
  email: string | null;
  wallet: string;
};

export async function getNotaryByWallet(
  wallet: string,
): Promise<NotaryProfile | null> {
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
        eq(schema.partners.active, true),
        sql`LOWER(${schema.users.wallet}) = ${wallet.toLowerCase()}`,
      ),
    )
    .limit(1);
  return row ?? null;
}

// ─── NOTARY: SUBMISSION ──────────────────────────────────────

export type NotaryPendingApproval = {
  auctionId: string;
  auctionCode: string;
  title: string | null;
  startingBid: bigint;
  bidIncrement: bigint;
  openAt: Date;
  durationHours: number;
  consignorWallet: string;
  guarantorName: string;
  hasGuarantorApproval: boolean;
  guarantorApprovedAt: Date | null;
  pendingAt: Date | null;
};

function normalizeDatabaseTimestamp(
  value: Date | string | null,
): Date | null {
  if (value === null) {
    return null;
  }

  const timestamp =
    value instanceof Date
      ? value
      : new Date(value);

  if (!Number.isFinite(timestamp.getTime())) {
    throw new Error(
      'Database returned an invalid attestation timestamp.',
    );
  }

  return timestamp;
}

export async function getNotaryPendingApprovals(): Promise<NotaryPendingApproval[]> {
  const rows = await db
    .select({
      auctionId: schema.auctions.id,
      auctionCode: schema.auctions.auctionCode,
      title: schema.auctionAssets.title,
      startingBid: schema.auctionRounds.startingBid,
      bidIncrement: schema.auctionRounds.bidIncrement,
      openAt: schema.auctionRounds.openAt,
      durationHours: schema.auctionRounds.durationHours,
      pendingAt: schema.auctions.pendingAt,
      consignorWallet: sql<string>`(SELECT wallet FROM users WHERE id = ${schema.auctions.consignorId})`,
      guarantorName: sql<string>`(SELECT name FROM partners WHERE id = ${schema.auctions.guarantorId})`,
      guarantorApprovedAt: sql<Date | string | null>`(
        SELECT created_at FROM attestations
        WHERE auction_id = ${schema.auctions.id}
          AND type = 'GUARANTOR_APPROVED'
        LIMIT 1
      )`,
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
    .where(
      and(
        eq(schema.auctions.status, 'PENDING'),
        sql`NOT EXISTS (
          SELECT 1 FROM attestations
          WHERE auction_id = ${schema.auctions.id}
            AND type = 'NOTARY_APPROVED'
        )`,
      ),
    )
    .orderBy(
      sql`(SELECT created_at FROM attestations WHERE auction_id = ${schema.auctions.id} AND type = 'GUARANTOR_APPROVED' LIMIT 1) ASC NULLS LAST`,
      sql`${schema.auctions.pendingAt} ASC NULLS LAST`,
    );

  return rows.map((r) => ({
    auctionId: r.auctionId,
    auctionCode: r.auctionCode,
    title: r.title,
    startingBid: r.startingBid,
    bidIncrement: r.bidIncrement,
    openAt: r.openAt,
    durationHours: r.durationHours,
    consignorWallet: r.consignorWallet.toLowerCase(),
    guarantorName: r.guarantorName,
    hasGuarantorApproval: r.guarantorApprovedAt !== null,
    guarantorApprovedAt: normalizeDatabaseTimestamp(
      r.guarantorApprovedAt,
    ),
    pendingAt: r.pendingAt,
  }));
}

// ─── NOTARY: COLLECTIONS ────────────────────────────────────

export type NotaryCollectionRow = {
  auctionId: string;
  auctionCode: string;
  title: string | null;
  status: string;
  currentRound: number;
  winnerWallet: string | null;
  updatedAt: Date;
};

export async function getNotaryCollections(
  wallet: string,
): Promise<NotaryCollectionRow[]> {
  const normalized = wallet.toLowerCase();
  const rows = await db
    .select({
      auctionId: schema.auctions.id,
      auctionCode: schema.auctions.auctionCode,
      title: schema.auctionAssets.title,
      status: schema.auctions.status,
      currentRound: schema.auctions.currentRound,
      updatedAt: schema.auctions.updatedAt,
      winnerWallet: sql<string | null>`(
        SELECT bidder_wallet FROM bidder_stakes
        WHERE auction_id = ${schema.auctions.id}
          AND round_no = ${schema.auctions.currentRound}
          AND status = 'WINNER'
        LIMIT 1
      )`,
    })
    .from(schema.auctions)
    .leftJoin(
      schema.auctionAssets,
      eq(schema.auctionAssets.auctionId, schema.auctions.id),
    )
    .where(
      and(
        inArray(schema.auctions.status, [
          'AWARDING',
          'COLLECTION',
          'CLAIM_PERIOD',
          'SETTLED',
        ]),
        sql`EXISTS (
          SELECT 1 FROM attestations
          WHERE auction_id = ${schema.auctions.id}
            AND type = 'NOTARY_APPROVED'
            AND LOWER(signer_wallet) = ${normalized}
        )`,
      ),
    )
    .orderBy(desc(schema.auctions.updatedAt));

  return rows as NotaryCollectionRow[];
}

// ─── NOTARY: RUN ────────────────────────────────────────────

export type NotaryRunRow = {
  auctionId: string;
  auctionCode: string;
  title: string | null;
  status: string;
  currentRound: number;
  startingBid: bigint;
  currentBid: bigint;
  closeAt: Date;
  openAt: Date;
  bidCount: number;
};

export async function getNotaryRunAuctions(): Promise<NotaryRunRow[]> {
  const rows = await db
    .select({
      auctionId: schema.auctions.id,
      auctionCode: schema.auctions.auctionCode,
      title: schema.auctionAssets.title,
      status: schema.auctions.status,
      currentRound: schema.auctions.currentRound,
      startingBid: schema.auctionRounds.startingBid,
      openAt: schema.auctionRounds.openAt,
      closeAt: schema.auctionRounds.closeAt,
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
    .where(inArray(schema.auctions.status, ['SCHEDULED', 'OPEN']));

  const now = Date.now();
  const enriched = rows.map((r) => {
    const isLive = r.status === 'OPEN' || r.openAt.getTime() <= now;
    return { ...r, _isLive: isLive } as NotaryRunRow & { _isLive: boolean };
  });

  enriched.sort((a, b) => {
    if (a._isLive !== b._isLive) return a._isLive ? -1 : 1;
    if (a._isLive) return a.closeAt.getTime() - b.closeAt.getTime();
    return a.openAt.getTime() - b.openAt.getTime();
  });

  return enriched.map(({ _isLive, ...r }) => r);
}

// ─── NOTARY: PASSED ────────────────────────────────────────

export type NotaryPassedRow = {
  auctionId: string;
  auctionCode: string;
  title: string | null;
  status: string;
  updatedAt: Date;
};

export async function getNotaryPassedAuctions(
  wallet: string,
): Promise<NotaryPassedRow[]> {
  const normalized = wallet.toLowerCase();
  const rows = await db
    .select({
      auctionId: schema.auctions.id,
      auctionCode: schema.auctions.auctionCode,
      title: schema.auctionAssets.title,
      status: schema.auctions.status,
      updatedAt: schema.auctions.updatedAt,
    })
    .from(schema.auctions)
    .leftJoin(
      schema.auctionAssets,
      eq(schema.auctionAssets.auctionId, schema.auctions.id),
    )
    .where(
      and(
        inArray(schema.auctions.status, ['PASSED_IN', 'WITHDRAWN']),
        sql`EXISTS (
          SELECT 1 FROM attestations
          WHERE auction_id = ${schema.auctions.id}
            AND type = 'NOTARY_APPROVED'
            AND signer_wallet = ${normalized}
        )`,
      ),
    )
    .orderBy(desc(schema.auctions.updatedAt));

  return rows as NotaryPassedRow[];
}

// ─── GUARANTOR QUERIES ─────────────────────────────────────

export type GuarantorProfile = {
  partnerId: string;
  userId: string;
  name: string;
  email: string | null;
  wallet: string;
};

export async function getGuarantorByWallet(
  wallet: string,
): Promise<GuarantorProfile | null> {
  const [row] = await db
    .select({
      partnerId: schema.partners.id,
      userId: schema.users.id,
      name: schema.partners.name,
      email: schema.users.email,
      wallet: schema.users.wallet,
    })
    .from(schema.partners)
    .innerJoin(schema.users, eq(schema.users.id, schema.partners.userId))
    .where(
      and(
        eq(schema.partners.type, 'GUARANTOR'),
        eq(schema.partners.active, true),
        sql`LOWER(${schema.users.wallet}) = ${wallet.toLowerCase()}`,
      ),
    )
    .limit(1);
  return row ?? null;
}

export type GuarantorSubmissionRow = {
  auctionId: string;
  auctionCode: string;
  auctionKey: `0x${string}`;
  title: string | null;
  consignorWallet: string;
  startingBid: bigint;
  pendingAt: Date | null;
  specHash: `0x${string}`;
  hasGuarantorApproval: boolean;
  hasNotaryApproval: boolean;
};

export async function getGuarantorSubmission(
  partnerId: string,
): Promise<GuarantorSubmissionRow[]> {
  const rows = await db
    .select({
      auctionId: schema.auctions.id,
      auctionCode: schema.auctions.auctionCode,
      title: schema.auctionAssets.title,
      pendingAt: schema.auctions.pendingAt,
      startingBid: schema.auctionRounds.startingBid,
      specHash: schema.auctionAssets.specHash,
      consignorWallet: sql<string>`(SELECT wallet FROM users WHERE id = ${schema.auctions.consignorId})`,
      hasGuarantorApproval: sql<boolean>`EXISTS (
        SELECT 1 FROM attestations
        WHERE auction_id = ${schema.auctions.id}
          AND type = 'GUARANTOR_APPROVED'
      )`,
      hasNotaryApproval: sql<boolean>`EXISTS (
        SELECT 1 FROM attestations
        WHERE auction_id = ${schema.auctions.id}
          AND type = 'NOTARY_APPROVED'
      )`,
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
    .where(
      and(
        eq(schema.auctions.guarantorId, partnerId),
        eq(schema.auctions.status, 'PENDING'),
      ),
    )
    .orderBy(sql`${schema.auctions.pendingAt} ASC NULLS LAST`);

  return rows
    .filter((r) => r.specHash !== null)
    .map((r) => ({
      auctionId: r.auctionId,
      auctionCode: r.auctionCode,
      auctionKey: keccak256(toBytes(r.auctionCode)),
      title: r.title,
      consignorWallet: r.consignorWallet.toLowerCase(),
      startingBid: r.startingBid,
      pendingAt: r.pendingAt,
      specHash: `0x${Buffer.from(r.specHash!).toString('hex')}` as `0x${string}`,
      hasGuarantorApproval: r.hasGuarantorApproval,
      hasNotaryApproval: r.hasNotaryApproval,
    }));
}

export type GuarantorCollectionRow = {
  auctionId: string;
  auctionCode: string;
  auctionKey: `0x${string}`;
  title: string | null;
  currentRound: number;
  winnerWallet: string | null;
  winnerStake: bigint | null;
  updatedAt: Date;
};

export async function getGuarantorCollection(
  partnerId: string,
): Promise<GuarantorCollectionRow[]> {
  const rows = await db
    .select({
      auctionId: schema.auctions.id,
      auctionCode: schema.auctions.auctionCode,
      title: schema.auctionAssets.title,
      currentRound: schema.auctions.currentRound,
      updatedAt: schema.auctions.updatedAt,
      winnerWallet: sql<string | null>`(
        SELECT bidder_wallet FROM bidder_stakes
        WHERE auction_id = ${schema.auctions.id}
          AND round_no = ${schema.auctions.currentRound}
          AND status = 'WINNER'
        LIMIT 1
      )`,
      winnerStake: sql<bigint | null>`(
        SELECT my_bid FROM bidder_stakes
        WHERE auction_id = ${schema.auctions.id}
          AND round_no = ${schema.auctions.currentRound}
          AND status = 'WINNER'
        LIMIT 1
      )`,
    })
    .from(schema.auctions)
    .innerJoin(
      schema.auctionAssets,
      eq(schema.auctionAssets.auctionId, schema.auctions.id),
    )
    .where(
      and(
        eq(schema.auctions.guarantorId, partnerId),
        eq(schema.auctions.status, 'COLLECTION'),
      ),
    )
    .orderBy(sql`${schema.auctions.updatedAt} ASC`);

  return rows.map((r) => ({
    auctionId: r.auctionId,
    auctionCode: r.auctionCode,
    auctionKey: keccak256(toBytes(r.auctionCode)),
    title: r.title,
    currentRound: r.currentRound,
    winnerWallet: r.winnerWallet?.toLowerCase() ?? null,
    winnerStake: r.winnerStake,
    updatedAt: r.updatedAt,
  }));
}

export type GuarantorWithdrawalRow = {
  auctionId: string;
  auctionCode: string;
  auctionKey: `0x${string}`;
  title: string | null;
  currentRound: number;
  consignorWallet: string;
  updatedAt: Date;
};

export async function getGuarantorWithdrawal(
  partnerId: string,
): Promise<GuarantorWithdrawalRow[]> {
  const rows = await db
    .select({
      auctionId: schema.auctions.id,
      auctionCode: schema.auctions.auctionCode,
      title: schema.auctionAssets.title,
      currentRound: schema.auctions.currentRound,
      updatedAt: schema.auctions.updatedAt,
      consignorWallet: sql<string>`(SELECT wallet FROM users WHERE id = ${schema.auctions.consignorId})`,
    })
    .from(schema.auctions)
    .leftJoin(
      schema.auctionAssets,
      eq(schema.auctionAssets.auctionId, schema.auctions.id),
    )
    .where(
      and(
        eq(schema.auctions.guarantorId, partnerId),
        eq(schema.auctions.status, 'PASSED_IN'),
      ),
    )
    .orderBy(sql`${schema.auctions.updatedAt} ASC`);

  return rows.map((r) => ({
    auctionId: r.auctionId,
    auctionCode: r.auctionCode,
    auctionKey: keccak256(toBytes(r.auctionCode)),
    title: r.title,
    currentRound: r.currentRound,
    consignorWallet: r.consignorWallet.toLowerCase(),
    updatedAt: r.updatedAt,
  }));
}

export type GuarantorRunRow = {
  auctionId: string;
  auctionCode: string;
  title: string | null;
  status: string;
  currentRound: number;
  startingBid: bigint;
  currentBid: bigint;
  openAt: Date;
  closeAt: Date;
  bidCount: number;
  updatedAt: Date;
};

export async function getGuarantorRun(
): Promise<GuarantorRunRow[]> {
  const rows = await db
    .select({
      auctionId: schema.auctions.id,
      auctionCode: schema.auctions.auctionCode,
      title: schema.auctionAssets.title,
      status: schema.auctions.status,
      currentRound: schema.auctions.currentRound,
      startingBid: schema.auctionRounds.startingBid,
      openAt: schema.auctionRounds.openAt,
      closeAt: schema.auctionRounds.closeAt,
      updatedAt: schema.auctions.updatedAt,
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
    .where(
      inArray(schema.auctions.status, ['SCHEDULED', 'OPEN', 'AWARDING']),
    );

  const now = Date.now();
  const enriched = rows.map((r) => {
    const isLive = r.status === 'OPEN' || (r.status === 'SCHEDULED' && r.openAt.getTime() <= now);
    return { ...r, _isLive: isLive } as GuarantorRunRow & { _isLive: boolean };
  });

  enriched.sort((a, b) => {
    if (a._isLive !== b._isLive) return a._isLive ? -1 : 1;
    if (a._isLive) return a.closeAt.getTime() - b.closeAt.getTime();
    if (a.status === 'SCHEDULED' && b.status === 'SCHEDULED') {
      return a.openAt.getTime() - b.openAt.getTime();
    }
    if (a.status === 'AWARDING' && b.status === 'AWARDING') {
      return b.updatedAt.getTime() - a.updatedAt.getTime();
    }
    return 0;
  });

  return enriched.map(({ _isLive, ...r }) => r);
}

export type GuarantorHistoryRow = {
  auctionId: string;
  auctionCode: string;
  title: string | null;
  status: string;
  updatedAt: Date;
};

export async function getGuarantorHistory(
  partnerId: string,
): Promise<GuarantorHistoryRow[]> {
  const rows = await db
    .select({
      auctionId: schema.auctions.id,
      auctionCode: schema.auctions.auctionCode,
      title: schema.auctionAssets.title,
      status: schema.auctions.status,
      updatedAt: schema.auctions.updatedAt,
    })
    .from(schema.auctions)
    .leftJoin(
      schema.auctionAssets,
      eq(schema.auctionAssets.auctionId, schema.auctions.id),
    )
    .where(
      and(
        eq(schema.auctions.guarantorId, partnerId),
        inArray(schema.auctions.status, [
          'SETTLED',
          'PASSED_IN',
          'WITHDRAWN',
          'CANCELED',
          'REJECTED',
        ]),
      ),
    )
    .orderBy(desc(schema.auctions.updatedAt));

  return rows as GuarantorHistoryRow[];
}

// ─── Receipt data ──────────────────────────────────────────

export type ReceiptData = {
  auctionId: string;
  auctionCode: string;
  auctionKey: `0x${string}`;
  currentRound: number;
  title: string;
  description: string;
  category: string;
  condition: string;
  specHash: `0x${string}`;
  consignorWallet: string | null;
  consignorName: string | null;
  guarantorName: string;
  winnerWallet: string | null;
  winnerName: string | null;
  winnerStake: bigint | null;
  status: string;
  pendingAt: Date | null;
  guarantorApprovedAt: Date | null;
  awardedAt: Date | null;
  collectionDeadline: Date | null;
  claimEnd: Date | null;
};

export async function getReceiptData(
  auctionId: string,
  type: 'consignment' | 'collection' | 'withdrawal',
): Promise<ReceiptData | null> {
  const [row] = await db
    .select({
      auctionId: schema.auctions.id,
      auctionCode: schema.auctions.auctionCode,
      currentRound: schema.auctions.currentRound,
      status: schema.auctions.status,
      pendingAt: schema.auctions.pendingAt,
      updatedAt: schema.auctions.updatedAt,
      title: schema.auctionAssets.title,
      description: schema.auctionAssets.description,
      category: schema.auctions.category,
      condition: schema.auctionAssets.condition,
      specHash: schema.auctionAssets.specHash,
      consignorWallet: sql<string>`(SELECT wallet FROM users WHERE id = ${schema.auctions.consignorId})`,
      consignorName: sql<string | null>`(
        SELECT k.full_name FROM kyc_profiles k
        WHERE k.user_id = ${schema.auctions.consignorId}
        LIMIT 1
      )`,
      guarantorName: sql<string>`(SELECT name FROM partners WHERE id = ${schema.auctions.guarantorId})`,
      winnerWallet: sql<string | null>`(
        SELECT bidder_wallet FROM bidder_stakes
        WHERE auction_id = ${schema.auctions.id}
          AND round_no = ${schema.auctions.currentRound}
          AND status = 'WINNER'
        LIMIT 1
      )`,
      winnerName: sql<string | null>`(
        SELECT k.full_name FROM kyc_profiles k
        JOIN users u ON u.id = k.user_id
        WHERE LOWER(u.wallet) = LOWER((
          SELECT bidder_wallet FROM bidder_stakes
          WHERE auction_id = ${schema.auctions.id}
            AND round_no = ${schema.auctions.currentRound}
            AND status = 'WINNER'
          LIMIT 1
        ))
        LIMIT 1
      )`,
      winnerStake: sql<bigint | null>`(
        SELECT my_bid FROM bidder_stakes
        WHERE auction_id = ${schema.auctions.id}
          AND round_no = ${schema.auctions.currentRound}
          AND status = 'WINNER'
        LIMIT 1
      )`,
      guarantorApprovedAt: sql<Date | string | null>`(
        SELECT created_at FROM attestations
        WHERE auction_id = ${schema.auctions.id}
          AND type = 'GUARANTOR_APPROVED'
        LIMIT 1
      )`,
      collectionDeadline: sql<Date | string | null>`(
        SELECT collection_deadline FROM auction_rounds
        WHERE auction_id = ${schema.auctions.id}
          AND round_no = ${schema.auctions.currentRound}
        LIMIT 1
      )`,
      claimPeriodEnd: sql<Date | string | null>`(
        SELECT claim_period_end FROM auction_rounds
        WHERE auction_id = ${schema.auctions.id}
          AND round_no = ${schema.auctions.currentRound}
        LIMIT 1
      )`,
    })
    .from(schema.auctions)
    .leftJoin(
      schema.auctionAssets,
      eq(schema.auctionAssets.auctionId, schema.auctions.id),
    )
    .where(eq(schema.auctions.id, auctionId))
    .limit(1);

  if (!row || !row.title || !row.description || !row.condition) return null;

  const guarantorApprovedAt =
    normalizeDatabaseTimestamp(
      row.guarantorApprovedAt,
    );

  if (type === 'consignment' && !guarantorApprovedAt) return null;
  if (type === 'collection' && !['COLLECTION', 'CLAIM_PERIOD', 'SETTLED'].includes(row.status)) return null;
  if (type === 'withdrawal' && !['PASSED_IN', 'WITHDRAWN'].includes(row.status)) return null;

  const collectionDeadline = normalizeDatabaseTimestamp(
    row.collectionDeadline,
  );
  const claimEnd = normalizeDatabaseTimestamp(
    row.claimPeriodEnd,
  );

  return {
    auctionId: row.auctionId,
    auctionCode: row.auctionCode,
    auctionKey: keccak256(toBytes(row.auctionCode)),
    currentRound: row.currentRound,
    title: row.title,
    description: row.description,
    category: row.category,
    condition: row.condition,
    specHash: `0x${Buffer.from(row.specHash!).toString('hex')}` as `0x${string}`,
    consignorWallet: row.consignorWallet?.toLowerCase() ?? null,
    consignorName: row.consignorName,
    guarantorName: row.guarantorName,
    winnerWallet: row.winnerWallet?.toLowerCase() ?? null,
    winnerName: row.winnerName,
    winnerStake: row.winnerStake,
    status: row.status,
    pendingAt: row.pendingAt,
    guarantorApprovedAt,
    awardedAt: type === 'collection' ? row.updatedAt : null,
    collectionDeadline: type === 'collection' ? collectionDeadline : null,
    claimEnd: type === 'collection' ? claimEnd : null,
  };
}

// ─── USER (BIDDER & CONSIGNOR) ──────────────────────────────

export type UserKycStatus = {
  userId: string | null;
  kycStatus: 'NONE' | 'UNVERIFIED' | 'VERIFIED';
  adminComment: string | null;
  verifiedAt: Date | null;
};

// ... kode di atasnya tetap sama ...

export async function getUserKycStatus(wallet: string): Promise<UserKycStatus> {
  const normalizedWallet = wallet.toLowerCase();

  // Menggunakan raw SQL langsung untuk mem-bypass cache Next.js/Drizzle
  const rows = await sqlClient`
    SELECT
      u.id AS user_id,
      k.status,
      k.admin_comment,
      k.verified_at
    FROM users u
    LEFT JOIN kyc_profiles k ON k.user_id = u.id
    WHERE LOWER(u.wallet) = ${normalizedWallet}
    LIMIT 1
  `;

  if (rows.length === 0) {
    return {
      userId: null,
      kycStatus: 'NONE',
      adminComment: null,
      verifiedAt: null,
    };
  }

  const row = rows[0];
  return {
    userId: row.user_id as string,
    kycStatus: (row.status as UserKycStatus['kycStatus']) ?? 'NONE',
    adminComment: row.admin_comment as string | null,
    verifiedAt: row.verified_at ? new Date(row.verified_at as string) : null,
  };
}

export async function getUserLiveAuctions(wallet: string) {
  const normalized = wallet.toLowerCase();
  const rows = await db
    .select({
      auctionId: schema.auctions.id,
      auctionCode: schema.auctions.auctionCode,
      title: schema.auctionAssets.title,
      status: schema.auctions.status,
      currentRound: schema.auctions.currentRound,
      startingBid: schema.auctionRounds.startingBid,
      openAt: schema.auctionRounds.openAt,
      closeAt: schema.auctionRounds.closeAt,
      currentBid: sql<bigint>`COALESCE((
        SELECT MAX(bs.my_bid) FROM bidder_stakes bs
        WHERE bs.auction_id = ${schema.auctions.id}
          AND bs.round_no = ${schema.auctions.currentRound}
      ), 0)`,
      myBid: sql<bigint | null>`(
        SELECT my_bid FROM bidder_stakes
        WHERE auction_id = ${schema.auctions.id}
          AND round_no = ${schema.auctions.currentRound}
          AND bidder_wallet = ${normalized}
        LIMIT 1
      )`,
      leaderWallet: sql<string | null>`(
        SELECT bidder_wallet FROM bidder_stakes
        WHERE auction_id = ${schema.auctions.id}
          AND round_no = ${schema.auctions.currentRound}
          AND rank = 1
        LIMIT 1
      )`,
    })
    .from(schema.auctions)
    .innerJoin(
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
    .where(inArray(schema.auctions.status, ['SCHEDULED', 'OPEN', 'AWARDING']));

  const leaderWallets = rows.map((r) => r.leaderWallet).filter(Boolean) as string[];
  const nameMap = new Map<string, string | null>();
  if (leaderWallets.length > 0) {
    const profiles = await db
      .select({ wallet: schema.users.wallet, name: schema.kycProfiles.fullName })
      .from(schema.users)
      .leftJoin(schema.kycProfiles, eq(schema.kycProfiles.userId, schema.users.id))
      .where(inArray(schema.users.wallet, leaderWallets));
    profiles.forEach((p) => nameMap.set(p.wallet, p.name));
  }

  return rows.map((r) => ({
    ...r,
    currentBid: BigInt(r.currentBid),
    startingBid: BigInt(r.startingBid),
    myBid: r.myBid ? BigInt(r.myBid) : null,
    closeAt: r.closeAt.toISOString(),
    openAt: r.openAt.toISOString(),
    leaderName: r.leaderWallet
      ? nameMap.get(r.leaderWallet) ||
        `${r.leaderWallet.slice(0, 6)}...${r.leaderWallet.slice(-4)}`
      : '—',
  }));
}

export async function getUserJoinedAuctions(wallet: string) {
  const normalized = wallet.toLowerCase();
  const rows = await db
    .select({
      auctionId: schema.auctions.id,
      auctionCode: schema.auctions.auctionCode,
      title: schema.auctionAssets.title,
      status: schema.auctions.status,
      currentRound: schema.auctions.currentRound,
      myBid: sql<bigint>`(
        SELECT MAX(my_bid) FROM bidder_stakes
        WHERE auction_id = ${schema.auctions.id}
          AND round_no = ${schema.auctions.currentRound}
          AND bidder_wallet = ${normalized}
      )`,
    })
    .from(schema.auctions)
    .innerJoin(
      schema.auctionAssets,
      eq(schema.auctionAssets.auctionId, schema.auctions.id),
    )
    .where(
      sql`EXISTS (
        SELECT 1 FROM bidder_stakes
        WHERE auction_id = ${schema.auctions.id}
          AND bidder_wallet = ${normalized}
      )`,
    );

  return rows.map((r) => ({
    ...r,
    myBid: r.myBid ? BigInt(r.myBid) : null,
  }));
}

export async function getUserCreatedAuctions(wallet: string) {
  const normalized = wallet.toLowerCase();
  const rows = await db
    .select({
      auctionId: schema.auctions.id,
      auctionCode: schema.auctions.auctionCode,
      title: schema.auctionAssets.title,
      status: schema.auctions.status,
      startingBid: schema.auctionRounds.startingBid,
    })
    .from(schema.auctions)
    .innerJoin(
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
    .where(
      sql`${schema.auctions.consignorId} = (
        SELECT id FROM users WHERE LOWER(wallet) = ${normalized}
      )`,
    );

  return rows.map((r) => ({
    ...r,
    startingBid: BigInt(r.startingBid),
  }));
}

// ─── ADMIN QUERIES (KYC) ────────────────────────────────────

export async function getUnverifiedKycList() {
  return await db
    .select({
      userId: schema.users.id,
      wallet: schema.users.wallet,
      fullName: schema.kycProfiles.fullName,
      nik: schema.kycProfiles.nik,
      address: schema.kycProfiles.address,
      ktpPhoto: schema.kycProfiles.ktpPhoto,
      adminComment: schema.kycProfiles.adminComment,
      createdAt: schema.kycProfiles.createdAt,
    })
    .from(schema.kycProfiles)
    .innerJoin(schema.users, eq(schema.users.id, schema.kycProfiles.userId))
    .where(
      and(
        eq(schema.kycProfiles.status, 'UNVERIFIED'),
        eq(schema.users.userType, 'PUBLIC'),
      ),
    )
    .orderBy(desc(schema.kycProfiles.createdAt));
}

export async function getAllUsersKycList() {
  return await db
    .select({
      userId: schema.users.id,
      wallet: schema.users.wallet,
      status: schema.kycProfiles.status,
      fullName: schema.kycProfiles.fullName,
      nik: schema.kycProfiles.nik,
      address: schema.kycProfiles.address,
      ktpPhoto: schema.kycProfiles.ktpPhoto,
      adminComment: schema.kycProfiles.adminComment,
      verifiedAt: schema.kycProfiles.verifiedAt,
    })
    .from(schema.users)
    .leftJoin(schema.kycProfiles, eq(schema.kycProfiles.userId, schema.users.id))
    .where(eq(schema.users.userType, 'PUBLIC'))
    .orderBy(desc(schema.users.createdAt));
}

export async function updateKycStatus(
  userId: string,
  status: 'VERIFIED' | 'UNVERIFIED',
  adminComment: string | null,
) {
  await db
    .update(schema.kycProfiles)
    .set({
      status,
      adminComment,
      verifiedAt: status === 'VERIFIED' ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(schema.kycProfiles.userId, userId));
}

// ─── USER ADMIN QUERIES (KYC-only scope) ───────────────────
// Ref: /.env USER_ADMIN_WALLET comment ("mengelola KYC user"),
//      PARALEL.md §16, existing /api/user-admin/review/route.ts.
// Mutations from user-admin = updateKycStatus ONLY.

export type UserAdminStats = {
  totalUsers: number;
  kycPending: number;
  kycVerified: number;
  kycNone: number;
};

export async function getUserAdminStats(): Promise<UserAdminStats> {
  const rows = await sqlClient`
    SELECT
      (SELECT COUNT(*)::int FROM users WHERE user_type = 'PUBLIC') AS "totalUsers",
      (SELECT COUNT(*)::int FROM kyc_profiles k
        JOIN users u ON u.id = k.user_id
        WHERE u.user_type = 'PUBLIC' AND k.status = 'UNVERIFIED') AS "kycPending",
      (SELECT COUNT(*)::int FROM kyc_profiles k
        JOIN users u ON u.id = k.user_id
        WHERE u.user_type = 'PUBLIC' AND k.status = 'VERIFIED') AS "kycVerified",
      (SELECT COUNT(*)::int FROM users u
        WHERE u.user_type = 'PUBLIC'
          AND NOT EXISTS (SELECT 1 FROM kyc_profiles k WHERE k.user_id = u.id))
                                                                            AS "kycNone"
  `;
  return rows[0] as UserAdminStats;
}

export type UserAdminFilter = {
  kycStatus?: 'UNVERIFIED' | 'VERIFIED' | 'NONE';
  search?: string;
};

export type UserAdminListItem = {
  userId: string;
  wallet: string;
  userType: string;
  email: string | null;
  preferredLanguage: string;
  kycStatus: string | null;
  fullName: string | null;
  adminComment: string | null;
  createdAt: Date;
};

export async function getUsersWithFilters(
  filters: UserAdminFilter = {},
): Promise<UserAdminListItem[]> {
  const conditions: ReturnType<typeof eq>[] = [
    eq(schema.users.userType, 'PUBLIC'),
  ];
  if (filters.kycStatus === 'NONE') {
    conditions.push(isNull(schema.kycProfiles.status));
  } else if (filters.kycStatus) {
    conditions.push(eq(schema.kycProfiles.status, filters.kycStatus));
  }
  if (filters.search && filters.search.trim()) {
    const q = `%${filters.search.trim().toLowerCase()}%`;
    const searchCond = or(
      sql`LOWER(${schema.users.wallet}) LIKE ${q}`,
      sql`LOWER(COALESCE(${schema.users.email}, '')) LIKE ${q}`,
      sql`LOWER(COALESCE(${schema.kycProfiles.fullName}, '')) LIKE ${q}`,
    );
    if (searchCond) conditions.push(searchCond);
  }

  const rows = await db
    .select({
      userId: schema.users.id,
      wallet: schema.users.wallet,
      userType: schema.users.userType,
      email: schema.users.email,
      preferredLanguage: schema.users.preferredLanguage,
      kycStatus: schema.kycProfiles.status,
      fullName: schema.kycProfiles.fullName,
      adminComment: schema.kycProfiles.adminComment,
      createdAt: schema.users.createdAt,
    })
    .from(schema.users)
    .leftJoin(
      schema.kycProfiles,
      eq(schema.kycProfiles.userId, schema.users.id),
    )
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(schema.users.createdAt));

  return rows as UserAdminListItem[];
}

export type UserAdminDetail = UserAdminListItem & {
  nik: string | null;
  address: string | null;
  ktpPhoto: string | null;
  faceVerified: boolean | null;
  idExtractedByAi: boolean | null;
  verifiedAt: Date | null;
};

export async function getUserAdminDetail(
  userId: string,
): Promise<UserAdminDetail | null> {
  const [row] = await db
    .select({
      userId: schema.users.id,
      wallet: schema.users.wallet,
      userType: schema.users.userType,
      email: schema.users.email,
      preferredLanguage: schema.users.preferredLanguage,
      createdAt: schema.users.createdAt,
      kycStatus: schema.kycProfiles.status,
      fullName: schema.kycProfiles.fullName,
      nik: schema.kycProfiles.nik,
      address: schema.kycProfiles.address,
      ktpPhoto: schema.kycProfiles.ktpPhoto,
      adminComment: schema.kycProfiles.adminComment,
      faceVerified: schema.kycProfiles.faceVerified,
      idExtractedByAi: schema.kycProfiles.idExtractedByAi,
      verifiedAt: schema.kycProfiles.verifiedAt,
    })
    .from(schema.users)
    .leftJoin(
      schema.kycProfiles,
      eq(schema.kycProfiles.userId, schema.users.id),
    )
    .where(
      and(
        eq(schema.users.id, userId),
        eq(schema.users.userType, 'PUBLIC'),
      ),
    )
    .limit(1);

  if (!row) return null;

  return {
    userId: row.userId,
    wallet: row.wallet,
    userType: row.userType,
    email: row.email,
    preferredLanguage: row.preferredLanguage,
    kycStatus: row.kycStatus,
    fullName: row.fullName,
    adminComment: row.adminComment,
    createdAt: row.createdAt,
    nik: row.nik,
    address: row.address,
    ktpPhoto: row.ktpPhoto,
    faceVerified: row.faceVerified,
    idExtractedByAi: row.idExtractedByAi,
    verifiedAt: row.verifiedAt,
  };
}

// ─── USER ADMIN REGISTRY (runtime) ─────────────────────────
// Sumber kebenaran runtime untuk grant akses KYC admin (§16).
// Env USER_ADMIN_WALLET tetap sebagai bootstrap/emergency fallback.

export type UserAdminRow = {
  id: string;
  wallet: string;
  active: boolean;
  addedBy: string;
  createdAt: Date;
  source: 'DB' | 'ENV';
};

export async function listUserAdmins(): Promise<UserAdminRow[]> {
  const dbRows = await db
    .select({
      id: schema.userAdmins.id,
      wallet: schema.userAdmins.wallet,
      active: schema.userAdmins.active,
      addedBy: schema.userAdmins.addedBy,
      createdAt: schema.userAdmins.createdAt,
    })
    .from(schema.userAdmins)
    .orderBy(desc(schema.userAdmins.createdAt));

  const rows: UserAdminRow[] = dbRows.map((r) => ({ ...r, source: 'DB' }));

  // Env-only wallets not yet in DB → surface as virtual rows so admin
  // sees them in UI. These cannot be removed from the UI (edit .env instead).
  const envWallets = (process.env.USER_ADMIN_WALLET || '')
    .split(',')
    .map((w) => w.trim().toLowerCase())
    .filter(Boolean);
  const dbWallets = new Set(dbRows.map((r) => r.wallet.toLowerCase()));
  const envOnly = envWallets.filter((w) => !dbWallets.has(w));

  const envRows: UserAdminRow[] = envOnly.map((w) => ({
    id: `env-${w}`,
    wallet: w,
    active: true,
    addedBy: '0x0000000000000000000000000000000000000000',
    createdAt: new Date(0),
    source: 'ENV',
  }));

  return [...envRows, ...rows];
}

export async function addUserAdmin(wallet: string, addedBy: string): Promise<void> {
  await db
    .insert(schema.userAdmins)
    .values({
      wallet: wallet.toLowerCase(),
      addedBy: addedBy.toLowerCase(),
      active: true,
    })
    .onConflictDoUpdate({
      target: schema.userAdmins.wallet,
      set: { active: true },
    });
}

export async function deactivateUserAdmin(wallet: string): Promise<boolean> {
  const result = await db
    .update(schema.userAdmins)
    .set({ active: false })
    .where(
      and(
        sql`LOWER(${schema.userAdmins.wallet}) = ${wallet.toLowerCase()}`,
        eq(schema.userAdmins.active, true),
      ),
    )
    .returning({ id: schema.userAdmins.id });
  return result.length > 0;
}

export async function isUserAdmin(wallet: string): Promise<boolean> {
  const normalized = wallet.toLowerCase();

  // Env fallback — bootstrap / emergency. Always trusted.
  const envWallets = (process.env.USER_ADMIN_WALLET || '')
    .split(',')
    .map((w) => w.trim().toLowerCase())
    .filter(Boolean);
  if (envWallets.includes(normalized)) return true;

  // DB check (active = true).
  const [row] = await db
    .select({ id: schema.userAdmins.id })
    .from(schema.userAdmins)
    .where(
      and(
        sql`LOWER(${schema.userAdmins.wallet}) = ${normalized}`,
        eq(schema.userAdmins.active, true),
      ),
    )
    .limit(1);
  return !!row;
}