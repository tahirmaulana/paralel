import postgres, {
  type Sql,
  type TransactionSql,
} from 'postgres';

let client:
  Sql | null = null;

function requireDatabaseUrl(): string {
  const databaseUrl =
    process.env.DATABASE_URL?.trim();

  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL is missing.',
    );
  }

  return databaseUrl;
}

export function getTransactionClient():
  Sql {
  if (client) {
    return client;
  }

  client = postgres(
    requireDatabaseUrl(),
    {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 15,
      prepare: false,
    },
  );

  return client;
}

export async function withTransaction<T>(
  operation: (
    transaction: TransactionSql,
  ) => Promise<T>,
): Promise<T> {
  return getTransactionClient()
    .begin(operation);
}
