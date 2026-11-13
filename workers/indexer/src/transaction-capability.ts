// @file workers/indexer/src/transaction-capability.ts
//
// Compile-time proof that the configured indexer driver supports interactive
// PostgreSQL transactions.
import {
  sql,
} from 'drizzle-orm';

import type {
  IndexerDatabase,
} from './database';

export async function assertTransactionalDriver(
  db:
    IndexerDatabase,
): Promise<void> {
  await db.transaction(
    async (
      transaction,
    ) => {
      await transaction.execute(
        sql`SELECT 1`,
      );
    },
  );
}
