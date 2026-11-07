// @file apps/web/src/app/api/user/data/route.ts
import { NextResponse } from 'next/server';
import {
  getUserKycStatus,
  getUserLiveAuctions,
  getUserJoinedAuctions,
  getUserCreatedAuctions,
} from '@/lib/db';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const wallet = searchParams.get('wallet');

  if (!wallet || !/^0x[0-9a-fA-F]{40}$/.test(wallet)) {
    return NextResponse.json({ error: 'invalid wallet' }, { status: 400 });
  }

  try {
    // Ambil status KYC (termasuk feedback admin dan waktu verifikasi).
    const kyc = await getUserKycStatus(wallet);

    // Ambil data lelang secara paralel.
    const [live, joined, created] = await Promise.all([
      getUserLiveAuctions(wallet),
      getUserJoinedAuctions(wallet),
      getUserCreatedAuctions(wallet),
    ]);

    return NextResponse.json({
      kycStatus: kyc.kycStatus,
      adminComment: kyc.adminComment,
      verifiedAt: kyc.verifiedAt?.toISOString() ?? null,
      liveAuctions: live,
      joinedAuctions: joined,
      createdAuctions: created,
    });
  } catch (err: any) {
    console.error('[user/data] failed:', err?.message ?? err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}