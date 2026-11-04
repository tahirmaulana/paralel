// @file packages/shared/relay/abi.ts
import { parseAbi } from 'viem';

export const relayAbi = parseAbi([
  'function registerAuction((bytes32 auctionKey, address consignor, address guarantor, address notary, uint8 category, bytes32 specHash, uint128 startingBid, uint128 bidIncrement, uint64 openAt, uint16 durationHours, uint16 platformBps, uint16 guarantorBps, uint16 notaryBps, uint16 taxBps, bytes32 confirmationCodeHash, bytes notarySig, bytes consignorSig, uint256 notaryNonce, uint256 notaryExpiry, uint256 consignorNonce, uint256 consignorExpiry) p)',
  'function submitAwardSignature(bytes32 auctionKey, uint16 roundNo, uint256 nonce, uint256 expiry, uint8 v, bytes32 r, bytes32 s)',
  'function collected(bytes32 auctionKey, uint16 roundNo, uint256 nonce, uint256 expiry, uint8 v, bytes32 r, bytes32 s)',
  'function withdrawRefund(bytes32 auctionKey, uint16 roundNo, address bidder, uint256 nonce, uint256 expiry, uint8 v, bytes32 r, bytes32 s)',
  'function withdrawConsignor(bytes32 auctionKey, uint16 roundNo, uint256 nonce, uint256 expiry, uint8 v, bytes32 r, bytes32 s)',
  'function reuseRound(bytes32 auctionKey, uint128 startingBid, uint128 bidIncrement, uint64 openAt, uint16 durationHours, uint256 nonce, uint256 expiry, uint8 v, bytes32 r, bytes32 s)',
  'function markWithdrawn(bytes32 auctionKey, uint16 roundNo, uint256 nonce, uint256 expiry, uint8 v, bytes32 r, bytes32 s)',
  'function nonces(address) view returns (uint256)',
  'function statusOf(bytes32 auctionKey) view returns (uint8)',
  'function getRound(bytes32 auctionKey, uint16 roundNo) view returns ((uint128 startingBid, uint128 bidIncrement, uint64 openAt, uint64 closeAt, uint128 currentBid, address currentLeader, uint64 bidSeq, address[10] topRanks, uint8 awardingIndex, uint64 awardingDeadline, address winner, uint128 winnerStake, uint64 collectionDeadline, uint64 claimPeriodEnd))',
  'function stakes(bytes32 auctionKey, uint16 roundNo, address bidder) view returns (uint128 myBid, uint64 reachedSeq, bool withdrawn)',
]);