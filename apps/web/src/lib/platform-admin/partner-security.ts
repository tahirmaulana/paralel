// @file apps/web/src/lib/platform-admin/partner-security.ts
//
// Pure validation for Platform Admin partner registration.
// Platform Admin authority comes only from the authenticated session.
import {
  createDomainError,
} from '@paralel/domain';

import {
  isAddress,
  type   Address,
} from 'viem';

export function parsePartnerPhotoKey(
  value: string,
): string {
  const normalized =
    value.trim();

  if (
    !/^partners-photos\/[0-9a-f-]{36}\.(jpg|jpeg|png|webp)$/i.test(
      normalized,
    )
  ) {
    return invalidInput(
      'photo must be a canonical partner object key.',
      'photo',
    );
  }

  return normalized;
}

export type PartnerCategory =
  | 'ALL'
  | 'OTOMOTIF'
  | 'PROPERTI'
  | 'ELEKTRONIK'
  | 'AKSESORIS_HOBI'
  | 'PERHIASAN';

type PartnerBase =
  Readonly<{
    wallet:
      Address;
    name:
      string;
    documentNumber:
      string | null;
    address:
      string | null;
    photo:
      string | null;
  }>;

export type PartnerRegistrationInput =
  | (
      PartnerBase &
      Readonly<{
        type:
          'NOTARY';
        category:
          null;
        city:
          null;
      }>
    )
  | (
      PartnerBase &
      Readonly<{
        type:
          'GUARANTOR';
        category:
          PartnerCategory;
        city:
          string;
      }>
    );

const categories =
  new Set<
    PartnerCategory
  >([
    'ALL',
    'OTOMOTIF',
    'PROPERTI',
    'ELEKTRONIK',
    'AKSESORIS_HOBI',
    'PERHIASAN',
  ]);

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

function parseOptionalText(
  value: unknown,
  field: string,
  maximumLength: number,
): string | null {
  if (
    value === undefined ||
    value === null
  ) {
    return null;
  }

  if (
    typeof value !==
      'string'
  ) {
    return invalidInput(
      `${field} must be a string.`,
      field,
    );
  }

  const normalized =
    value.trim();

  if (
    normalized.length ===
      0
  ) {
    return null;
  }

  if (
    normalized.length >
      maximumLength
  ) {
    return invalidInput(
      `${field} must not exceed ${maximumLength} characters.`,
      field,
    );
  }

  return normalized;
}

function parseRequiredText(
  value: unknown,
  field: string,
  maximumLength: number,
): string {
  const parsed =
    parseOptionalText(
      value,
      field,
      maximumLength,
    );

  if (
    parsed === null
  ) {
    return invalidInput(
      `${field} is required.`,
      field,
    );
  }

  return parsed;
}

export function parsePartnerRegistration(
  value: unknown,
): PartnerRegistrationInput {
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
      'wallet',
      'type',
      'name',
      'category',
      'city',
      'documentNumber',
      'address',
      'photo',
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
    typeof body.wallet !==
      'string' ||
    !isAddress(
      body.wallet,
    )
  ) {
    return invalidInput(
      'wallet must be a valid EVM address.',
      'wallet',
    );
  }

  if (
    body.type !==
      'NOTARY' &&
    body.type !==
      'GUARANTOR'
  ) {
    return invalidInput(
      'type must be NOTARY or GUARANTOR.',
      'type',
    );
  }

  const base =
    Object.freeze({
      wallet:
        body.wallet
          .toLowerCase() as Address,
      name:
        parseRequiredText(
          body.name,
          'name',
          150,
        ),
      documentNumber:
        parseOptionalText(
          body.documentNumber,
          'documentNumber',
          100,
        ),
      address:
        parseOptionalText(
          body.address,
          'address',
          500,
        ),
      photo:
        body.photo ===
            undefined ||
          body.photo ===
            null
          ? null
          : parsePartnerPhotoKey(
              parseOptionalText(
                body.photo,
                'photo',
                512,
              )!,
            ),
    });

  if (
    body.type ===
      'NOTARY'
  ) {
    if (
      body.category !==
        undefined &&
      body.category !==
        null
    ) {
      return invalidInput(
        'category must be null for NOTARY.',
        'category',
      );
    }

    if (
      body.city !==
        undefined &&
      body.city !==
        null
    ) {
      return invalidInput(
        'city must be null for NOTARY.',
        'city',
      );
    }

    return Object.freeze({
      ...base,
      type:
        'NOTARY',
      category:
        null,
      city:
        null,
    });
  }

  if (
    typeof body.category !==
      'string' ||
    !categories.has(
      body.category as
        PartnerCategory,
    )
  ) {
    return invalidInput(
      'category is required for GUARANTOR and must use a canonical category.',
      'category',
    );
  }

  return Object.freeze({
    ...base,
    type:
      'GUARANTOR',
    category:
      body.category as
        PartnerCategory,
    city:
      parseRequiredText(
        body.city,
        'city',
        100,
      ),
  });
}
