import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq, and } from 'drizzle-orm';
import * as schema from '@db/schema';

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

// 1. GET: Ambil daftar partner aktif
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type'); // 'NOTARY' atau 'GUARANTOR'

  try {
    const rows = await db
      .select({
        id: schema.partners.id,
        wallet: schema.users.wallet,
        name: schema.partners.name,
        documentNumber: schema.partners.documentNumber,
        address: schema.partners.address,
        photo: schema.partners.photo,
        active: schema.partners.active,
      })
      .from(schema.partners)
      .innerJoin(schema.users, eq(schema.users.id, schema.partners.userId))
      .where(
        and(
          eq(schema.partners.type, type!),
          eq(schema.partners.active, true)
        )
      );

    return NextResponse.json({ data: rows });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// 2. POST: Simpan metadata setelah on-chain sukses
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { wallet, type, name, documentNumber, address, photo } = body;

    if (!wallet || !type || !name) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const normalizedWallet = wallet.toLowerCase();

    // A. Pastikan user ada
    await db.insert(schema.users)
      .values({ wallet: normalizedWallet, userType: type })
      .onConflictDoNothing({ target: schema.users.wallet });

    const [user] = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.wallet, normalizedWallet));
    if (!user) throw new Error('User creation failed');

    // B. Simpan/Update Partner
    await db.insert(schema.partners)
      .values({
        userId: user.id,
        type,
        name,
        documentNumber,
        address,
        photo,
        active: true,
        category: type === 'GUARANTOR' ? 'ALL' : null,
        city: type === 'GUARANTOR' ? 'Jakarta' : null, 
      })
      .onConflictDoUpdate({
        target: schema.partners.userId,
        set: { name, documentNumber, address, photo, active: true }
      });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}