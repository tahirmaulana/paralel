// @file apps/web/src/app/api/user-admin/stats/route.ts
// GET aggregate counts for the User Admin dashboard.
// Scope: read-only. Auth: env USER_ADMIN_WALLET ∪ DB user_admins.
import { NextResponse } from 'next/server';
import { getUserAdminStats, isUserAdmin } from '@/lib/db';

export async function GET(req: Request) {
  const wallet = new URL(req.url).searchParams.get('wallet');

  if (!wallet || !(await isUserAdmin(wallet))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const stats = await getUserAdminStats();
    return NextResponse.json({ data: stats });
  } catch (err: any) {
    console.error('[user-admin/stats] failed:', err?.message ?? err);
    return NextResponse.json(
      { error: err?.message ?? 'unknown error' },
      { status: 500 },
    );
  }
}