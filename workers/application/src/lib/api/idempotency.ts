import {
  DomainError,
} from "@paralel/domain";

export type JsonValue =
  | null
  | string
  | number
  | boolean
  | readonly JsonValue[]
  | {
      readonly [
        key: string
      ]: JsonValue;
    };

const normalizeJson = (
  value: unknown,
  path = "$",
  activeObjects =
    new WeakSet<object>(),
): JsonValue => {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new DomainError(
        "INVALID_INPUT",
        `Non-finite number at ${path} cannot be serialized as JSON.`,
      );
    }

    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (
    typeof value === "bigint" ||
    typeof value === "undefined" ||
    typeof value === "function" ||
    typeof value === "symbol"
  ) {
    throw new DomainError(
      "INVALID_INPUT",
      `Unsupported JSON value at ${path}.`,
    );
  }

  if (Array.isArray(value)) {
    if (activeObjects.has(value)) {
      throw new DomainError(
        "INVALID_INPUT",
        `Circular JSON value detected at ${path}.`,
      );
    }

    activeObjects.add(value);

    const normalized =
      value.map(
        (item, index) =>
          normalizeJson(
            item,
            `${path}[${index}]`,
            activeObjects,
          ),
      );

    activeObjects.delete(value);

    return normalized;
  }

  if (
    typeof value === "object" &&
    value !== null
  ) {
    if (activeObjects.has(value)) {
      throw new DomainError(
        "INVALID_INPUT",
        `Circular JSON value detected at ${path}.`,
      );
    }

    activeObjects.add(value);

    const normalized:
      Record<string, JsonValue> =
        {};

    for (
      const [
        key,
        current,
      ] of Object.entries(value)
    ) {
      normalized[key] =
        normalizeJson(
          current,
          `${path}.${key}`,
          activeObjects,
        );
    }

    activeObjects.delete(value);

    return normalized;
  }

  throw new DomainError(
    "INVALID_INPUT",
    `Unsupported JSON value at ${path}.`,
  );
};

const toHex = (
  value: ArrayBuffer,
): string =>
  Array.from(
    new Uint8Array(value),
  )
    .map(
      (byte) =>
        byte
          .toString(16)
          .padStart(2, "0"),
    )
    .join("");

export const hashIdempotencyRequest =
  async (
    value: unknown,
  ): Promise<string> => {
    const serialized =
      JSON.stringify(
        normalizeJson(value),
      );

    const digest =
      await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(
          serialized,
        ),
      );

    return toHex(digest);
  };
