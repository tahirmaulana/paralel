import type {
  Address,
  Hex,
  PublicClient,
  WalletClient,
} from 'viem';

export type AuctionKey = Hex;

export type ParalelPublicClient = PublicClient;

export type ParalelWalletClient = WalletClient;

export type ContractSignature = {
  signature: Hex;
  nonce: bigint;
  expiry: bigint;
};

export type SplitContractSignature = {
  v: number;
  r: Hex;
  s: Hex;
};

export type RegisterAuctionInput = {
  auctionKey: AuctionKey;
  consignor: Address;
  guarantor: Address;
  notary: Address;
  category: number;
  specHash: Hex;
  startingBid: bigint;
  bidIncrement: bigint;
  openAt: bigint;
  durationHours: number;
  confirmationCodeHash: Hex;
  notarySig: Hex;
  consignorSig: Hex;
  notaryNonce: bigint;
  notaryExpiry: bigint;
  consignorNonce: bigint;
  consignorExpiry: bigint;
};

export type ReuseRoundInput = {
  auctionKey: AuctionKey;
  startingBid: bigint;
  bidIncrement: bigint;
  openAt: bigint;
  durationHours: number;
  nonce: bigint;
  expiry: bigint;
  signature: Hex;
};

export type AwardSignatureInput = {
  auctionKey: AuctionKey;
  roundNo: number;
  rank: number;
  nonce: bigint;
  expiry: bigint;
  signature: Hex;
};

export type CollectedInput = {
  auctionKey: AuctionKey;
  roundNo: number;
  guarantor: Address;
  nonce: bigint;
  expiry: bigint;
  signature: Hex;
};

export type WithdrawnInput = {
  auctionKey: AuctionKey;
  roundNo: number;
  guarantor: Address;
  nonce: bigint;
  expiry: bigint;
  signature: Hex;
};

export type WithdrawRefundInput = {
  auctionKey: AuctionKey;
  roundNo: number;
  bidder: Address;
  nonce: bigint;
  expiry: bigint;
  signature: Hex;
};

export type WithdrawConsignorInput = {
  auctionKey: AuctionKey;
  roundNo: number;
  consignor: Address;
  nonce: bigint;
  expiry: bigint;
  signature: Hex;
};

export type AuctionContractState = {
  consignor: Address;
  guarantor: Address;
  notary: Address;
  category: number;
  status: number;
  currentRound: number;
  specHash: Hex;
  platformBps: number;
  guarantorBps: number;
  notaryBps: number;
  taxBps: number;
};

export type AuctionConfigSnapshotState = {
  taxWallet: Address;
  defaultFeeBps: number;
  withdrawalFee: bigint;
  signingWindow: number;
  collectionWindow: number;
  claimWindow: number;
  maxIncrementBps: number;
  preBidAllowed: boolean;
  maxRankedCandidates: number;
  minDurationHours: number;
  maxDurationHours: number;
  minOpenDelay: number;
  maxOpenDelay: number;
};

export type FeeConfigState = {
  platformBps: number;
  guarantorBps: number;
  notaryBps: number;
  taxBps: number;
  defaultFeeBps: number;
  withdrawalFee: bigint;
};

export type AuctionTimingConfigState = {
  signingWindow: number;
  collectionWindow: number;
  claimWindow: number;
  minDurationHours: number;
  maxDurationHours: number;
  minOpenDelay: number;
  maxOpenDelay: number;
};

export type BidConfigState = {
  maxIncrementBps: number;
  preBidAllowed: boolean;
};

export type AuctionRoundState = {
  startingBid: bigint;
  bidIncrement: bigint;
  openAt: bigint;
  closeAt: bigint;
  currentBid: bigint;
  currentLeader: Address;
  bidSeq: bigint;
  topRanks: readonly Address[];
  awardingIndex: number;
  awardingDeadline: bigint;
  winner: Address;
  winnerStake: bigint;
  collectionDeadline: bigint;
  claimPeriodEnd: bigint;
};

export type BidderStakeState = {
  myBid: bigint;
  reachedSeq: bigint;
  withdrawn: boolean;
};

export type RefundableAmount = {
  gross: bigint;
  fee: bigint;
  net: bigint;
};

export type PartnerContractState = {
  pType: number;
  category: number;
  active: boolean;
};