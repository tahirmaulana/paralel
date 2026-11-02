// @file scripts/db-check.ts
// Cek isi database Neon: tabel apa saja yang ada.
// Jalankan: npx tsx scripts/db-check.ts
import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL tidak ada di root .env');
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

// 1. Tabel
const tables = await sql`
  SELECT tablename
  FROM pg_tables
  WHERE schemaname = 'public'
  ORDER BY tablename
`;

console.log(`\n=== Tables in DB: ${tables.length} ===`);
if (tables.length === 0) {
  console.log('(kosong — belum ada tabel)');
} else {
  for (const t of tables) console.log(`  • ${t.tablename}`);
}

// 2. Migrasi yang pernah dijalankan (kalau ada)
try {
  const migrations = await sql`
    SELECT hash, created_at
    FROM drizzle.__drizzle_migrations
    ORDER BY created_at
  `;
  console.log(`\n=== Drizzle migrations applied: ${migrations.length} ===`);
  for (const m of migrations) console.log(`  • ${m.hash.slice(0, 12)}…  ${m.created_at}`);
} catch {
  console.log('\n=== Drizzle migrations: (tabel __drizzle_migrations belum ada) ===');
}

// 3. Cek specific tables yang kita harapkan
const expected = [
  'users', 'kyc_profiles', 'partners', 'fee_config',
  'auctions', 'auction_rounds', 'auction_assets', 'auction_files',
  'status_log', 'confirmation_codes', 'attestations', 'receipts',
  'bids', 'bidder_stakes', 'awarding_attempts',
  'payouts', 'withdrawals',
  'notifications', 'feed_posts', 'chain_events',
];
const found = new Set(tables.map((t: any) => t.tablename));
const missing = expected.filter((t) => !found.has(t));
const extra = [...found].filter((t) => !expected.includes(t as string));

console.log(`\n=== Expected 20 tables ===`);
console.log(`  Found:   ${expected.length - missing.length}/${expected.length}`);
if (missing.length) console.log(`  Missing: ${missing.join(', ')}`);
if (extra.length) console.log(`  Extra:   ${extra.join(', ')}`);

process.exit(0);