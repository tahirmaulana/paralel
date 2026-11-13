// @file apps/web/src/lib/user-admin/review-security.ts
//
// Pure validation for User Admin KYC review.
// Admin authority always comes from the authenticated session.
import {
  createDomainError,
} from '@paralel/domain';

export type KycReviewStatus =
  | 'VERIFIED'
  | 'UNVERIFIED';

export type KycReviewInput =
  Readonly<{
    userId: string;
    status:
      KycReviewStatus;
    comment:
      string | null;
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

export function parseKycReview(
  value: unknown,
): KycReviewInput {
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
      'userId',
      'status',
      'comment',
    ]);

  const unknownFields =
    Object.keys(body)
      .filter(
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
    typeof body.userId !==
      'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      .test(body.userId)
  ) {
    return invalidInput(
      'userId must be a valid UUID.',
      'userId',
    );
  }

  if (
    body.status !==
      'VERIFIED' &&
    body.status !==
      'UNVERIFIED'
  ) {
    return invalidInput(
      'status must be VERIFIED or UNVERIFIED.',
      'status',
    );
  }

  let comment:
    string | null =
      null;

  if (
    body.comment !==
      undefined &&
    body.comment !==
      null
  ) {
    if (
      typeof body.comment !==
        'string'
    ) {
      return invalidInput(
        'comment must be a string.',
        'comment',
      );
    }

    const normalized =
      body.comment.trim();

    if (
      normalized.length >
        500
    ) {
      return invalidInput(
        'comment must not exceed 500 characters.',
        'comment',
      );
    }

    comment =
      normalized.length ===
        0
        ? null
        : normalized;
  }

  if (
    body.status ===
      'UNVERIFIED' &&
    comment === null
  ) {
    return invalidInput(
      'comment is required when KYC remains UNVERIFIED.',
      'comment',
    );
  }

  return Object.freeze({
    userId:
      body.userId
        .toLowerCase(),
    status:
      body.status,
    comment:
      body.status ===
        'VERIFIED'
        ? null
        : comment,
  });
}
