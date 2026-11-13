// @file workers/indexer/src/types.ts

export interface SecretsStoreSecret {
  get(): Promise<string>;
}

export interface Env {
  DATABASE_URL: SecretsStoreSecret;
  ARBITRUM_RPC_URL: SecretsStoreSecret;
  MAX_BLOCK_RANGE?: string;
}
