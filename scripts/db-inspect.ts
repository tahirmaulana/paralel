// @file scripts/db-inspect.ts
// Cek apakah tabel di DB cocok dengan schema.ts baru.
// Jalankan: npx tsx scripts/db-inspect.ts
import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('❌ DATABASE_URL tidak ada di root .env');
  process.exit(1);
}
const sql = neon(url);

const report: Record<string, string> = {};

// 1. auction_rounds — apakah PK composite asli atau cuma unique index?
const pk1 = await sql`
  SELECT constraint_type, constraint_name
  FROM information_schema.table_constraints
  WHERE table_name = 'auction_rounds' AND constraint_type = 'PRIMARY KEY'
`;
report['auction_rounds has PRIMARY KEY'] = pk1.length > 0 ? '✅' : '❌ (masih unique index)';

// 2. bidder_stakes — PK composite + created_at?
const pk2 = await sql`
  SELECT 1 FROM information_schema.table_constraints
  WHERE table_name = 'bidder_stakes' AND constraint_type = 'PRIMARY KEY'
`;
report['bidder_stakes has PRIMARY KEY'] = pk2.length > 0 ? '✅' : '❌';

const col1 = await sql`
  SELECT column_name FROM information_schema.columns
  WHERE table_name = 'bidder_stakes' AND column_name = 'created_at'
`;
report['bidder_stakes.created_at'] = col1.length > 0 ? '✅' : '❌ (belum ada)';

// 3. awarding_attempts — PK composite + created_at?
const pk3 = await sql`
  SELECT 1 FROM information_schema.table_constraints
  WHERE table_name = 'awarding_attempts' AND constraint_type = 'PRIMARY KEY'
`;
report['awarding_attempts has PRIMARY KEY'] = pk3.length > 0 ? '✅' : '❌';

const col2 = await sql`
  SELECT column_name FROM information_schema.columns
  WHERE table_name = 'awarding_attempts' AND column_name = 'created_at'
`;
report['awarding_attempts.created_at'] = col2.length > 0 ? '✅' : '❌ (belum ada)';

// 4. CHECK constraints (versi baru punya ~30+)
const checks = await sql`
  SELECT constraint_name
  FROM information_schema.table_constraints
  WHERE constraint_type = 'CHECK' AND constraint_schema = 'public'
  ORDER BY constraint_name
`;
report['CHECK constraints count'] = `${checks.length} ${checks.length > 15 ? '✅' : '❌ (versi lama)'}`;

// 5. Partial unique index untuk foto
const idx = await sql`
  SELECT indexname FROM pg_indexes
  WHERE tablename = 'auction_files' AND indexname = 'uq_auction_photo_slot'
`;
report['uq_auction_photo_slot'] = idx.length > 0 ? '✅' : '❌ (belum ada)';

// 6. Jumlah row di tabel-tabel utama (lihat kalau ada data)
const counts = await sql`
  SELECT
    (SELECT count(*) FROM users)        AS users,
    (SELECT count(*) FROM partners)     AS partners,
    (SELECT count(*) FROM fee_config)   AS fee_config,
    (SELECT count(*) FROM auctions)     AS auctions,
    (SELECT count(*) FROM chain_events) AS chain_events
`;
report['Row counts'] = JSON.stringify(counts[0]);

// Print
console.log('\n=== Struktur DB vs schema.ts baru ===\n');
for (const [k, v] of Object.entries(report)) {
  console.log(`  ${k.padEnd(40)} ${v}`);
}
process.exit(0);