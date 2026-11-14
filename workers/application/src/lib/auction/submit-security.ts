// @file apps/web/src/lib/auction/submit-security.ts
//
// Pure security and lifecycle decisions for CREATED -> PENDING.
// No database, RPC, session, environment, or object-storage access.
import {
  createDomainError,
} from '@paralel/domain';

const PENDING_WINDOW_MS =
  48 * 60 * 60 * 1_000;

export type SubmitFileManifest =
  Readonly<{
    kind: string;
    position: number | null;
  }>;

export function normalizeSubmitAuctionCode(
  value: unknown,
): string {
  if (
    typeof value !==
      'string'
  ) {
    throw createDomainError(
      'INVALID_INPUT',
      'Auction code is required.',
      {
        details: {
          field:
            'code',
        },
      },
    );
  }

  const normalized =
    value.trim();

  if (
    normalized.length === 0 ||
    normalized.length > 64 ||
    !/^[A-Z0-9-]+$/.test(
      normalized,
    )
  ) {
    throw createDomainError(
      'INVALID_INPUT',
      'Auction code is invalid.',
      {
        details: {
          field:
            'code',
        },
      },
    );
  }

  return normalized;
}

export function assertEmptySubmitBody(
  value: unknown,
): asserts value is
  Readonly<Record<string, never>> {
  if (
    typeof value !==
      'object' ||
    value === null ||
    Array.isArray(value)
  ) {
    throw createDomainError(
      'INVALID_INPUT',
      'Request body must be an empty object.',
    );
  }

  const keys =
    Object.keys(value);

  if (
    keys.length !== 0
  ) {
    throw createDomainError(
      'INVALID_INPUT',
      'Request body contains unknown fields.',
      {
        details: {
          fields:
            keys,
        },
      },
    );
  }
}

export function isSubmitManifestFrozen(
  input:
    Readonly<{
      assetSpecHashes:
        readonly boolean[];
      files:
        readonly SubmitFileManifest[];
      currentRound:
        number;
      roundNumbers:
        readonly number[];
    }>,
): boolean {
  if (
    input.assetSpecHashes
      .length !== 1 ||
    input.assetSpecHashes[0] !==
      true
  ) {
    return false;
  }

  if (
    input.roundNumbers
      .length !== 1 ||
    input.roundNumbers[0] !==
      input.currentRound
  ) {
    return false;
  }

  if (
    input.files.length !== 6
  ) {
    return false;
  }

  const photoPositions =
    input.files
      .filter(
        (file) =>
          file.kind ===
            'PHOTO',
      )
      .map(
        (file) =>
          file.position,
      );

  const documentCount =
    input.files.filter(
      (file) =>
        file.kind ===
          'DOCUMENT_SCAN' &&
        file.position === null,
    ).length;

  if (
    photoPositions.length !== 5 ||
    documentCount !== 1
  ) {
    return false;
  }

  const uniquePositions =
    new Set(
      photoPositions,
    );

  return (
    uniquePositions.size === 5 &&
    [1, 2, 3, 4, 5]
      .every(
        (position) =>
          uniquePositions.has(
            position,
          ),
      )
  );
}

export function derivePendingWindow(
  value: Date,
): Readonly<{
  pendingAt: Date;
  pendingDeadline: Date;
}> {
  if (
    !Number.isFinite(
      value.getTime(),
    )
  ) {
    throw createDomainError(
      'INVALID_INPUT',
      'Pending evaluation time is invalid.',
    );
  }

  const pendingAt =
    new Date(value);

  const pendingDeadline =
    new Date(
      pendingAt.getTime() +
      PENDING_WINDOW_MS,
    );

  return Object.freeze({
    pendingAt,
    pendingDeadline,
  });
}
