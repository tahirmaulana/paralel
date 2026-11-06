// @file scripts/db-run-sql.ts
// Jalankan file .sql (multi-statement + $$ blocks) ke Neon.
// Usage: npx tsx scripts/db-run-sql.ts <path-to-sql>
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { Client } from '@neondatabase/serverless';

const path = process.argv[2];
if (!path) {
  console.error('Usage: npx tsx scripts/db-run-sql.ts <path-to-sql>');
  process.exit(1);
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('❌ DATABASE_URL tidak ada di root .env');
  process.exit(1);
}

const sqlText = readFileSync(path, 'utf-8');

const client = new Client(url);
await client.connect();
try {
  await client.query(sqlText);
  console.log(`✓ Applied: ${path}`);
} finally {
  await client.end();
}
process.exit(0);