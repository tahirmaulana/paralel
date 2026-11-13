import { randomUUID } from 'node:crypto';

import {
  createDomainError,
} from '@paralel/domain';

const CORRELATION_ID_HEADER =
  'x-correlation-id' as const;

const IDEMPOTENCY_KEY_HEADER =
  'idempotency-key' as const;

const SAFE_IDENTIFIER_PATTERN =
  /^[A-Za-z0-9._:-]+$/;

const MAX_CORRELATION_ID_LENGTH = 128;
const MIN_IDEMPOTENCY_KEY_LENGTH = 16;
const MAX_IDEMPOTENCY_KEY_LENGTH = 128;

export type ApiRequestContext = Readonly<{
  correlationId: string;
  method: string;
  pathname: string;
  receivedAt: Date;
}>;

function normalizeOptionalHeader(
  value: string | null,
): string | null {
  if (value === null) {
    return null;
  }

  const normalized = value.trim();

  return normalized.length > 0
    ? normalized
    : null;
}

function isSafeIdentifier(
  value: string,
  maximumLength: number,
): boolean {
  return (
    value.length <= maximumLength &&
    SAFE_IDENTIFIER_PATTERN.test(value)
  );
}

export function resolveCorrelationId(
  request: Request,
): string {
  const supplied =
    normalizeOptionalHeader(
      request.headers.get(
        CORRELATION_ID_HEADER,
      ),
    );

  if (
    supplied &&
    isSafeIdentifier(
      supplied,
      MAX_CORRELATION_ID_LENGTH,
    )
  ) {
    return supplied;
  }

  return randomUUID();
}

export function createApiRequestContext(
  request: Request,
): ApiRequestContext {
  const url = new URL(request.url);

  return {
    correlationId:
      resolveCorrelationId(request),
    method:
      request.method.toUpperCase(),
    pathname:
      url.pathname,
    receivedAt:
      new Date(),
  };
}

export function requireIdempotencyKey(
  request: Request,
  correlationId: string,
): string {
  const key =
    normalizeOptionalHeader(
      request.headers.get(
        IDEMPOTENCY_KEY_HEADER,
      ),
    );

  if (
    key === null ||
    key.length <
      MIN_IDEMPOTENCY_KEY_LENGTH ||
    !isSafeIdentifier(
      key,
      MAX_IDEMPOTENCY_KEY_LENGTH,
    )
  ) {
    throw createDomainError(
      'INVALID_INPUT',
      'A valid Idempotency-Key header is required.',
      {
        correlationId,
        details: {
          header:
            IDEMPOTENCY_KEY_HEADER,
          minimumLength:
            MIN_IDEMPOTENCY_KEY_LENGTH,
          maximumLength:
            MAX_IDEMPOTENCY_KEY_LENGTH,
        },
      },
    );
  }

  return key;
}
