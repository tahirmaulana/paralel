// @file apps/web/src/app/api/user-admin/users/[id]/route.ts
// GET single user detail (read-only).
import { NextResponse } from 'next/server';
import { getUserAdminDetail, isUserAdmin } from '@/lib/db';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const wallet = new URL(req.url).searchParams.get('wallet');

  if (!wallet || !(await isUserAdmin(wallet))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const user = await getUserAdminDetail(id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    return NextResponse.json({ data: user });
  } catch (err: any) {
    console.error('[user-admin/users/:id] failed:', err?.message ?? err);
    return NextResponse.json(
      { error: err?.message ?? 'unknown error' },
      { status: 500 },
    );
  }
}