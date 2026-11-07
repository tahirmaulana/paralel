// @file apps/web/src/app/api/user-admin/kyc/route.ts
// Legacy listing endpoints. Kept for compatibility; auth now env ∪ DB.
import { NextResponse } from 'next/server';
import { getUnverifiedKycList, getAllUsersKycList, isUserAdmin } from '@/lib/db';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const wallet = searchParams.get('wallet')?.toLowerCase();
  const type = searchParams.get('type'); // 'users' atau 'requests'

  if (!wallet || !(await isUserAdmin(wallet))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    if (type === 'users') {
      const users = await getAllUsersKycList();
      return NextResponse.json({ data: users });
    } else {
      const requests = await getUnverifiedKycList();
      return NextResponse.json({ data: requests });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}