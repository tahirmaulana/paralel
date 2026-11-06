// @file workers/indexer/src/types.ts

export interface Env {
  DATABASE_URL: { get(): Promise<string> };
  ARBITRUM_RPC_URL: { get(): Promise<string> };
  AUCTION_CONTRACT_ADDRESS: string; 
  START_BLOCK: string;
  MAX_BLOCK_RANGE: string;
}