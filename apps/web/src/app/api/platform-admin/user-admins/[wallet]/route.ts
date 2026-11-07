// @file apps/web/src/app/api/platform-admin/user-admins/[wallet]/route.ts
//
// DELETE — soft-deactivate a user-admin. Requires on-chain owner verification.
// If the wallet is env-only (not in DB), returns 404 with a hint.
import { NextResponse } from 'next/server';
import { isAddress } from 'viem';
import { deactivateUserAdmin } from '@/lib/db';
import { verifyOwner } from '@/lib/owner-guard';

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ wallet: string }> },
): Promise<Response> {
  const { wallet } = await params;
  const { searchParams } = new URL(req.url);
  const owner = searchParams.get('owner');

  if (!isAddress(wallet)) {
    return NextResponse.json({ error: 'invalid wallet' }, { status: 400 });
  }
  if (!owner || !isAddress(owner)) {
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
    const removed = await deactivateUserAdmin(wallet);
    if (!removed) {
      return NextResponse.json(
        {
          error:
            'Wallet not found in DB registry. If it is an env bootstrap wallet, edit USER_ADMIN_WALLET in .env instead.',
        },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error(
      '[platform-admin/user-admins][DELETE] failed:',
      err?.message ?? err,
    );
    return NextResponse.json(
      { error: err?.message ?? 'unknown error' },
      { status: 500 },
    );
  }
}