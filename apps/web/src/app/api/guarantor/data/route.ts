// @file apps/web/src/app/api/guarantor/data/route.ts
//
// Returns guarantor dashboard lists. No auth gate (mirror /api/notary/data).
// Per-guarantor scope: all tabs filter `guarantor_id = this`.
// Ref: PARALEL.md §4.2, D12.4, D12.5
import { NextResponse } from 'next/server';
import {
  getGuarantorByWallet,
  getGuarantorSubmission,
  getGuarantorCollection,
  getGuarantorWithdrawal,
  getGuarantorRun,
  getGuarantorHistory,
} from '@/lib/db';

export async function GET(req: Request): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const wallet = searchParams.get('wallet');

  if (!wallet || !/^0x[0-9a-fA-F]{40}$/.test(wallet)) {
    return NextResponse.json({ error: 'invalid wallet' }, { status: 400 });
  }

  try {
    const guarantor = await getGuarantorByWallet(wallet);
    if (!guarantor) {
      return NextResponse.json(
        { error: 'Guarantor not found or inactive' },
        { status: 404 },
      );
    }

    const [submission, collection, withdrawal, run, history] = await Promise.all([
      getGuarantorSubmission(guarantor.partnerId),
      getGuarantorCollection(guarantor.partnerId),
      getGuarantorWithdrawal(guarantor.partnerId),
      getGuarantorRun(guarantor.partnerId),
      getGuarantorHistory(guarantor.partnerId),
    ]);

    return NextResponse.json({
      submission: submission.map((r) => ({
        auctionId: r.auctionId,
        auctionCode: r.auctionCode,
        auctionKey: r.auctionKey,
        title: r.title,
        consignorWallet: r.consignorWallet,
        startingBid: r.startingBid.toString(),
        pendingAt: r.pendingAt?.toISOString() ?? null,
        specHash: r.specHash,
        hasGuarantorApproval: r.hasGuarantorApproval,
      })),
      collection: collection.map((r) => ({
        auctionId: r.auctionId,
        auctionCode: r.auctionCode,
        auctionKey: r.auctionKey,
        title: r.title,
        currentRound: r.currentRound,
        winnerWallet: r.winnerWallet,
        winnerStake: r.winnerStake?.toString() ?? null,
        // Approximation: updated_at + 48h
        collectionDeadline: new Date(
          r.updatedAt.getTime() + 48 * 3600 * 1000,
        ).toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      })),
      withdrawal: withdrawal.map((r) => ({
        auctionId: r.auctionId,
        auctionCode: r.auctionCode,
        auctionKey: r.auctionKey,
        title: r.title,
        currentRound: r.currentRound,
        consignorWallet: r.consignorWallet,
        updatedAt: r.updatedAt.toISOString(),
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
        updatedAt: r.updatedAt.toISOString(),
      })),
      history: history.map((r) => ({
        auctionId: r.auctionId,
        auctionCode: r.auctionCode,
        title: r.title,
        status: r.status,
        updatedAt: r.updatedAt.toISOString(),
      })),
    });
  } catch (err: any) {
    console.error('[guarantor/data] failed:', err?.message ?? err);
    return NextResponse.json(
      { error: err?.message ?? 'unknown error' },
      { status: 500 },
    );
  }
}