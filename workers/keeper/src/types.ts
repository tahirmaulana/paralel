// @file workers/keeper/src/types.ts

export interface Env {
  DATABASE_URL: { get(): Promise<string> };
  ARBITRUM_RPC_URL: { get(): Promise<string> };
  AUCTION_CONTRACT_ADDRESS: string;
  RELAYER_PRIVATE_KEY: { get(): Promise<string> };
  MAX_ACTIONS_PER_RUN?: string;
  MAX_CANDIDATES?: string;
}

export type KeeperActionKind = 'startAwarding' | 'advanceCandidate' | 'expireCollection';
export type DbAuctionStatus = 'SCHEDULED' | 'AWARDING' | 'COLLECTION';

export type RoundDeadlines = {
  closeAt: bigint;
  awardingDeadline: bigint;
  collectionDeadline: bigint;
};

export type Candidate = {
  auctionId: string;
  auctionCode: string;
  auctionKey: `0x${string}`;
  status: DbAuctionStatus;
  currentRound: number;
};

export type KeeperAction = {
  kind: KeeperActionKind;
  candidate: Candidate;
  nowSec: bigint;
  deadline: bigint;
};

export type ExecutionResult = {
  kind: KeeperActionKind;
  auctionCode: string;
  roundNo: number;
  txHash?: `0x${string}`;
  ok: boolean;
  error?: string;
};