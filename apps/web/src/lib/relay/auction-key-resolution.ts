// @file apps/web/src/lib/relay/auction-key-resolution.ts
//
// Pure canonical resolution from contract auctionKey to database auction.
//
// The database stores auctionCode. The contract key is deterministically:
// keccak256(toBytes(auctionCode)).
import {
  createDomainError,
} from '@paralel/domain';

import {
  computeAuctionKey,
} from '@/lib/auction/auction-code';

import type {
  Hex,
} from 'viem';

export type AuctionKeyCandidate =
  Readonly<{
    auctionId:
      string;
    auctionCode:
      string;
    currentRound:
      number;
  }>;

export type ResolvedAuctionIdentity =
  Readonly<{
    auctionId:
      string;
    auctionCode:
      string;
    currentRound:
      number;
    auctionKey:
      Hex;
  }>;

export function resolveAuctionIdentityFromKey(
  candidates:
    readonly AuctionKeyCandidate[],
  input:
    Readonly<{
      auctionKey:
        Hex;
      roundNo:
        number;
    }>,
): ResolvedAuctionIdentity {
  if (
    !Number.isSafeInteger(
      input.roundNo,
    ) ||
    input.roundNo < 1
  ) {
    throw createDomainError(
      'INVALID_INPUT',
      'Award round number is invalid.',
      {
        details: {
          field:
            'roundNo',
        },
      },
    );
  }

  const normalizedKey =
    input.auctionKey
      .toLowerCase() as Hex;

  const matches =
    candidates.filter(
      (candidate) =>
        candidate
          .currentRound ===
          input.roundNo &&
        computeAuctionKey(
          candidate
            .auctionCode,
        ).toLowerCase() ===
          normalizedKey,
    );

  if (
    matches.length ===
      0
  ) {
    throw createDomainError(
      'AUCTION_NOT_FOUND',
      'No current database auction matches the supplied auction key and round.',
      {
        details: {
          auctionKey:
            normalizedKey,
          roundNo:
            input.roundNo,
        },
      },
    );
  }

  if (
    matches.length !==
      1 ||
    !matches[0]
  ) {
    throw new Error(
      'Auction key resolution is not unique.',
    );
  }

  return Object.freeze({
    auctionId:
      matches[0]
        .auctionId,
    auctionCode:
      matches[0]
        .auctionCode,
    currentRound:
      matches[0]
        .currentRound,
    auctionKey:
      normalizedKey,
  });
}
