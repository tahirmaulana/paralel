// @file packages/domain/src/errors.ts

/**
 * Canonical domain error model for PARALEL.
 *
 * File ini tidak bergantung pada Next.js, HTTP framework, database client,
 * React, RPC client, atau Cloudflare Workers.
 *
 * API layer bertanggung jawab memetakan DomainError.code ke HTTP status.
 */

export const DOMAIN_ERROR_CODES = [
  'INVALID_INPUT',
  'UNAUTHENTICATED',
  'SESSION_EXPIRED',
  'WRONG_NETWORK',
  'ROLE_FORBIDDEN',
  'RESOURCE_FORBIDDEN',
  'AUCTION_NOT_FOUND',
  'AUCTION_STATE_CHANGED',
  'ALREADY_PROCESSED',
  'NOTARY_ALREADY_ASSIGNED',
  'INVALID_SIGNATURE',
  'SIGNATURE_EXPIRED',
  'PARTNER_INACTIVE',
  'PARTNER_REGISTRY_DRIFT',
  'INSUFFICIENT_BALANCE',
  'RPC_UNAVAILABLE',
  'INTERNAL_SERVER_ERROR',
  'TRANSACTION_REVERTED',
  'PROJECTION_PENDING',
] as const;

export type DomainErrorCode =
  (typeof DOMAIN_ERROR_CODES)[number];

export type DomainErrorDetails =
  Readonly<Record<string, unknown>>;

export type DomainErrorOptions = {
  retryable?: boolean;
  correlationId?: string;
  details?: DomainErrorDetails;
  cause?: unknown;
};

export type SerializedDomainError = {
  code: DomainErrorCode;
  message: string;
  retryable: boolean;
  correlationId?: string;
  details?: DomainErrorDetails;
};

const DOMAIN_ERROR_CODE_SET =
  new Set<string>(DOMAIN_ERROR_CODES);

const DEFAULT_RETRYABLE_BY_CODE:
  Readonly<Record<DomainErrorCode, boolean>> = {
    INVALID_INPUT: false,
    UNAUTHENTICATED: false,
    SESSION_EXPIRED: false,
    WRONG_NETWORK: false,
    ROLE_FORBIDDEN: false,
    RESOURCE_FORBIDDEN: false,
    AUCTION_NOT_FOUND: false,
    AUCTION_STATE_CHANGED: false,
    ALREADY_PROCESSED: false,
    NOTARY_ALREADY_ASSIGNED: false,
    INVALID_SIGNATURE: false,
    SIGNATURE_EXPIRED: false,
    PARTNER_INACTIVE: false,
    PARTNER_REGISTRY_DRIFT: false,
    INSUFFICIENT_BALANCE: false,
    RPC_UNAVAILABLE: true,
    INTERNAL_SERVER_ERROR: false,
    TRANSACTION_REVERTED: false,
    PROJECTION_PENDING: true,
  };

const DEFAULT_MESSAGE_BY_CODE:
  Readonly<Record<DomainErrorCode, string>> = {
    INVALID_INPUT:
      'The provided input is invalid.',
    UNAUTHENTICATED:
      'Authentication is required.',
    SESSION_EXPIRED:
      'The wallet session has expired.',
    WRONG_NETWORK:
      'The connected wallet is on the wrong network.',
    ROLE_FORBIDDEN:
      'The authenticated wallet does not have the required role.',
    RESOURCE_FORBIDDEN:
      'The authenticated wallet cannot access this resource.',
    AUCTION_NOT_FOUND:
      'The requested auction was not found.',
    AUCTION_STATE_CHANGED:
      'The auction state has changed.',
    ALREADY_PROCESSED:
      'The requested action has already been processed.',
    NOTARY_ALREADY_ASSIGNED:
      'Another notary has already been assigned to this auction.',
    INVALID_SIGNATURE:
      'The submitted signature is invalid.',
    SIGNATURE_EXPIRED:
      'The submitted signature has expired.',
    PARTNER_INACTIVE:
      'The selected partner is inactive.',
    PARTNER_REGISTRY_DRIFT:
      'The partner registry is not synchronized.',
    INSUFFICIENT_BALANCE:
      'The wallet balance is insufficient.',
    RPC_UNAVAILABLE:
      'The blockchain RPC service is temporarily unavailable.',
    INTERNAL_SERVER_ERROR:
      'An unexpected server error occurred.',
    TRANSACTION_REVERTED:
      'The blockchain transaction reverted.',
    PROJECTION_PENDING:
      'The blockchain transaction is confirmed but its projection is pending.',
  };

