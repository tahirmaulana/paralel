import 'dotenv/config';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';

const databaseUrl = process.env.DATABASE_URL;
const expectedDatabase = process.env.PARALEL_TESTNET_DATABASE_NAME;
const confirmation = process.env.PARALEL_RESET_DATABASE;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required.');
}
if (!expectedDatabase) {
  throw new Error('PARALEL_TESTNET_DATABASE_NAME must exactly match current_database().');
}
if (confirmation !== 'I_UNDERSTAND_THIS_DELETES_ALL_DATA') {
  throw new Error('Set PARALEL_RESET_DATABASE to the explicit confirmation token to continue.');
}
if (/prod|production|live/i.test(expectedDatabase)) {
  throw new Error('Refusing to reset a database name that appears production-like.');
}

const sql = postgres(databaseUrl, { max: 1 });

try {
  const [identity] = await sql<{ databaseName: string }[]>`
    SELECT current_database() AS "databaseName"
  `;
  if (!identity || identity.databaseName !== expectedDatabase) {
    throw new Error('DATABASE_URL does not point to the explicitly approved test database.');
  }

  const outsidePublic = await sql<{ schemaName: string }[]>`
    SELECT DISTINCT n.nspname AS "schemaName"
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind IN ('r', 'p', 'v', 'm', 'S')
      AND n.nspname NOT IN ('pg_catalog', 'information_schema', 'public')
      AND n.nspname NOT LIKE 'pg_toast%'
  `;
  const unexpectedSchemas = outsidePublic
    .map((row) => row.schemaName)
    .filter((schemaName) => !['drizzle', 'neon_auth'].includes(schemaName));
  if (unexpectedSchemas.length > 0) {
    throw new Error(
      `Refusing reset because unrecognized objects exist outside public schema: ${unexpectedSchemas
        .join(', ')}`,
    );
  }

  console.log(
    'Resetting the application schema in the approved test database; preserving neon_auth.',
  );
  const migrationTable = await sql<{ migrationTable: string | null }[]>`
    SELECT to_regclass('drizzle.__drizzle_migrations')::text AS "migrationTable"
  `;
  if (migrationTable[0]?.migrationTable) {
    await sql`DELETE FROM drizzle.__drizzle_migrations`;
  }
  await sql`DROP SCHEMA public CASCADE`;
  await sql`CREATE SCHEMA public`;
} finally {
  await sql.end();
}

const result = spawnSync(
  process.execPath,
  [
    fileURLToPath(
      new URL('../node_modules/drizzle-kit/bin.cjs', import.meta.url),
    ),
    'migrate',
  ],
  {
    stdio: 'inherit',
    env: process.env,
  },
);

if (result.error) {
  throw result.error;
}
if (result.status !== 0) {
  throw new Error(`Drizzle migration failed with status ${result.status}.`);
}

console.log('Database reset and schema migration completed.');
