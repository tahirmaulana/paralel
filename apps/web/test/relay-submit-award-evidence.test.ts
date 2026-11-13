import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ContractAuctionStatus,
  type AuctionContractState,
  type AuctionRoundState,
} from '@paralel/contracts';

import {
  zeroAddress,
} from 'viem';

import {
  validateSubmitAwardContractEvidence,
} from '../src/lib/relay/submit-award-evidence';

const candidate =
  '0x1111111111111111111111111111111111111111';

const auction:
  AuctionContractState =
  {
    consignor:
      '0x2222222222222222222222222222222222222222',
    guarantor:
      '0x3333333333333333333333333333333333333333',
    notary:
      '0x4444444444444444444444444444444444444444',
    category:
      0,
    status:
      ContractAuctionStatus.AWARDING,
    currentRound:
      2,
    specHash:
      `0x${'55'.repeat(32)}`,
    platformBps:
      250,
    guarantorBps:
      150,
    notaryBps:
      100,
    taxBps:
      1_000,
  };

const round:
  AuctionRoundState =
  {
    startingBid:
      100_000_000n,
    bidIncrement:
      5_000_000n,
    openAt:
      1_794_268_800n,
    closeAt:
      1_794_355_200n,
    currentBid:
      150_000_000n,
    currentLeader:
      candidate,
    bidSeq:
      10n,
    topRanks: [
      candidate,
      zeroAddress,
      zeroAddress,
      zeroAddress,
      zeroAddress,
      zeroAddress,
      zeroAddress,
      zeroAddress,
      zeroAddress,
      zeroAddress,
    ],
    awardingIndex:
      0,
    awardingDeadline:
      1_794_355_500n,
    winner:
      zeroAddress,
    winnerStake:
      0n,
    collectionDeadline:
      0n,
    claimPeriodEnd:
      0n,
  };

test(
  'accepts canonical AwardSign contract evidence',
  () => {
    assert.deepEqual(
      validateSubmitAwardContractEvidence({
        auction,
        round,
        requestedRoundNo:
          2,
        requestedRank:
          0,
        requestedNonce:
          7n,
        currentNonce:
          7n,
      }),
      {
        activeCandidate:
          candidate,
        awardingIndex:
          0,
        currentNonce:
          7n,
      },
    );
  },
);

test(
  'rejects contract state or round drift',
  () => {
    assert.throws(
      () =>
        validateSubmitAwardContractEvidence({
          auction: {
            ...auction,
            status:
              ContractAuctionStatus.COLLECTION,
          },
          round,
          requestedRoundNo:
            2,
          requestedRank:
            0,
          requestedNonce:
            7n,
          currentNonce:
            7n,
        }),
      /not in AWARDING/i,
    );

    assert.throws(
      () =>
        validateSubmitAwardContractEvidence({
          auction,
          round,
          requestedRoundNo:
            1,
          requestedRank:
            0,
          requestedNonce:
            7n,
          currentNonce:
            7n,
        }),
      /current round/i,
    );
  },
);

test(
  'rejects AwardSign rank drift and missing candidate',
  () => {
    assert.throws(
      () =>
        validateSubmitAwardContractEvidence({
          auction,
          round,
          requestedRoundNo:
            2,
          requestedRank:
            1,
          requestedNonce:
            7n,
          currentNonce:
            7n,
        }),
      /active contract rank/i,
    );

    assert.throws(
      () =>
        validateSubmitAwardContractEvidence({
          auction,
          round: {
            ...round,
            topRanks: [
              zeroAddress,
              zeroAddress,
              zeroAddress,
              zeroAddress,
              zeroAddress,
              zeroAddress,
              zeroAddress,
              zeroAddress,
              zeroAddress,
              zeroAddress,
            ],
          },
          requestedRoundNo:
            2,
          requestedRank:
            0,
          requestedNonce:
            7n,
          currentNonce:
            7n,
        }),
      /candidate is unavailable/i,
    );
  },
);

test(
  'rejects an existing winner',
  () => {
    assert.throws(
      () =>
        validateSubmitAwardContractEvidence({
          auction,
          round: {
            ...round,
            winner:
              candidate,
          },
          requestedRoundNo:
            2,
          requestedRank:
            0,
          requestedNonce:
            7n,
          currentNonce:
            7n,
        }),
      /already has a winner/i,
    );
  },
);

test(
  'rejects stale AwardSign nonce',
  () => {
    assert.throws(
      () =>
        validateSubmitAwardContractEvidence({
          auction,
          round,
          requestedRoundNo:
            2,
          requestedRank:
            0,
          requestedNonce:
            6n,
          currentNonce:
            7n,
        }),
      /nonce is stale/i,
    );
  },
);
