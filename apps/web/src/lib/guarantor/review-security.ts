// @file apps/web/src/lib/guarantor/review-security.ts
//
// Pure request validation for Guarantor approval and rejection.
// Actor wallet is always supplied by the authenticated session.
import {
  createDomainError,
} from '@paralel/domain';

import {
  isHex,
  type Hex,
} from 'viem';

type GuarantorSignedReview =
  Readonly<{
    auctionId: string;
    signature: Hex;
    nonce: bigint;
    expiry: bigint;
  }>;

export type GuarantorApprovalInput =
  GuarantorSignedReview;

export type GuarantorRejectionInput =
  GuarantorSignedReview &
  Readonly<{
    reason: string;
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

function parseSignedReview(
  body:
    Record<string, unknown>,
): GuarantorSignedReview {
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

export function parseGuarantorApproval(
  value: unknown,
): GuarantorApprovalInput {
  return parseSignedReview(
    parseObject(
      value,
      [
        'auctionId',
        'signature',
        'nonce',
        'expiry',
      ],
    ),
  );
}

export function parseGuarantorRejection(
  value: unknown,
): GuarantorRejectionInput {
  const body =
    parseObject(
      value,
      [
        'auctionId',
        'signature',
        'nonce',
        'expiry',
        'reason',
      ],
    );

  const signed =
    parseSignedReview(
      body,
    );

  if (
    typeof body.reason !==
      'string'
  ) {
    return invalidInput(
      'reason must be a string.',
      'reason',
    );
  }

  const reason =
    body.reason.trim();

  if (
    reason.length < 5 ||
    reason.length > 500
  ) {
    return invalidInput(
      'reason must contain between 5 and 500 characters.',
      'reason',
    );
  }

  return Object.freeze({
    ...signed,
    reason,
  });
}

export const GUARANTOR_REVIEW_SIGNING_WINDOW_SECONDS =
  300n;

const GUARANTOR_REVIEW_EXPIRY_BUFFER_SECONDS =
  60n;

export function deriveGuarantorReviewSigningExpiry(
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

  const nowSeconds =
    BigInt(
      Math.floor(
        now.getTime() /
        1_000,
      ),
    );

  return (
    nowSeconds +
    GUARANTOR_REVIEW_SIGNING_WINDOW_SECONDS -
    GUARANTOR_REVIEW_EXPIRY_BUFFER_SECONDS
  );
}

export function assertGuarantorReviewSigningWindow(
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
      'Guarantor review signature has expired.',
    );
  }

  if (
    input.expiry >
      nowSeconds +
        GUARANTOR_REVIEW_SIGNING_WINDOW_SECONDS
  ) {
    throw createDomainError(
      'INVALID_INPUT',
      'Guarantor review expiry exceeds the 300-second signing window.',
      {
        details: {
          field:
            'expiry',
        },
      },
    );
  }
}

export type GuarantorCollectedInput =
  GuarantorSignedReview;

export type GuarantorWithdrawnInput =
  GuarantorSignedReview;

export function parseGuarantorCollected(
  value: unknown,
): GuarantorCollectedInput {
  return parseSignedReview(
    parseObject(
      value,
      [
        'auctionId',
        'signature',
        'nonce',
        'expiry',
      ],
    ),
  );
}

export function parseGuarantorWithdrawn(
  value: unknown,
): GuarantorWithdrawnInput {
  return parseSignedReview(
    parseObject(
      value,
      [
        'auctionId',
        'signature',
        'nonce',
        'expiry',
      ],
    ),
  );
}
