// @file apps/web/src/app/api/auction/[code]/status/route.ts
//
// Polling status untuk consignor dashboard. Read-only, tanpa auth gate
// (data publik sesuai prinsip transparansi — sama seperti /api/notary/data).
// Ref: PARALEL.md §9.1, §9.2.
import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { and, eq } from 'drizzle-orm';
import * as schema from '@db/schema';

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

function timestampToIso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  const timestamp = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(timestamp.getTime())) {
    throw new Error('Database returned an invalid auction timestamp.');
  }
  return timestamp.toISOString();
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ code: string }> },
): Promise<Response> {
  const { code } = await params;

  try {
    const [auction] = await db
      .select({
        id: schema.auctions.id,
        auctionCode: schema.auctions.auctionCode,
        status: schema.auctions.status,
        category: schema.auctions.category,
        currentRound: schema.auctions.currentRound,
        consignorId: schema.auctions.consignorId,
        pendingAt: schema.auctions.pendingAt,
        pendingDeadline: schema.auctions.pendingDeadline,
        onchainRegisteredAt: schema.auctions.onchainRegisteredAt,
        onchainTxHash: schema.auctions.onchainTxHash,
      })
      .from(schema.auctions)
      .where(eq(schema.auctions.auctionCode, code))
      .limit(1);

    if (!auction) {
      return NextResponse.json({ error: 'Auction not found' }, { status: 404 });
    }

    const [consignor] = await db
      .select({ wallet: schema.users.wallet })
      .from(schema.users)
      .where(eq(schema.users.id, auction.consignorId))
      .limit(1);

    const [assets] = await db
      .select({ title: schema.auctionAssets.title })
      .from(schema.auctionAssets)
      .where(eq(schema.auctionAssets.auctionId, auction.id))
      .limit(1);

    const [round] = await db
      .select({
        openAt: schema.auctionRounds.openAt,
        closeAt: schema.auctionRounds.closeAt,
        startingBid: schema.auctionRounds.startingBid,
        bidIncrement: schema.auctionRounds.bidIncrement,
        scheduledAt: schema.auctionRounds.scheduledAt,
      })
      .from(schema.auctionRounds)
      .where(
        and(
          eq(schema.auctionRounds.auctionId, auction.id),
          eq(schema.auctionRounds.roundNo, auction.currentRound),
        ),
      )
      .limit(1);

    const atts = await db
      .select({
        type: schema.attestations.type,
        payload: schema.attestations.payload,
      })
      .from(schema.attestations)
      .where(eq(schema.attestations.auctionId, auction.id));

    const hasGuarantorApproval = atts.some(
      (a) => a.type === 'GUARANTOR_APPROVED',
    );
    const hasNotaryApproval = atts.some((a) => a.type === 'NOTARY_APPROVED');
    const canConfirm =
      auction.status === 'PENDING' &&
      hasGuarantorApproval &&
      hasNotaryApproval;

    let rejectionReason: string | null = null;
    if (auction.status === 'REJECTED') {
      const rejected = atts.find((a) => a.type === 'GUARANTOR_REJECTED');
      const p = (rejected?.payload ?? {}) as { reason?: string };
      rejectionReason = p.reason ?? null;
    }

    return NextResponse.json({
      auctionId: auction.id,
      auctionCode: auction.auctionCode,
      title: assets?.title ?? null,
      category: auction.category,
      status: auction.status,
      currentRound: auction.currentRound,
      consignorWallet: consignor?.wallet?.toLowerCase() ?? null,
      pendingAt: timestampToIso(auction.pendingAt),
      pendingDeadline: timestampToIso(auction.pendingDeadline),
      scheduledAt:
        timestampToIso(round?.scheduledAt) ??
        timestampToIso(auction.onchainRegisteredAt) ??
        null,
      onchainTxHash: auction.onchainTxHash,
      startingBid: round?.startingBid?.toString() ?? null,
      bidIncrement: round?.bidIncrement?.toString() ?? null,
      openAt: timestampToIso(round?.openAt),
      closeAt: timestampToIso(round?.closeAt),
      hasGuarantorApproval,
      hasNotaryApproval,
      canConfirm,
      rejectionReason,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : String(err);
    console.error('[auction/status] failed:', message);
    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}