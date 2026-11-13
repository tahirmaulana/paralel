// @file apps/web/src/lib/auction/confirm-security.ts
//
// Pure request validation for Consignor confirmation.
// No database, session, RPC, environment, or relay access.
import {
  createDomainError,
} from '@paralel/domain';

import {
  isHex,
  type Hex,
} from 'viem';

export type ConfirmAuctionInput =
  Readonly<{
    signature: Hex;
    nonce: bigint;
    expiry: bigint;
  }>;

function parseUnsignedInteger(
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
    throw createDomainError(
      'INVALID_INPUT',
      `${field} must be an unsigned decimal integer string.`,
      {
        details: {
          field,
        },
      },
    );
  }

  return BigInt(value);
}

export function parseConfirmAuctionInput(
  value: unknown,
): ConfirmAuctionInput {
  if (
    typeof value !==
      'object' ||
    value === null ||
    Array.isArray(value)
  ) {
    throw createDomainError(
      'INVALID_INPUT',
      'Request body must be an object.',
    );
  }

  const body =
    value as
      Record<string, unknown>;

  const allowed =
    new Set([
      'signature',
      'nonce',
      'expiry',
    ]);

  const unknownFields =
    Object.keys(body)
      .filter(
        (field) =>
          !allowed.has(field),
      );

  if (
    unknownFields.length !== 0
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
    typeof body.signature !==
      'string' ||
    !isHex(body.signature) ||
    body.signature.length !== 132
  ) {
    throw createDomainError(
      'INVALID_INPUT',
      'Signature must be a 65-byte hexadecimal value.',
      {
        details: {
          field:
            'signature',
        },
      },
    );
  }

  return Object.freeze({
    signature:
      body.signature as Hex,

    nonce:
      parseUnsignedInteger(
        body.nonce,
        'nonce',
      ),

    expiry:
      parseUnsignedInteger(
        body.expiry,
        'expiry',
      ),
  });
}

export function assertConfirmSigningWindow(
  input:
    Readonly<{
      expiry: bigint;
      now: Date;
    }>,
): void {
  if (
    !Number.isFinite(
      input.now.getTime(),
    )
  ) {
    throw createDomainError(
      'INVALID_INPUT',
      'Signing evaluation time is invalid.',
    );
  }

  const nowSeconds =
    BigInt(
      Math.floor(
        input.now.getTime() /
        1_000,
      ),
    );

  if (
    input.expiry <
      nowSeconds
  ) {
    throw createDomainError(
      'SIGNATURE_EXPIRED',
      'Consignor confirmation signature has expired.',
    );
  }

  if (
    input.expiry >
      nowSeconds + 300n
  ) {
    throw createDomainError(
      'INVALID_INPUT',
      'Consignor confirmation expiry exceeds the signing window.',
      {
        details: {
          field:
            'expiry',
        },
      },
    );
  }
}
