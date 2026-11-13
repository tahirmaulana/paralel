// @file apps/web/src/lib/relay/submit-award-evidence.ts
//
// Pure validation of authoritative contract evidence for AwardSign.
//
// No RPC occurs here. The caller reads auction, round, and nonce outside any
// PostgreSQL row lock, then passes those facts into this validator.
import {
  ContractAuctionStatus,
  type AuctionContractState,
  type AuctionRoundState,
} from '@paralel/contracts';

import {
  createDomainError,
} from '@paralel/domain';

import {
  isAddress,
  zeroAddress,
  type Address,
} from 'viem';

export type SubmitAwardContractEvidence =
  Readonly<{
    activeCandidate:
      Address;
    awardingIndex:
      number;
    currentNonce:
      bigint;
  }>;

export function validateSubmitAwardContractEvidence(
  input:
    Readonly<{
      auction:
        AuctionContractState;
      round:
        AuctionRoundState;
      requestedRoundNo:
        number;
      requestedRank:
        number;
      requestedNonce:
        bigint;
      currentNonce:
        bigint;
    }>,
): SubmitAwardContractEvidence {
  if (
    input.auction.status !==
      ContractAuctionStatus.AWARDING
  ) {
    throw createDomainError(
      'AUCTION_STATE_CHANGED',
      'Contract auction is not in AWARDING.',
      {
        retryable:
          true,
        details: {
          contractStatus:
            input.auction.status,
        },
      },
    );
  }

  if (
    input.auction.currentRound !==
      input.requestedRoundNo
  ) {
    throw createDomainError(
      'AUCTION_STATE_CHANGED',
      'Contract current round does not match the signed AwardSign round.',
      {
        retryable:
          true,
        details: {
          contractRound:
            input.auction
              .currentRound,
          requestedRound:
            input.requestedRoundNo,
        },
      },
    );
  }

  const awardingIndex =
    input.round
      .awardingIndex;

  if (
    !Number.isSafeInteger(
      awardingIndex,
    ) ||
    awardingIndex < 0 ||
    awardingIndex > 9
  ) {
    throw createDomainError(
      'AUCTION_STATE_CHANGED',
      'Contract awarding index is invalid.',
      {
        retryable:
          true,
        details: {
          awardingIndex,
        },
      },
    );
  }

  if (
    input.requestedRank !==
      awardingIndex
  ) {
    throw createDomainError(
      'AUCTION_STATE_CHANGED',
      'Signed AwardSign rank is no longer the active contract rank.',
      {
        retryable:
          true,
        details: {
          activeRank:
            awardingIndex,
          requestedRank:
            input.requestedRank,
        },
      },
    );
  }

  if (
    input.round.winner !==
      zeroAddress
  ) {
    throw createDomainError(
      'ALREADY_PROCESSED',
      'Contract round already has a winner.',
      {
        details: {
          winner:
            input.round
              .winner,
        },
      },
    );
  }

  const activeCandidate =
    input.round
      .topRanks[
        awardingIndex
      ];

  if (
    typeof activeCandidate !==
      'string' ||
    !isAddress(
      activeCandidate,
    ) ||
    activeCandidate ===
      zeroAddress
  ) {
    throw createDomainError(
      'AUCTION_STATE_CHANGED',
      'Contract active AwardSign candidate is unavailable.',
      {
        retryable:
          true,
        details: {
          awardingIndex,
        },
      },
    );
  }

  if (
    input.requestedNonce <
      0n ||
    input.currentNonce <
      0n
  ) {
    throw createDomainError(
      'INVALID_INPUT',
      'AwardSign nonce must be non-negative.',
      {
        details: {
          field:
            'nonce',
        },
      },
    );
  }

  if (
    input.currentNonce !==
      input.requestedNonce
  ) {
    throw createDomainError(
      'INVALID_INPUT',
      'AwardSign nonce is stale.',
      {
        retryable:
          true,
        details: {
          expectedNonce:
            input.currentNonce
              .toString(),
          receivedNonce:
            input.requestedNonce
              .toString(),
        },
      },
    );
  }

  return Object.freeze({
    activeCandidate:
      activeCandidate
        .toLowerCase() as Address,
    awardingIndex,
    currentNonce:
      input.currentNonce,
  });
}
