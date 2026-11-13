// @file apps/web/src/lib/relay/withdraw-refund-security.ts
//
// Pure validation for authenticated refund withdrawal relay.
// Bidder authority comes exclusively from the signed session.
import {
  createDomainError,
} from '@paralel/domain';

import {
  isHex,
  type Hex,
} from 'viem';

export type WithdrawRefundRequest =
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

export const WITHDRAW_REFUND_EXPIRY_SECONDS =
  3_600n;

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

export function parseWithdrawRefund(
  value: unknown,
): WithdrawRefundRequest {
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
      Record<string, unknown>;

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

export function assertWithdrawRefundSigningWindow(
  input:
    Readonly<{
      expiry:
        bigint;
      blockTimestamp:
        bigint;
    }>,
): void {
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
        WITHDRAW_REFUND_EXPIRY_SECONDS
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
}
