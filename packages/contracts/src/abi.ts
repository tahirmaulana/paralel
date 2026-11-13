import { parseAbi } from 'viem';
import { ParalelAuctionV3Abi } from './abi-v3';

/**
 * Compatibility ABI for the previous ParalelAuction v2 deployment.
 *
 * Do not maintain separate ABI files in:
 * - apps/web
 * - workers/indexer
 * - workers/keeper
 * - packages/relay
 */
export const ParalelAuctionV2Abi = parseAbi([
  // ---------------------------------------------------------------------------
  // Immutable/global reads
  // ---------------------------------------------------------------------------

  'function DOMAIN_SEPARATOR() view returns (bytes32)',
  'function NOTARY_APPROVAL_TYPEHASH() view returns (bytes32)',
  'function CONSIGNOR_CONFIRM_TYPEHASH() view returns (bytes32)',
  'function AWARD_SIGN_TYPEHASH() view returns (bytes32)',
  'function COLLECTED_TYPEHASH() view returns (bytes32)',
  'function WITHDRAWN_TYPEHASH() view returns (bytes32)',
  'function WITHDRAW_REQUEST_TYPEHASH() view returns (bytes32)',

  'function RANK_SLOTS() view returns (uint8)',
  'function BPS_DENOMINATOR() view returns (uint16)',

  // ---------------------------------------------------------------------------
  // Global configuration
  // ---------------------------------------------------------------------------

  'function owner() view returns (address)',
  'function usdc() view returns (address)',
  'function platformWallet() view returns (address)',
  'function taxWallet() view returns (address)',
  'function relayerWallet() view returns (address)',
  'function feeConfig() view returns (uint16 platformBps, uint16 guarantorBps, uint16 notaryBps, uint16 taxBps, uint16 defaultFeeBps, uint128 withdrawalFee)',
  'function auctionTimingConfig() view returns (uint32 signingWindow, uint32 collectionWindow, uint32 claimWindow, uint16 minDurationHours, uint16 maxDurationHours, uint32 minOpenDelay, uint32 maxOpenDelay)',
  'function bidConfig() view returns (uint16 maxIncrementBps, bool preBidAllowed)',
  'function maxRankedCandidates() view returns (uint8)',

  'function allowedIncrements(uint128 increment) view returns (bool)',
  'function getAllowedIncrements() view returns (uint128[])',

  'function partners(address wallet) view returns (uint8 pType, uint8 category, bool active)',
  'function userAdmins(address wallet) view returns (bool)',

  'function nonces(address wallet) view returns (uint256)',

  'function claimable(address wallet) view returns (uint128)',
  'function claimableOf(address wallet) view returns (uint128)',

  // ---------------------------------------------------------------------------
  // Auction, round, and stake reads
  // ---------------------------------------------------------------------------

  'function statusOf(bytes32 auctionKey) view returns (uint8)',

  'function auctions(bytes32 auctionKey) view returns (address consignor, address guarantor, address notary, uint8 category, uint8 status, uint16 currentRound, bytes32 specHash, uint16 platformBps, uint16 guarantorBps, uint16 notaryBps, uint16 taxBps)',

  'function getAuction(bytes32 auctionKey) view returns ((address consignor, address guarantor, address notary, uint8 category, uint8 status, uint16 currentRound, bytes32 specHash, uint16 platformBps, uint16 guarantorBps, uint16 notaryBps, uint16 taxBps))',
  'function auctionConfigSnapshots(bytes32 auctionKey) view returns (address taxWallet, uint16 defaultFeeBps, uint128 withdrawalFee, uint32 signingWindow, uint32 collectionWindow, uint32 claimWindow, uint16 maxIncrementBps, bool preBidAllowed, uint8 maxRankedCandidates, uint16 minDurationHours, uint16 maxDurationHours, uint32 minOpenDelay, uint32 maxOpenDelay)',
  'function getAuctionConfigSnapshot(bytes32 auctionKey) view returns ((address taxWallet, uint16 defaultFeeBps, uint128 withdrawalFee, uint32 signingWindow, uint32 collectionWindow, uint32 claimWindow, uint16 maxIncrementBps, bool preBidAllowed, uint8 maxRankedCandidates, uint16 minDurationHours, uint16 maxDurationHours, uint32 minOpenDelay, uint32 maxOpenDelay))',

  'function rounds(bytes32 auctionKey, uint16 roundNo) view returns (uint128 startingBid, uint128 bidIncrement, uint64 openAt, uint64 closeAt, uint128 currentBid, address currentLeader, uint64 bidSeq, uint8 awardingIndex, uint64 awardingDeadline, address winner, uint128 winnerStake, uint64 collectionDeadline, uint64 claimPeriodEnd)',

  'function getRound(bytes32 auctionKey, uint16 roundNo) view returns ((uint128 startingBid, uint128 bidIncrement, uint64 openAt, uint64 closeAt, uint128 currentBid, address currentLeader, uint64 bidSeq, address[10] topRanks, uint8 awardingIndex, uint64 awardingDeadline, address winner, uint128 winnerStake, uint64 collectionDeadline, uint64 claimPeriodEnd))',

  'function stakes(bytes32 auctionKey, uint16 roundNo, address bidder) view returns (uint128 myBid, uint64 reachedSeq, bool withdrawn)',

  'function refundableOf(bytes32 auctionKey, uint16 roundNo, address bidder) view returns (uint128 gross, uint128 fee, uint128 net)',

  // ---------------------------------------------------------------------------
  // Owner writes
  // ---------------------------------------------------------------------------

  'function setPartner(address wallet, uint8 pType, uint8 category, bool active)',
  'function setUserAdmin(address wallet, bool active)',
  'function setFeeConfig((uint16 platformBps, uint16 guarantorBps, uint16 notaryBps, uint16 taxBps, uint16 defaultFeeBps, uint128 withdrawalFee) newConfig)',
  'function setTaxWallet(address newTaxWallet)',
  'function setAuctionTimingConfig((uint32 signingWindow, uint32 collectionWindow, uint32 claimWindow, uint16 minDurationHours, uint16 maxDurationHours, uint32 minOpenDelay, uint32 maxOpenDelay) newConfig)',
  'function setAllowedIncrement(uint128 increment, bool allowed)',
  'function setBidConfig((uint16 maxIncrementBps, bool preBidAllowed) newConfig)',
  'function setRankingConfig(uint8 newMaxRankedCandidates)',
  'function setRelayer(address newRelayer)',
  'function transferOwnership(address newOwner)',

  // ---------------------------------------------------------------------------
  // Auction registration and reuse
  // ---------------------------------------------------------------------------

  'function registerAuction((bytes32 auctionKey, address consignor, address guarantor, address notary, uint8 category, bytes32 specHash, uint128 startingBid, uint128 bidIncrement, uint64 openAt, uint16 durationHours, bytes32 confirmationCodeHash, bytes notarySig, bytes consignorSig, uint256 notaryNonce, uint256 notaryExpiry, uint256 consignorNonce, uint256 consignorExpiry) p)',

  'function reuseRound(bytes32 auctionKey, uint128 startingBid, uint128 bidIncrement, uint64 openAt, uint16 durationHours, uint256 nonce, uint256 expiry, uint8 v, bytes32 r, bytes32 s)',

  // ---------------------------------------------------------------------------
  // Bidding
  // ---------------------------------------------------------------------------

  'function placeBid(bytes32 auctionKey, uint16 roundNo, uint128 amount)',

  'function placeBidWithPermit(bytes32 auctionKey, uint16 roundNo, uint128 amount, uint256 deadline, uint8 v, bytes32 r, bytes32 s)',

  // ---------------------------------------------------------------------------
  // Keeper actions
  // ---------------------------------------------------------------------------

  'function startAwarding(bytes32 auctionKey, uint16 roundNo)',
  'function advanceCandidate(bytes32 auctionKey, uint16 roundNo)',
  'function expireCollection(bytes32 auctionKey, uint16 roundNo)',

  // ---------------------------------------------------------------------------
  // Signed/relayed actions
  // ---------------------------------------------------------------------------

  'function submitAwardSignature(bytes32 auctionKey, uint16 roundNo, uint256 nonce, uint256 expiry, uint8 v, bytes32 r, bytes32 s)',

  'function collected(bytes32 auctionKey, uint16 roundNo, uint256 nonce, uint256 expiry, uint8 v, bytes32 r, bytes32 s)',

  'function markWithdrawn(bytes32 auctionKey, uint16 roundNo, uint256 nonce, uint256 expiry, uint8 v, bytes32 r, bytes32 s)',

  'function withdrawRefund(bytes32 auctionKey, uint16 roundNo, address bidder, uint256 nonce, uint256 expiry, uint8 v, bytes32 r, bytes32 s)',

  'function withdrawConsignor(bytes32 auctionKey, uint16 roundNo, uint256 nonce, uint256 expiry, uint8 v, bytes32 r, bytes32 s)',

  'function withdrawClaimable()',

  // ---------------------------------------------------------------------------
  // Events
  // ---------------------------------------------------------------------------

  'event AuctionRegistered(bytes32 indexed auctionKey, address consignor, address guarantor, address notary, bytes32 specHash, uint128 startingBid, uint128 bidIncrement, uint64 openAt, uint16 durationHours)',

  'event RoundScheduled(bytes32 indexed auctionKey, uint16 roundNo, uint128 startingBid, uint128 bidIncrement, uint64 openAt, uint64 closeAt)',

  'event BidPlaced(bytes32 indexed auctionKey, uint16 roundNo, address indexed bidder, uint128 added, uint128 myBidAfter, uint128 currentBidAfter, uint64 seq, bool isPreBid)',

  'event Closed(bytes32 indexed auctionKey, uint16 roundNo)',

  'event AwardingStarted(bytes32 indexed auctionKey, uint16 roundNo, address candidate, uint64 deadline)',

  'event AwardSigned(bytes32 indexed auctionKey, uint16 roundNo, address winner)',

  'event Defaulted(bytes32 indexed auctionKey, uint16 roundNo, address candidate, uint128 defaultFee)',

  'event PassedIn(bytes32 indexed auctionKey, uint16 roundNo)',

  'event Collected(bytes32 indexed auctionKey, uint16 roundNo)',

  'event ClaimPeriodStarted(bytes32 indexed auctionKey, uint16 roundNo, bool autoIssued)',

  'event WithdrawnItem(bytes32 indexed auctionKey, uint16 roundNo)',

  'event FeeCredited(address indexed recipient, uint128 amount)',

  'event Withdrawal(bytes32 indexed auctionKey, uint16 roundNo, address indexed wallet, uint8 kind, uint128 gross, uint128 fee, uint128 net)',

  'event Settled(bytes32 indexed auctionKey, uint16 roundNo)',

  'event FeeConfigUpdated(uint16 platformBps, uint16 guarantorBps, uint16 notaryBps, uint16 taxBps, uint16 defaultFeeBps, uint128 withdrawalFee)',
  'event TaxWalletUpdated(address indexed previousWallet, address indexed newWallet)',
  'event AuctionTimingConfigUpdated(uint32 signingWindow, uint32 collectionWindow, uint32 claimWindow, uint16 minDurationHours, uint16 maxDurationHours, uint32 minOpenDelay, uint32 maxOpenDelay)',
  'event AllowedIncrementUpdated(uint128 increment, bool allowed)',
  'event BidConfigUpdated(uint16 maxIncrementBps, bool preBidAllowed)',
  'event RankingConfigUpdated(uint8 maxRankedCandidates)',
  'event PartnerUpdated(address indexed wallet, uint8 indexed partnerType, uint8 category, bool active)',
  'event UserAdminUpdated(address indexed wallet, bool active)',
  'event RelayerUpdated(address indexed previousRelayer, address indexed newRelayer)',
  'event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)',

  // ---------------------------------------------------------------------------
  // Custom errors
  // ---------------------------------------------------------------------------

  'error AlreadyWithdrawn()',
  'error AuctionExists()',
  'error AuctionNotBiddable()',
  'error BadSignature()',
  'error BiddingClosed()',
  'error CategoryMismatch()',
  'error ConsignorCannotBid()',
  'error IncrementTooLarge()',
  'error InvalidDuration()',
  'error InvalidIncrement()',
  'error InvalidOpenTime()',
  'error InvalidConfiguration()',
  'error NonceUsed()',
  'error NotCurrentCandidate()',
  'error NotMultipleOfIncrement()',
  'error NotOwner()',
  'error NotRefundable()',
  'error NotRelayer()',
  'error NothingToClaim()',
  'error PartnerNotRegistered()',
  'error SignatureExpired()',
  'error TooEarly()',
  'error WinnerCannotWithdraw()',
  'error WrongPhase()',
  'error ZeroAddress()',
]);

export const ParalelAuctionAbi = ParalelAuctionV3Abi;

export type ParalelAuctionAbi =
  typeof ParalelAuctionAbi;

/**
 * Temporary compatibility export.
 *
 * Existing relay consumers can import `relayAbi` while being migrated.
 */
export const relayAbi = ParalelAuctionAbi;