import { NextResponse } from 'next/server';
import { updateKycStatus, isUserAdmin } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const wallet = body.adminWallet?.toLowerCase();

    if (!wallet || !(await isUserAdmin(wallet))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (!body.userId || !['VERIFIED', 'UNVERIFIED'].includes(body.status)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // Jika Reject (UNVERIFIED), komentar wajib diisi
    if (body.status === 'UNVERIFIED' && !body.comment) {
      return NextResponse.json(
        { error: 'Comment is required for rejection' },
        { status: 400 },
      );
    }

    await updateKycStatus(body.userId, body.status, body.comment || null);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}