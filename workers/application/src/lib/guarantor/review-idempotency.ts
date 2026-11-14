import {
  DomainError,
} from "@paralel/domain";

import type { Env } from "../../env";
import {
  createDatabaseClient,
} from "../database/client";

const IDEMPOTENCY_TTL_MS =
  24 * 60 * 60 * 1_000;

export type GuarantorReviewRoute =
  | "POST:/api/guarantor/approve"
  | "POST:/api/guarantor/reject";

interface ExistingIdempotencyRow {
  request_hash: string;
  status:
    | "PROCESSING"
    | "COMPLETED"
    | "FAILED";
  response_status: number | null;
  response_body: unknown;
  expires_at: string | Date;
}

export interface ReviewIdempotencyInput {
  wallet: string;
  routeKey: GuarantorReviewRoute;
  idempotencyKey: string;
  requestHash: string;
  now: Date;
}

export interface ReplayedReviewResponse {
  status: number;
  body: unknown;
  replayed: true;
}

export const normalizeReviewIdempotencyKey = (
  value: string | null,
): string => {
  if (!value) {
    throw new DomainError(
      "INVALID_INPUT",
      "Idempotency-Key header is required.",
      {
        details: {
          field:
            "Idempotency-Key",
        },
      },
    );
  }

  const normalized =
    value.trim();

  if (
    normalized.length < 8 ||
    normalized.length > 200
  ) {
    throw new DomainError(
      "INVALID_INPUT",
      "Idempotency-Key must contain between 8 and 200 characters.",
      {
        details: {
          field:
            "Idempotency-Key",
        },
      },
    );
  }

  return normalized;
};

export const reviewIdempotencyExpiresAt = (
  now: Date,
): Date =>
  new Date(
    now.getTime() +
      IDEMPOTENCY_TTL_MS,
  );

export const readExistingReviewIdempotency =
  async (
    env: Env,
    input: ReviewIdempotencyInput,
  ): Promise<
    ExistingIdempotencyRow | null
  > => {
    const sql =
      await createDatabaseClient(env);

    const rows = await sql`
      SELECT
        request_hash,
        status,
        response_status,
        response_body,
        expires_at
      FROM api_idempotency
      WHERE actor_wallet =
          ${input.wallet.toLowerCase()}
        AND http_method = 'POST'
        AND route_key =
          ${input.routeKey}
        AND idempotency_key =
          ${input.idempotencyKey}
      LIMIT 1
    `;

    return (
      rows[0] as
        | ExistingIdempotencyRow
        | undefined
    ) ?? null;
  };

export const resolveExistingReviewIdempotency =
  (
    existing:
      ExistingIdempotencyRow,
    input: Readonly<{
      requestHash: string;
      now: Date;
    }>,
  ): ReplayedReviewResponse => {
    if (
      existing.request_hash !==
        input.requestHash
    ) {
      throw new DomainError(
        "INVALID_INPUT",
        "Idempotency-Key was already used with a different request body.",
        {
          details: {
            field:
              "Idempotency-Key",
          },
        },
      );
    }

    if (
      new Date(
        existing.expires_at,
      ).getTime() <=
        input.now.getTime()
    ) {
      throw new DomainError(
        "INVALID_INPUT",
        "Idempotency-Key has expired and cannot be reused.",
        {
          details: {
            field:
              "Idempotency-Key",
          },
        },
      );
    }

    if (
      existing.status ===
        "COMPLETED" &&
      existing.response_status !==
        null &&
      existing.response_body !==
        null
    ) {
      return {
        status:
          existing.response_status,
        body:
          existing.response_body,
        replayed: true,
      };
    }

    throw new DomainError(
      "ALREADY_PROCESSED",
      "An equivalent request is already processing.",
      {
        retryable: true,
      },
    );
  };
