import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ContractAuctionStatus,
  type AuctionConfigSnapshotState,
  type AuctionContractState,
} from '@paralel/contracts';
import { parseReuseRound, validateReuseRoundEvidence } from '../src/lib/relay/reuse-round-security';
const request = parseReuseRound({
  auctionKey:`0x${'11'.repeat(32)}`, startingBid:'2000000', bidIncrement:'50000',
  openAt:'1794441600', durationHours:24, nonce:'7', expiry:'1794272400',
  signature:`0x${'22'.repeat(65)}`,
});
const auction: AuctionContractState = {
  consignor:'0x3333333333333333333333333333333333333333',
  guarantor:'0x4444444444444444444444444444444444444444',
  notary:'0x5555555555555555555555555555555555555555',
  category:0,status:ContractAuctionStatus.PASSED_IN,currentRound:1,
  specHash:`0x${'66'.repeat(32)}`,platformBps:250,guarantorBps:150,notaryBps:100,taxBps:1000,
};
const configSnapshot: AuctionConfigSnapshotState = {
  taxWallet: '0x6666666666666666666666666666666666666666',
  defaultFeeBps: 500,
  withdrawalFee: 2_500_000n,
  signingWindow: 300,
  collectionWindow: 172_800,
  claimWindow: 604_800,
  maxIncrementBps: 500,
  preBidAllowed: true,
  maxRankedCandidates: 10,
  minDurationHours: 12,
  maxDurationHours: 48,
  minOpenDelay: 172_800,
  maxOpenDelay: 604_800,
};
test('accepts canonical reuseRound request and evidence',()=>{
  assert.doesNotThrow(()=>validateReuseRoundEvidence({
    auction,authenticatedWallet:auction.consignor,currentNonce:7n,request,
    blockTimestamp:1794268800n,
    configSnapshot,
    allowedIncrements:[50_000n],
  }));
});
test('rejects body wallet authority',()=>{
  assert.throws(()=>parseReuseRound({...request,consignor:auction.consignor,nonce:'7',expiry:'1794272400',startingBid:'2000000',bidIncrement:'50000',openAt:'1794441600',signature:`0x${'22'.repeat(65)}`}),/unknown fields/i);
});
test('rejects wrong phase stale nonce and invalid openAt',()=>{
  const common = {
    auction,
    authenticatedWallet: auction.consignor,
    currentNonce: 7n,
    request,
    blockTimestamp: 1794268800n,
    configSnapshot,
    allowedIncrements: [50_000n],
  };
  assert.throws(()=>validateReuseRoundEvidence({...common,auction:{...auction,status:ContractAuctionStatus.SETTLED}}),/PASSED_IN/i);
  assert.throws(()=>validateReuseRoundEvidence({...common,currentNonce:8n}),/nonce is stale/i);
  assert.throws(()=>validateReuseRoundEvidence({...common,request:{...request,openAt:1794268801n}}),/outside the auction configuration snapshot/i);
});

test('uses the auction snapshot and current increment allowlist', () => {
  const flexibleSnapshot = {
    ...configSnapshot,
    maxIncrementBps: 1_000,
    minDurationHours: 6,
    maxDurationHours: 72,
    minOpenDelay: 3_600,
    maxOpenDelay: 604_800,
  };
  const flexibleRequest = {
    ...request,
    bidIncrement: 100_000n,
    durationHours: 6,
    openAt: 1794272400n,
  };
  assert.doesNotThrow(() =>
    validateReuseRoundEvidence({
      auction,
      authenticatedWallet: auction.consignor,
      currentNonce: 7n,
      request: flexibleRequest,
      blockTimestamp: 1794268800n,
      configSnapshot: flexibleSnapshot,
      allowedIncrements: [100_000n],
    }),
  );
});
