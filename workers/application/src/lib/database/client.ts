import {
  neon,
  type NeonQueryFunction,
} from "@neondatabase/serverless";

import type { Env } from "../../env";

const validateDatabaseUrl = (
  value: string,
): string => {
  const databaseUrl = value.trim();

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is empty.");
  }

  const parsed = new URL(databaseUrl);

  if (
    parsed.protocol !== "postgres:" &&
    parsed.protocol !== "postgresql:"
  ) {
    throw new Error(
      "DATABASE_URL must use postgres or postgresql.",
    );
  }

  return databaseUrl;
};

export const createDatabaseClient = async (
  env: Env,
): Promise<NeonQueryFunction<false, false>> => {
  const databaseUrl = validateDatabaseUrl(
    await env.DATABASE_URL.get(),
  );

  return neon(databaseUrl);
};
