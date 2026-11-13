// @file apps/web/src/lib/platform-admin/user-admin-security.ts
//
// Pure validation for Platform Admin management of User Admin wallets.
// Platform Admin authority always comes from the authenticated session.
import {
  createDomainError,
} from '@paralel/domain';

import {
  isAddress,
  type Address,
} from 'viem';

export type AddUserAdminInput =
  Readonly<{
    wallet:
      Address;
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
    new Set(
      allowedFields,
    );

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

  return body;
}

function parseWallet(
  value: unknown,
): Address {
  if (
    typeof value !==
      'string' ||
    !isAddress(value)
  ) {
    return invalidInput(
      'wallet must be a valid EVM address.',
      'wallet',
    );
  }

  return value
    .toLowerCase() as Address;
}

export function parseAddUserAdmin(
  value: unknown,
): AddUserAdminInput {
  const body =
    parseObject(
      value,
      [
        'wallet',
      ],
    );

  return Object.freeze({
    wallet:
      parseWallet(
        body.wallet,
      ),
  });
}

export function parseUserAdminWalletParameter(
  value: string,
): Address {
  return parseWallet(
    value,
  );
}
