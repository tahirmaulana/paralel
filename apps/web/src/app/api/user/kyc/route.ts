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
    const message = err?.message ?? 'unknown error';
    if (message === 'KYC already verified — cannot resubmit') {
      return NextResponse.json({ error: message }, { status: 409 });
    }
    if (message === 'User creation failed') {
      return NextResponse.json({ error: message }, { status: 500 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}