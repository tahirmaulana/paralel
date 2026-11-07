// @file apps/web/src/app/api/platform-admin/user-admins/route.ts
//
// GET  — list all user-admins (env + DB). Public within platform-admin UI
//        (client already gated by owner on-chain). No owner check on read,
//        mirroring /api/platform-admin/partners.
// POST — add wallet as user-admin. Requires on-chain owner verification.
import { NextResponse } from 'next/server';
import { isAddress } from 'viem';
import { listUserAdmins, addUserAdmin } from '@/lib/db';
import { verifyOwner } from '@/lib/owner-guard';

export async function GET(): Promise<Response> {
  try {
    const rows = await listUserAdmins();
    return NextResponse.json({ data: rows });
  } catch (err: any) {
    console.error('[platform-admin/user-admins][GET] failed:', err?.message ?? err);
    return NextResponse.json(
      { error: err?.message ?? 'unknown error' },
      { status: 500 },
    );
  }
}

export async function POST(req: Request): Promise<Response> {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }

  const { wallet, owner } = body;

  if (!isAddress(wallet)) {
    return NextResponse.json({ error: 'invalid wallet' }, { status: 400 });
  }
  if (!isAddress(owner)) {
    return NextResponse.json({ error: 'invalid owner' }, { status: 400 });
  }

  const isOwner = await verifyOwner(owner);
  if (!isOwner) {
    return NextResponse.json(
      { error: 'Unauthorized — must be contract owner' },
      { status: 403 },
    );
  }

  try {
    await addUserAdmin(wallet, owner);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[platform-admin/user-admins][POST] failed:', err?.message ?? err);
    return NextResponse.json(
      { error: err?.message ?? 'unknown error' },
      { status: 500 },
    );
  }
}