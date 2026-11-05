// @file apps/web/src/app/api/notary/data/route.ts
//
// Returns notary dashboard lists. No auth gate (PARALEL.md D11.1, TECH_STACK §7).
// Data is public — auction transparency principle. PDP fields (email, KYC)
// not exposed here; profile comes from server-rendered page.
//
// Per PARALEL.md D11.5:
//   - Submission: global queue (no notary filter)
//   - Run:        global view (no notary filter)
//   - Collections + Passed: per-notary (filter via attestations.signer_wallet)
import { NextResponse } from 'next/server';
import {
  getNotaryByWallet,
  getNotaryPendingApprovals,
  getNotaryCollections,
  getNotaryRunAuctions,
  getNotaryPassedAuctions,
} from '@/lib/db';

export async function GET(req: Request): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const wallet = searchParams.get('wallet');

  if (!wallet || !/^0x[0-9a-fA-F]{40}$/.test(wallet)) {
    return NextResponse.json({ error: 'invalid wallet' }, { status: 400 });
  }

  try {
    const notary = await getNotaryByWallet(wallet);
    if (!notary) {
      return NextResponse.json(
        { error: 'Notary not found or inactive' },
        { status: 404 },
      );
    }

    const [pending, collections, run, passed] = await Promise.all([
      getNotaryPendingApprovals(),
      getNotaryCollections(wallet),
      getNotaryRunAuctions(),
      getNotaryPassedAuctions(wallet),
    ]);

    return NextResponse.json({
      pendingApprovals: pending.map((p) => ({
        auctionId: p.auctionId,
        auctionCode: p.auctionCode,
        title: p.title,
        startingBid: p.startingBid.toString(),
        bidIncrement: p.bidIncrement.toString(),
        openAt: p.openAt.toISOString(),
        durationHours: p.durationHours,
        consignorWallet: p.consignorWallet,
        guarantorName: p.guarantorName,
        hasGuarantorApproval: p.hasGuarantorApproval,
        guarantorApprovedAt: p.guarantorApprovedAt?.toISOString() ?? null,
        pendingAt: p.pendingAt?.toISOString() ?? null,
      })),
      collections: collections.map((c) => ({
        auctionId: c.auctionId,
        auctionCode: c.auctionCode,
        title: c.title,
        status: c.status,
        currentRound: c.currentRound,
        winnerWallet: c.winnerWallet,
        updatedAt: c.updatedAt.toISOString(),
      })),
      run: run.map((r) => ({
        auctionId: r.auctionId,
        auctionCode: r.auctionCode,
        title: r.title,
        status: r.status,
        currentRound: r.currentRound,
        startingBid: r.startingBid.toString(),
        currentBid: r.currentBid.toString(),
        openAt: r.openAt.toISOString(),
        closeAt: r.closeAt.toISOString(),
        bidCount: r.bidCount,
      })),
      passed: passed.map((p) => ({
        auctionId: p.auctionId,
        auctionCode: p.auctionCode,
        title: p.title,
        status: p.status,
        updatedAt: p.updatedAt.toISOString(),
      })),
    });
  } catch (err: any) {
    console.error('[notary/data] failed:', err?.message ?? err);
    return NextResponse.json(
      { error: err?.message ?? 'unknown error' },
      { status: 500 },
    );
  }
}