// @file packages/db/src/seed.ts
// Jalankan: npx tsx packages/db/src/seed.ts (dari root repo)
// Idempoten: aman dijalankan berkali-kali.
import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq } from 'drizzle-orm';
import * as schema from './schema';
import { SEED_PARTNERS } from './seed-partners';

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

async function main() {
  // 1) fee_config — seed sekali
  const feeCountRows = await sql`SELECT count(*)::int AS "feeCount" FROM fee_config`;
  const feeCount = feeCountRows[0]?.feeCount ?? 0;
  if (feeCount === 0) {
    await db.insert(schema.feeConfig).values({
      platformBps: 250,
      guarantorBps: 150,
      notaryBps: 100,
      taxBps: 1_000,
      withdrawFee: 2_500_000n,
      effectiveFrom: new Date(),
    });
    console.log('✓ fee_config (250/150/100/1000 bps, fee 2.5 USDC)');
  } else {
    console.log('· fee_config already exists');
  }

  // 2) partners — idempoten per wallet
  for (const p of SEED_PARTNERS) {
    await db
      .insert(schema.users)
      .values({
        wallet: p.wallet,
        userType: p.type,
        preferredLanguage: 'EN',
      })
      .onConflictDoNothing({ target: schema.users.wallet });

    const [u] = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.wallet, p.wallet))
      .limit(1);
    if (!u) throw new Error(`User insert failed: ${p.wallet}`);

    await db
      .insert(schema.partners)
      .values({
        userId: u.id,
        type: p.type,
        name: p.name,
        category: p.category,
        city: p.city,
        active: true,
      })
      .onConflictDoNothing({ target: schema.partners.userId });

    console.log(`✓ ${p.type.padEnd(8)} ${p.name.padEnd(16)} ${p.wallet}`);
  }

  console.log('\n✅ Seed selesai.');
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('❌', e instanceof Error ? e.message : e);
    process.exit(1);
  });