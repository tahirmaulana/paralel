// @file apps/web/src/lib/user/data-response.ts
//
// Pure JSON-safe serialization for GET /api/user/data.
// BigInt values become unsigned decimal strings.
// Date values become ISO-8601 strings.
//
// This response serializer is intentionally separate from mutation and
// idempotency serialization.
import {
  createDomainError,
} from '@paralel/domain';

type ResponseJsonPrimitive =
  | string
  | number
  | boolean
  | null;

export interface ResponseJsonArray
  extends ReadonlyArray<
    ResponseJsonValue
  > {}

export interface ResponseJsonObject {
  readonly [key: string]:
    ResponseJsonValue;
}

export type ResponseJsonValue =
  | ResponseJsonPrimitive
  | ResponseJsonArray
  | ResponseJsonObject;

export type UserDataInput =
  Readonly<{
    kycStatus:
      'NONE' |
      'UNVERIFIED' |
      'VERIFIED';
    adminComment:
      string | null;
    verifiedAt:
      Date | null;
    liveAuctions:
      readonly unknown[];
    joinedAuctions:
      readonly unknown[];
    createdAuctions:
      readonly unknown[];
  }>;

function normalizeResponseValue(
  value: unknown,
  path: string,
  activeObjects:
    WeakSet<object>,
): ResponseJsonValue {
  if (
    value === null ||
    typeof value ===
      'string' ||
    typeof value ===
      'boolean'
  ) {
    return value;
  }

  if (
    typeof value ===
      'number'
  ) {
    if (
      !Number.isFinite(
        value,
      )
    ) {
      throw createDomainError(
        'INVALID_INPUT',
        `Non-finite response number at ${path}.`,
      );
    }

    return value;
  }

  if (
    typeof value ===
      'bigint'
  ) {
    return value.toString();
  }

  if (
    value instanceof Date
  ) {
    if (
      !Number.isFinite(
        value.getTime(),
      )
    ) {
      throw createDomainError(
        'INVALID_INPUT',
        `Invalid response Date at ${path}.`,
      );
    }

    return value.toISOString();
  }

  if (
    Array.isArray(value)
  ) {
    if (
      activeObjects.has(
        value,
      )
    ) {
      throw createDomainError(
        'INVALID_INPUT',
        `Circular response value detected at ${path}.`,
      );
    }

    activeObjects.add(
      value,
    );

    const normalized =
      value.map(
        (
          item,
          index,
        ) =>
          normalizeResponseValue(
            item,
            `${path}[${index}]`,
            activeObjects,
          ),
      );

    activeObjects.delete(
      value,
    );

    return normalized;
  }

  if (
    typeof value ===
      'object'
  ) {
    if (
      activeObjects.has(
        value,
      )
    ) {
      throw createDomainError(
        'INVALID_INPUT',
        `Circular response value detected at ${path}.`,
      );
    }

    activeObjects.add(
      value,
    );

    const normalized:
      Record<
        string,
        ResponseJsonValue
      > = {};

    for (
      const [
        key,
        child,
      ]
      of Object.entries(
        value,
      )
    ) {
      normalized[key] =
        normalizeResponseValue(
          child,
          `${path}.${key}`,
          activeObjects,
        );
    }

    activeObjects.delete(
      value,
    );

    return normalized;
  }

  throw createDomainError(
    'INVALID_INPUT',
    `Unsupported response value at ${path}.`,
  );
}

export function serializeUserData(
  input:
    UserDataInput,
): ResponseJsonValue {
  return normalizeResponseValue(
    {
      kycStatus:
        input.kycStatus,

      adminComment:
        input.adminComment,

      verifiedAt:
        input.verifiedAt,

      liveAuctions:
        input.liveAuctions,

      joinedAuctions:
        input.joinedAuctions,

      createdAuctions:
        input.createdAuctions,
    },
    '$',
    new WeakSet<object>(),
  );
}
