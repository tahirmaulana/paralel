// @file apps/web/src/app/api/user/kyc/route.ts
import { NextResponse } from 'next/server';
import { submitUserKyc } from '@/lib/db';
import { isAddress } from 'viem';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!isAddress(body.wallet)) {
      return NextResponse.json({ error: 'invalid wallet' }, { status: 400 });
    }
    if (!body.fullName || !body.nik || !body.address || !body.ktpPhoto) {
      return NextResponse.json({ error: 'missing fields' }, { status: 400 });
    }

    await submitUserKyc(body.wallet, {
      fullName: body.fullName,
      nik: body.nik,
      address: body.address,
      ktpPhoto: body.ktpPhoto,
    });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    // Log full error server-side untuk investigasi.
    console.error('[user/kyc] failed — full error:', err);

    // Drizzle/Neon wraps the real Postgres error in `cause`.
    // Extract the most specific message we can find.
    const pgMessage =
      err?.cause?.message ??
      err?.cause?.detail ??
      err?.cause?.hint ??
      err?.detail ??
      err?.message ??
      'unknown error';

    if (pgMessage === 'KYC already verified — cannot resubmit') {
      return NextResponse.json({ error: pgMessage }, { status: 409 });
    }
    if (pgMessage === 'User creation failed') {
      return NextResponse.json({ error: pgMessage }, { status: 500 });
    }

    return NextResponse.json({ error: pgMessage }, { status: 500 });
  }
}