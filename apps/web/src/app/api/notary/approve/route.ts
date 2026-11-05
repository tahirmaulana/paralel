// @file apps/web/src/app/api/notary/approve/route.ts
import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq } from 'drizzle-orm';
import { keccak256, toBytes, type Hex } from 'viem';
import * as schema from '@db/schema';

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

type Body = {
  auctionId: string;
  notaryWallet: `0x${string}`;
  confirmationCode: string;
  signature: Hex;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    const codeHash = keccak256(toBytes(body.confirmationCode));

    // 1. Dapatkan notary Partner ID
    const [partner] = await db
      .select({ id: schema.partners.id })
      .from(schema.partners)
      .innerJoin(schema.users, eq(schema.users.id, schema.partners.userId))
      .where(eq(schema.users.wallet, body.notaryWallet.toLowerCase()))
      .limit(1);

    if (!partner) return NextResponse.json({ error: 'Notary not found' }, { status: 404 });

    // 2. Simpan ke confirmation_codes
    await db.insert(schema.confirmationCodes).values({
      auctionId: body.auctionId,
      codeHash: Buffer.from(codeHash.slice(2), 'hex'),
      issuedByNotary: partner.id,
      signature: Buffer.from(body.signature.slice(2), 'hex'),
    });

    // 3. Simpan attestation
    await db.insert(schema.attestations).values({
      auctionId: body.auctionId,
      type: 'NOTARY_APPROVED',
      signerWallet: body.notaryWallet.toLowerCase(),
      payload: { confirmationCode: body.confirmationCode }, // Plaintext hanya untuk simulasi
      signature: Buffer.from(body.signature.slice(2), 'hex'),
    });

    // Di sistem nyata, di sini kita memanggil API Email (misal Resend) ke Consignor
    console.log(`[SIMULASI EMAIL] Kode konfirmasi ${body.confirmationCode} terkirim ke Consignor untuk lelang ${body.auctionId}`);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}