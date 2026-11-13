import {
  NextResponse,
} from 'next/server';

import {
  normalizeDomainError,
  serializeDomainError,
  type DomainErrorCode,
} from '@paralel/domain';

const HTTP_STATUS_BY_CODE:
  Readonly<
    Record<DomainErrorCode, number>
  > = {
    INVALID_INPUT: 400,
    UNAUTHENTICATED: 401,
    SESSION_EXPIRED: 401,
    WRONG_NETWORK: 409,
    ROLE_FORBIDDEN: 403,
    RESOURCE_FORBIDDEN: 403,
    AUCTION_NOT_FOUND: 404,
    AUCTION_STATE_CHANGED: 409,
    ALREADY_PROCESSED: 409,
    NOTARY_ALREADY_ASSIGNED: 409,
    INVALID_SIGNATURE: 401,
    SIGNATURE_EXPIRED: 401,
    PARTNER_INACTIVE: 403,
    PARTNER_REGISTRY_DRIFT: 409,
    INSUFFICIENT_BALANCE: 422,
    RPC_UNAVAILABLE: 503,
    INTERNAL_SERVER_ERROR: 500,
    TRANSACTION_REVERTED: 422,
    PROJECTION_PENDING: 202,
  };

export type CanonicalErrorBody =
  ReturnType<
    typeof serializeDomainError
  >;

export type CanonicalErrorResult =
  Readonly<{
    status: number;
    body: CanonicalErrorBody;
  }>;

export function canonicalErrorResult(
  error: unknown,
  correlationId: string,
): CanonicalErrorResult {
  const normalized =
    normalizeDomainError(
      error,
      'INTERNAL_SERVER_ERROR',
      {
        correlationId,
      },
    );

  return Object.freeze({
    status:
      HTTP_STATUS_BY_CODE[
        normalized.code
      ],
    body:
      serializeDomainError(
        normalized,
      ),
  });
}

export function errorResponse(
  error: unknown,
  correlationId: string,
): NextResponse<CanonicalErrorBody> {
  const result =
    canonicalErrorResult(
      error,
      correlationId,
    );

  return NextResponse.json(
    result.body,
    {
      status:
        result.status,
      headers: {
        'x-correlation-id':
          correlationId,
        'cache-control':
          'no-store',
      },
    },
  );
}
