// @file scripts/db-reset.ts
// DROP semua tabel di schema public + drizzle. Untuk reset pilot.
// Jalankan: npx tsx scripts/db-reset.ts
import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

const url = process.env.DATABASE_URL;
if (!url) { console.error('❌ DATABASE_URL tidak ada'); process.exit(1); }
const sql = neon(url);

console.log('Dropping schemas public + drizzle…');
await sql`DROP SCHEMA IF EXISTS public CASCADE`;
await sql`CREATE SCHEMA public`;
await sql`DROP SCHEMA IF EXISTS drizzle CASCADE`;
console.log('✅ Reset selesai.');
process.exit(0);