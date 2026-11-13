// @file apps/web/src/lib/auction/confirm-init-security.ts
//
// Pure security decisions for Consignor confirmation initialization.
// No database, RPC, session, environment, or storage access.
import {
  createDomainError,
} from '@paralel/domain';

import {
  normalizeSubmitAuctionCode,
} from './submit-security';

export const CONSIGNOR_SIGNING_WINDOW_SECONDS =
  300n;

export function normalizeConfirmInitAuctionCode(
  value: unknown,
): string {
  return normalizeSubmitAuctionCode(
    value,
  );
}

export function parseConfirmInitInput(
  value: unknown,
): void {
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

  const fields =
    Object.keys(value);

  if (fields.length !== 0) {
    throw createDomainError(
      'INVALID_INPUT',
      'Request body must be empty.',
      {
        details: {
          fields,
        },
      },
    );
  }
}

export function deriveConsignorSigningExpiry(
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
    CONSIGNOR_SIGNING_WINDOW_SECONDS
  );
}

export function hasRequiredConfirmApprovals(
  attestationTypes:
    readonly string[],
): boolean {
  const types =
    new Set(
      attestationTypes,
    );

  return (
    types.has(
      'GUARANTOR_APPROVED',
    ) &&
    types.has(
      'NOTARY_APPROVED',
    )
  );
}
