// @file apps/web/src/lib/notary/approval-security.ts
//
// Pure request validation for the two-phase Notary approval flow.
// Notary wallet authority always comes from the authenticated session.
import {
  createDomainError,
} from '@paralel/domain';

import {
  isHex,
  type Address,
  type Hex,
} from 'viem';

export type NotaryApprovalInitInput =
  Readonly<{
    auctionId: string;
  }>;

export type NotaryApprovalInput =
  Readonly<{
    auctionId: string;
    signature: Hex;
    nonce: bigint;
    expiry: bigint;
  }>;

export function normalizeNotarySignerWallet(
  wallet: string,
): Address {
  if (!/^0x[0-9a-fA-F]{40}$/.test(wallet)) {
    throw new Error(
      'Authenticated Notary wallet is not a valid EVM address.',
    );
  }

  return wallet.toLowerCase() as Address;
}

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

function parseObject(
  value: unknown,
  allowedFields:
    readonly string[],
): Record<string, unknown> {
  if (
    typeof value !== 'object' ||
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
    new Set(
      allowedFields,
    );

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

  return body;
}

function parseAuctionId(
  value: unknown,
): string {
  if (
    typeof value !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      .test(value)
  ) {
    return invalidInput(
      'auctionId must be a valid UUID.',
      'auctionId',
    );
  }

  return value.toLowerCase();
}

function parseSignature(
  value: unknown,
): Hex {
  if (
    typeof value !== 'string' ||
    !isHex(value) ||
    value.length !== 132
  ) {
    return invalidInput(
      'signature must be a 65-byte hexadecimal value.',
      'signature',
    );
  }

  return value as Hex;
}

function parseUnsignedDecimal(
  value: unknown,
  field: string,
): bigint {
  if (
    typeof value !== 'string' ||
    !/^(0|[1-9][0-9]*)$/.test(
      value,
    )
  ) {
    return invalidInput(
      `${field} must be an unsigned decimal integer string.`,
      field,
    );
  }

  return BigInt(value);
}

export function parseNotaryApprovalInit(
  value: unknown,
): NotaryApprovalInitInput {
  const body =
    parseObject(
      value,
      [
        'auctionId',
      ],
    );

  return Object.freeze({
    auctionId:
      parseAuctionId(
        body.auctionId,
      ),
  });
}

export function parseNotaryApproval(
  value: unknown,
): NotaryApprovalInput {
  const body =
    parseObject(
      value,
      [
        'auctionId',
        'signature',
        'nonce',
        'expiry',
      ],
    );

  return Object.freeze({
    auctionId:
      parseAuctionId(
        body.auctionId,
      ),

    signature:
      parseSignature(
        body.signature,
      ),

    nonce:
      parseUnsignedDecimal(
        body.nonce,
        'nonce',
      ),

    expiry:
      parseUnsignedDecimal(
        body.expiry,
        'expiry',
      ),
  });
}

export const NOTARY_APPROVAL_SIGNING_WINDOW_SECONDS =
  3_600n;

export function assertNotaryApprovalSigningWindow(
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
      'Notary approval signature has expired.',
    );
  }

  if (
    input.expiry >
      nowSeconds +
        NOTARY_APPROVAL_SIGNING_WINDOW_SECONDS
  ) {
    throw createDomainError(
      'INVALID_INPUT',
      'Notary approval expiry exceeds the 3600-second signing window.',
      {
        details: {
          field:
            'expiry',
        },
      },
    );
  }
}

export function deriveNotaryApprovalSigningExpiry(
  now: Date,
): bigint {
  if (
    !Number.isFinite(
      now.getTime(),
    )
  ) {
    throw createDomainError(
      'INVALID_INPUT',
      'Signing evaluation time is invalid.',
    );
  }

  return (
    BigInt(
      Math.floor(
        now.getTime() /
        1_000,
      ),
    ) +
    NOTARY_APPROVAL_SIGNING_WINDOW_SECONDS
  );
}
