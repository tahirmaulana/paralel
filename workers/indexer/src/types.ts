// @file workers/indexer/src/types.ts
export interface Env {
  DATABASE_URL: string;
  ARBITRUM_RPC_URL: string;
  AUCTION_CONTRACT_ADDRESS: `0x${string}`;
  START_BLOCK: string;
  MAX_BLOCK_RANGE: string;
}