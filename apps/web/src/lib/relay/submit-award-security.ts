// @file apps/web/src/lib/relay/submit-award-security.ts
//
// Pure validation for relayed AwardSign submissions.
// Candidate authority always comes from the authenticated session.
import {
  createDomainError,
} from '@paralel/domain';

import {
  isHex,
  type Hex,
} from 'viem';

export type SubmitAwardInput =
  Readonly<{
    auctionKey:
      Hex;
    roundNo:
      number;
    rank:
      number;
    nonce:
      bigint;
    expiry:
      bigint;
    signature:
      Hex;
  }>;

function invalidInput(
  message: string,
  field?: string,
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
  value: unknown,
  field: string,
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

function parseBoundedInteger(
  value: unknown,
  field: string,
  minimum: number,
  maximum: number,
): number {
  const parsed =
    typeof value ===
      'number'
      ? value
      : (
          typeof value ===
            'string' &&
          /^(0|[1-9][0-9]*)$/.test(
            value,
          )
            ? Number(
                value,
              )
            : Number.NaN
        );

  if (
    !Number.isSafeInteger(
      parsed,
    ) ||
    parsed < minimum ||
    parsed > maximum
  ) {
    return invalidInput(
      `${field} must be an integer from ${minimum} through ${maximum}.`,
      field,
    );
  }

  return parsed;
}

export function parseSubmitAward(
  value: unknown,
): SubmitAwardInput {
  if (
    typeof value !==
      'object' ||
    value === null ||
    Array.isArray(value)
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
      'rank',
      'nonce',
      'expiry',
      'signature',
    ]);

  const unknownFields =
    Object.keys(
      body,
    ).filter(
      (field) =>
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
    expiry ===
      0n
  ) {
    return invalidInput(
      'expiry must be greater than zero.',
      'expiry',
    );
  }

  return Object.freeze({
    auctionKey:
      body.auctionKey
        .toLowerCase() as Hex,
    roundNo:
      parseBoundedInteger(
        body.roundNo,
        'roundNo',
        1,
        65_535,
      ),
    rank:
      parseBoundedInteger(
        body.rank,
        'rank',
        0,
        9,
      ),
    nonce,
    expiry,
    signature:
      body.signature as Hex,
  });
}

export const AWARD_SIGNATURE_EXPIRY_SECONDS =
  3_600n;

export function assertSubmitAwardSigningWindow(
  input:
    Readonly<{
      expiry:
        bigint;
      blockTimestamp:
        bigint;
      awardingDeadline:
        bigint;
    }>,
): void {
  if (
    input.expiry <=
      input.blockTimestamp
  ) {
    throw createDomainError(
      'SIGNATURE_EXPIRED',
      'AwardSign signature has expired.',
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
        AWARD_SIGNATURE_EXPIRY_SECONDS
  ) {
    throw createDomainError(
      'INVALID_INPUT',
      'AwardSign expiry exceeds the 3600-second signing window.',
      {
        details: {
          field:
            'expiry',
        },
      },
    );
  }

  if (
    input.awardingDeadline <=
      0n ||
    input.blockTimestamp >
      input.awardingDeadline
  ) {
    throw createDomainError(
      'AUCTION_STATE_CHANGED',
      'The active AwardSign candidate deadline has passed.',
      {
        retryable:
          true,
        details: {
          awardingDeadline:
            input.awardingDeadline
              .toString(),
          blockTimestamp:
            input.blockTimestamp
              .toString(),
        },
      },
    );
  }
}