function normalizeOptionalString(
  value: string | undefined,
): string | undefined {
  const normalized = value?.trim();

  return normalized || undefined;
}

function normalizeDetails(
  details: DomainErrorDetails | undefined,
): DomainErrorDetails | undefined {
  if (!details) {
    return undefined;
  }

  if (Object.keys(details).length === 0) {
    return undefined;
  }

  return Object.freeze({
    ...details,
  });
}

export function isDomainErrorCode(
  value: unknown,
): value is DomainErrorCode {
  return (
    typeof value === 'string' &&
    DOMAIN_ERROR_CODE_SET.has(value)
  );
}

export function defaultDomainErrorMessage(
  code: DomainErrorCode,
): string {
  return DEFAULT_MESSAGE_BY_CODE[code];
}

export function defaultDomainErrorRetryable(
  code: DomainErrorCode,
): boolean {
  return DEFAULT_RETRYABLE_BY_CODE[code];
}

export class DomainError extends Error {
  readonly code: DomainErrorCode;
  readonly retryable: boolean;
  readonly correlationId?: string;
  readonly details?: DomainErrorDetails;

  constructor(
    code: DomainErrorCode,
    message: string = defaultDomainErrorMessage(
      code,
    ),
    options: DomainErrorOptions = {},
  ) {
    const normalizedMessage =
      message.trim() ||
      defaultDomainErrorMessage(code);

    super(normalizedMessage, {
      cause: options.cause,
    });

    this.name = 'DomainError';
    this.code = code;
    this.retryable =
      options.retryable ??
      defaultDomainErrorRetryable(code);
    this.correlationId =
      normalizeOptionalString(
        options.correlationId,
      );
    this.details =
      normalizeDetails(options.details);

    Object.setPrototypeOf(
      this,
      new.target.prototype,
    );
  }

  withCorrelationId(
    correlationId: string,
  ): DomainError {
    return new DomainError(
      this.code,
      this.message,
      {
        retryable: this.retryable,
        correlationId,
        details: this.details,
        cause: this.cause,
      },
    );
  }

  toJSON(): SerializedDomainError {
    return {
      code: this.code,
      message: this.message,
      retryable: this.retryable,
      ...(this.correlationId
        ? {
            correlationId:
              this.correlationId,
          }
        : {}),
      ...(this.details
        ? {
            details: this.details,
          }
        : {}),
    };
  }
}

export function isDomainError(
  error: unknown,
): error is DomainError {
  return error instanceof DomainError;
}

export function createDomainError(
  code: DomainErrorCode,
  message?: string,
  options: DomainErrorOptions = {},
): DomainError {
  return new DomainError(
    code,
    message ??
      defaultDomainErrorMessage(code),
    options,
  );
}

/**
 * Mengubah unknown error menjadi DomainError tanpa membocorkan raw internal
 * error message kepada caller.
 *
 * Gunakan fallback code yang sesuai dengan boundary pemanggil.
 */
export function normalizeDomainError(
  error: unknown,
  fallbackCode: DomainErrorCode,
  options: Omit<
    DomainErrorOptions,
    'cause'
  > = {},
): DomainError {
  if (isDomainError(error)) {
    if (
      options.correlationId &&
      !error.correlationId
    ) {
      return error.withCorrelationId(
        options.correlationId,
      );
    }

    return error;
  }

  return new DomainError(
    fallbackCode,
    defaultDomainErrorMessage(
      fallbackCode,
    ),
    {
      ...options,
      cause: error,
    },
  );
}

/**
 * Membentuk response payload canonical.
 *
 * Wrapper `error` ditempatkan di sini agar seluruh API menghasilkan bentuk
 * JSON yang konsisten tanpa membuat domain package bergantung pada HTTP.
 */
export function serializeDomainError(
  error: DomainError,
): {
  error: SerializedDomainError;
} {
  return {
    error: error.toJSON(),
  };
}

/**
 * Assertion helper untuk domain precondition.
 */
export function assertDomain(
  condition: unknown,
  code: DomainErrorCode,
  message?: string,
  options: DomainErrorOptions = {},
): asserts condition {
  if (!condition) {
    throw new DomainError(
      code,
      message ??
        defaultDomainErrorMessage(code),
      options,
    );
  }
}
