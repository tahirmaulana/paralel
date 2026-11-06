import { NextResponse } from 'next/server';
import { getUnverifiedKycList, getAllUsersKycList } from '@/lib/db';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const wallet = searchParams.get('wallet')?.toLowerCase();
  const type = searchParams.get('type'); // 'users' atau 'requests'
  
  const adminWallets = (process.env.USER_ADMIN_WALLET || '').split(',').map(w => w.trim().toLowerCase());
  if (!wallet || !adminWallets.includes(wallet)) {
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