// @file scripts/db-migrations.ts
import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

const url = process.env.DATABASE_URL;
if (!url) { console.error('❌ DATABASE_URL'); process.exit(1); }
const sql = neon(url);

const rows = await sql`
  SELECT id, hash, created_at
  FROM drizzle.__drizzle_migrations
  ORDER BY id
`;
console.log(`Migrations applied: ${rows.length}`);
for (const r of rows) {
  console.log(`  • id=${r.id}  hash=${(r.hash as string).slice(0, 12)}…`);
}
process.exit(0);