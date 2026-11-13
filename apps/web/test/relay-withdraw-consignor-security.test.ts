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
  parseWithdrawConsignor,
  validateWithdrawConsignorEvidence,
} from '../src/lib/relay/withdraw-consignor-security';

const consignor =
  '0x1111111111111111111111111111111111111111';

const auction:
  AuctionContractState =
  {
    consignor,
    guarantor:
      '0x2222222222222222222222222222222222222222',
    notary:
      '0x3333333333333333333333333333333333333333',
    category:
      0,
    status:
      ContractAuctionStatus
        .CLAIM_PERIOD,
    currentRound:
      2,
    specHash:
      `0x${'44'.repeat(32)}`,
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
      consignor,
    bidSeq:
      10n,
    topRanks: [
      consignor,
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
      consignor,
    winnerStake:
      150_000_000n,
    collectionDeadline:
      1_794_528_000n,
    claimPeriodEnd:
      1_795_132_800n,
  };

test(
  'accepts canonical WithdrawConsignor input',
  () => {
    assert.deepEqual(
      parseWithdrawConsignor({
        auctionKey:
          `0x${'55'.repeat(32)}`,
        roundNo:
          2,
        nonce:
          '7',
        expiry:
          '1795136400',
        signature:
          `0x${'66'.repeat(65)}`,
      }),
      {
        auctionKey:
          `0x${'55'.repeat(32)}`,
        roundNo:
          2,
        nonce:
          7n,
        expiry:
          1_795_136_400n,
        signature:
          `0x${'66'.repeat(65)}`,
      },
    );
  },
);

test(
  'rejects wallet authority and unknown fields',
  () => {
    assert.throws(
      () =>
        parseWithdrawConsignor({
          auctionKey:
            `0x${'55'.repeat(32)}`,
          roundNo:
            2,
          consignor,
          nonce:
            '7',
          expiry:
            '1795136400',
          signature:
            `0x${'66'.repeat(65)}`,
        }),
      /unknown fields/i,
    );
  },
);

test(
  'accepts canonical contract settlement evidence',
  () => {
    assert.deepEqual(
      validateWithdrawConsignorEvidence({
        auction,
        round,
        requestedRoundNo:
          2,
        requestedNonce:
          7n,
        currentNonce:
          7n,
        authenticatedWallet:
          consignor,
        blockTimestamp:
          1_795_132_800n,
        expiry:
          1_795_136_400n,
      }),
      {
        consignor,
        currentNonce:
          7n,
        claimPeriodEnd:
          1_795_132_800n,
        winnerStake:
          150_000_000n,
      },
    );
  },
);

test(
  'rejects phase ownership round and nonce drift',
  () => {
    assert.throws(
      () =>
        validateWithdrawConsignorEvidence({
          auction: {
            ...auction,
            status:
              ContractAuctionStatus
                .SETTLED,
          },
          round,
          requestedRoundNo:
            2,
          requestedNonce:
            7n,
          currentNonce:
            7n,
          authenticatedWallet:
            consignor,
          blockTimestamp:
            1_795_132_800n,
          expiry:
            1_795_136_400n,
        }),
      /not in CLAIM_PERIOD/i,
    );

    assert.throws(
      () =>
        validateWithdrawConsignorEvidence({
          auction,
          round,
          requestedRoundNo:
            1,
          requestedNonce:
            7n,
          currentNonce:
            7n,
          authenticatedWallet:
            consignor,
          blockTimestamp:
            1_795_132_800n,
          expiry:
            1_795_136_400n,
        }),
      /current round/i,
    );

    assert.throws(
      () =>
        validateWithdrawConsignorEvidence({
          auction,
          round,
          requestedRoundNo:
            2,
          requestedNonce:
            7n,
          currentNonce:
            8n,
          authenticatedWallet:
            consignor,
          blockTimestamp:
            1_795_132_800n,
          expiry:
            1_795_136_400n,
        }),
      /nonce is stale/i,
    );
  },
);

test(
  'rejects early claim and invalid signing window',
  () => {
    assert.throws(
      () =>
        validateWithdrawConsignorEvidence({
          auction,
          round,
          requestedRoundNo:
            2,
          requestedNonce:
            7n,
          currentNonce:
            7n,
          authenticatedWallet:
            consignor,
          blockTimestamp:
            1_795_132_799n,
          expiry:
            1_795_136_399n,
        }),
      /claim period has not ended/i,
    );

    assert.throws(
      () =>
        validateWithdrawConsignorEvidence({
          auction,
          round,
          requestedRoundNo:
            2,
          requestedNonce:
            7n,
          currentNonce:
            7n,
          authenticatedWallet:
            consignor,
          blockTimestamp:
            1_795_132_800n,
          expiry:
            1_795_136_401n,
        }),
      /3600-second/i,
    );
  },
);
