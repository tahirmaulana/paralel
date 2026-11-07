// @file apps/web/src/app/api/user-admin/users/route.ts
// GET filtered user list (read-only) for the User Admin dashboard.
import { NextResponse } from 'next/server';
import { getUsersWithFilters, isUserAdmin } from '@/lib/db';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const wallet = searchParams.get('wallet');

  if (!wallet || !(await isUserAdmin(wallet))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const users = await getUsersWithFilters({
      kycStatus: (searchParams.get('kycStatus') as any) || undefined,
      userType: (searchParams.get('userType') as any) || undefined,
      search: searchParams.get('search') || undefined,
    });

    return NextResponse.json({ data: users });
  } catch (err: any) {
    console.error('[user-admin/users] failed:', err?.message ?? err);
    return NextResponse.json(
      { error: err?.message ?? 'unknown error' },
      { status: 500 },
    );
  }
}