// @file workers/indexer/src/database.ts
//
// Canonical transactional database boundary for the Cloudflare indexer.
import type {
  drizzle,
} from 'drizzle-orm/neon-serverless';

import type * as schema from '../../../packages/db/src/schema';

export type IndexerDatabase =
  ReturnType<
    typeof drizzle<
      typeof schema
    >
  >;

export type IndexerTransaction =
  Parameters<
    Parameters<
      IndexerDatabase[
        'transaction'
      ]
    >[0]
  >[0];
