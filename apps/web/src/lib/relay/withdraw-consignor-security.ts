// @file apps/web/src/lib/relay/withdraw-consignor-security.ts
//
// Pure request and time validation for authenticated Consignor settlement.
// Wallet authority comes exclusively from the signed USER session.
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
  isHex,
  type Address,
  type Hex,
} from 'viem';

export type WithdrawConsignorRequest =
  Readonly<{
    auctionKey:
      Hex;
    roundNo:
      number;
    nonce:
      bigint;
    expiry:
      bigint;
    signature:
      Hex;
  }>;

export type WithdrawConsignorContractEvidence =
  Readonly<{
    consignor:
      Address;
    currentNonce:
      bigint;
    claimPeriodEnd:
      bigint;
    winnerStake:
      bigint;
  }>;

export const WITHDRAW_CONSIGNOR_EXPIRY_SECONDS =
  3_600n;

function invalidInput(
  message:
    string,
  field?:
    string,
): never {
  throw createDomainError(
    'INVALID_INPUT',
    message,
    field
      ? {
          details: {
            field,
          },
        }
      : undefined,
  );
}

function parseUnsignedDecimal(
  value:
    unknown,
  field:
    string,
): bigint {
  if (
    typeof value !==
      'string' ||
    !/^(0|[1-9][0-9]*)$/.test(
      value,
    )
  ) {
    return invalidInput(
      `${field} must be an unsigned decimal integer string.`,
      field,
    );
  }

  return BigInt(
    value,
  );
}

export function parseWithdrawConsignor(
  value:
    unknown,
): WithdrawConsignorRequest {
  if (
    typeof value !==
      'object' ||
    value === null ||
    Array.isArray(
      value,
    )
  ) {
    return invalidInput(
      'Request body must be a JSON object.',
    );
  }

  const body =
    value as
      Record<
        string,
        unknown
      >;

  const allowed =
    new Set([
      'auctionKey',
      'roundNo',
      'nonce',
      'expiry',
      'signature',
    ]);

  const unknownFields =
    Object.keys(
      body,
    )
      .filter(
        (
          field,
        ) =>
          !allowed.has(
            field,
          ),
      );

  if (
    unknownFields.length !==
      0
  ) {
    throw createDomainError(
      'INVALID_INPUT',
      'Request body contains unknown fields.',
      {
        details: {
          fields:
            unknownFields,
        },
      },
    );
  }

  if (
    typeof body.auctionKey !==
      'string' ||
    !isHex(
      body.auctionKey,
    ) ||
    body.auctionKey.length !==
      66
  ) {
    return invalidInput(
      'auctionKey must be a 32-byte hexadecimal value.',
      'auctionKey',
    );
  }

  const roundNo =
    typeof body.roundNo ===
      'number'
      ? body.roundNo
      : (
          typeof body.roundNo ===
            'string' &&
          /^(0|[1-9][0-9]*)$/.test(
            body.roundNo,
          )
            ? Number(
                body.roundNo,
              )
            : Number.NaN
        );

  if (
    !Number.isSafeInteger(
      roundNo,
    ) ||
    roundNo < 1 ||
    roundNo > 65_535
  ) {
    return invalidInput(
      'roundNo must be an integer from 1 through 65535.',
      'roundNo',
    );
  }

  const nonce =
    parseUnsignedDecimal(
      body.nonce,
      'nonce',
    );

  const expiry =
    parseUnsignedDecimal(
      body.expiry,
      'expiry',
    );

  if (
    expiry === 0n
  ) {
    return invalidInput(
      'expiry must be greater than zero.',
      'expiry',
    );
  }

  if (
    typeof body.signature !==
      'string' ||
    !isHex(
      body.signature,
    ) ||
    body.signature.length !==
      132
  ) {
    return invalidInput(
      'signature must be a 65-byte hexadecimal value.',
      'signature',
    );
  }

  return Object.freeze({
    auctionKey:
      body.auctionKey
        .toLowerCase() as Hex,
    roundNo,
    nonce,
    expiry,
    signature:
      body.signature as Hex,
  });
}

export function validateWithdrawConsignorEvidence(
  input:
    Readonly<{
      auction:
        AuctionContractState;
      round:
        AuctionRoundState;
      requestedRoundNo:
        number;
      requestedNonce:
        bigint;
      currentNonce:
        bigint;
      authenticatedWallet:
        Address;
      blockTimestamp:
        bigint;
      expiry:
        bigint;
    }>,
): WithdrawConsignorContractEvidence {
  if (
    input.auction.status !==
      ContractAuctionStatus
        .CLAIM_PERIOD
  ) {
    throw createDomainError(
      'AUCTION_STATE_CHANGED',
      'Contract auction is not in CLAIM_PERIOD.',
      {
        retryable:
          true,
      },
    );
  }

  if (
    input.auction.currentRound !==
      input.requestedRoundNo
  ) {
    throw createDomainError(
      'AUCTION_STATE_CHANGED',
      'Contract current round does not match the signed withdrawal round.',
      {
        retryable:
          true,
      },
    );
  }

  if (
    !isAddress(
      input.auction
        .consignor,
    ) ||
    input.auction
      .consignor
      .toLowerCase() !==
    input.authenticatedWallet
      .toLowerCase()
  ) {
    throw createDomainError(
      'RESOURCE_FORBIDDEN',
      'Authenticated wallet is not the auction Consignor.',
    );
  }

  if (
    input.currentNonce !==
      input.requestedNonce
  ) {
    throw createDomainError(
      'INVALID_INPUT',
      'WithdrawRequest nonce is stale.',
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

  if (
    input.expiry <=
      input.blockTimestamp
  ) {
    throw createDomainError(
      'SIGNATURE_EXPIRED',
      'WithdrawRequest signature has expired.',
      {
        details: {
          field:
            'expiry',
        },
      },
    );
  }

  if (
    input.expiry >
      input.blockTimestamp +
        WITHDRAW_CONSIGNOR_EXPIRY_SECONDS
  ) {
    throw createDomainError(
      'INVALID_INPUT',
      'WithdrawRequest expiry exceeds the 3600-second signing window.',
      {
        details: {
          field:
            'expiry',
        },
      },
    );
  }

  if (
    input.round
      .claimPeriodEnd <=
      0n ||
    input.blockTimestamp <
      input.round
        .claimPeriodEnd
  ) {
    throw createDomainError(
      'AUCTION_STATE_CHANGED',
      'The Consignor claim period has not ended.',
      {
        retryable:
          true,
        details: {
          claimPeriodEnd:
            input.round
              .claimPeriodEnd
              .toString(),
          blockTimestamp:
            input.blockTimestamp
              .toString(),
        },
      },
    );
  }

  if (
    input.round
      .winnerStake <=
      0n
  ) {
    throw createDomainError(
      'AUCTION_STATE_CHANGED',
      'Contract winner stake is unavailable for settlement.',
      {
        retryable:
          true,
      },
    );
  }

  return Object.freeze({
    consignor:
      input.auction
        .consignor
        .toLowerCase() as
          Address,
    currentNonce:
      input.currentNonce,
    claimPeriodEnd:
      input.round
        .claimPeriodEnd,
    winnerStake:
      input.round
        .winnerStake,
  });
}
