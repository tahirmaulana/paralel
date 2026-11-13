import {
  DomainError,
} from "@paralel/domain";

import {
  json,
} from "../../http";

export const readJsonObject = async (
  request: Request,
): Promise<Record<string, unknown>> => {
  let value: unknown;

  try {
    value = await request.json();
  } catch {
    throw new DomainError(
      "INVALID_INPUT",
      "Request body must contain valid JSON.",
    );
  }

  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw new DomainError(
      "INVALID_INPUT",
      "Request body must be a JSON object.",
    );
  }

  return value as Record<string, unknown>;
};

const statusForDomainCode = (
  code: string,
): number => {
  switch (code) {
    case "INVALID_INPUT":
    case "INVALID_SIGNATURE":
      return 400;

    case "UNAUTHENTICATED":
    case "SESSION_EXPIRED":
      return 401;

    case "FORBIDDEN":
    case "ROLE_FORBIDDEN":
    case "RESOURCE_FORBIDDEN":
      return 403;

    case "RPC_UNAVAILABLE":
      return 503;

    case "WRONG_NETWORK":
    case "ALREADY_PROCESSED":
      return 409;

    case "SIGNATURE_EXPIRED":
      return 410;

    default:
      return 400;
  }
};

export const authErrorResponse = (
  error: unknown,
): Response | null => {
  if (!(error instanceof DomainError)) {
    return null;
  }

  return json(
    {
      error: {
        code: error.code,
        message: error.message,
        details:
          error.details ?? null,
      },
    },
    {
      status:
        statusForDomainCode(
          error.code,
        ),
    },
  );
};
