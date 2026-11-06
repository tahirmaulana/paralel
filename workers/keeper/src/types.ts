// @file workers/keeper/src/types.ts

export interface SecretsStoreSecret {
  get(): Promise<string>;
}

export interface Env {
  DATABASE_URL: SecretsStoreSecret;
  ARBITRUM_RPC_URL: SecretsStoreSecret;
  RELAYER_PRIVATE_KEY: SecretsStoreSecret;

  AUCTION_CONTRACT_ADDRESS: string;
  MAX_ACTIONS_PER_RUN?: string;
  MAX_CANDIDATES?: string;
}

export type KeeperActionKind =
  | 'startAwarding'
  | 'advanceCandidate'
  | 'expireCollection';

export type DbAuctionStatus =
  | 'SCHEDULED'
  | 'AWARDING'
  | 'COLLECTION';

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