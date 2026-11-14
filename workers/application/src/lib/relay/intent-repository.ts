import {
  DomainError,
} from "@paralel/domain";
import type {
  Hex,
} from "viem";

import type { Env } from "../../env";
import {
  createDatabaseClient,
} from "../database/client";

export type GuarantorRelayOperation =
  | "MARK_COLLECTED"
  | "MARK_WITHDRAWN";

export type RelayIntentStatus =
  | "PREPARED"
  | "SUBMITTED"
  | "CONFIRMED"
  | "FAILED";

export interface PreparedGuarantorRelayPayload {
  operation:
    GuarantorRelayOperation;
  auctionId: string;
  auctionCode: string;
  auctionKey: Hex;
  roundNo: number;
  nonce: string;
  expiry: string;
  signature: Hex;
  derivedTxHash: Hex;
  serializedTransaction: Hex;
}

interface RelayIntentRow {
  id: string;
  operation:
    GuarantorRelayOperation;
  resource_type: "AUCTION";
  resource_id: string;
  route_key: string;
  idempotency_key: string;
  request_hash: string;
  payload:
    PreparedGuarantorRelayPayload;
  status:
    RelayIntentStatus;
  tx_hash: string | null;
  attempt_count: number;
  last_error_code: string | null;
  last_error_message: string | null;
  prepared_at: string | Date;
  submitted_at: string | Date | null;
  confirmed_at: string | Date | null;
  failed_at: string | Date | null;
  created_at: string | Date;
  updated_at: string | Date;
}

export interface RelayIntentRecord {
  id: string;
  operation:
    GuarantorRelayOperation;
  resourceId: string;
  routeKey: string;
  idempotencyKey: string;
  requestHash: string;
  payload:
    PreparedGuarantorRelayPayload;
  status:
    RelayIntentStatus;
  txHash: Hex | null;
  attemptCount: number;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
  preparedAt: Date;
  submittedAt: Date | null;
  confirmedAt: Date | null;
  failedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const toDate = (
  value: string | Date,
): Date =>
  new Date(value);

const toOptionalDate = (
  value:
    string | Date | null,
): Date | null =>
  value === null
    ? null
    : new Date(value);

const toRecord = (
  row: RelayIntentRow,
): RelayIntentRecord =>
  Object.freeze({
    id:
      row.id,
    operation:
      row.operation,
    resourceId:
      row.resource_id,
    routeKey:
      row.route_key,
    idempotencyKey:
      row.idempotency_key,
    requestHash:
      row.request_hash,
    payload:
      Object.freeze(
        row.payload,
      ),
    status:
      row.status,
    txHash:
      row.tx_hash as
        Hex | null,
    attemptCount:
      row.attempt_count,
    lastErrorCode:
      row.last_error_code,
    lastErrorMessage:
      row.last_error_message,
    preparedAt:
      toDate(row.prepared_at),
    submittedAt:
      toOptionalDate(
        row.submitted_at,
      ),
    confirmedAt:
      toOptionalDate(
        row.confirmed_at,
      ),
    failedAt:
      toOptionalDate(
        row.failed_at,
      ),
    createdAt:
      toDate(row.created_at),
    updatedAt:
      toDate(row.updated_at),
  });


export const findGuarantorRelayIntent =
  async (
    env: Env,
    input: Readonly<{
      operation:
        GuarantorRelayOperation;
      resourceId: string;
    }>,
  ): Promise<
    RelayIntentRecord | null
  > => {
    const sql =
      await createDatabaseClient(env);

    const rows = await sql`
      SELECT
        id,
        operation,
        resource_type,
        resource_id,
        route_key,
        idempotency_key,
        request_hash,
        payload,
        status,
        tx_hash,
        attempt_count,
        last_error_code,
        last_error_message,
        prepared_at,
        submitted_at,
        confirmed_at,
        failed_at,
        created_at,
        updated_at
      FROM relay_intents
      WHERE operation =
          ${input.operation}
        AND resource_id =
          ${input.resourceId}
      LIMIT 1
    `;

    const row =
      rows[0] as
        | RelayIntentRow
        | undefined;

    return row
      ? toRecord(row)
      : null;
  };

export const createPreparedGuarantorRelayIntent =
  async (
    env: Env,
    input: Readonly<{
      operation:
        GuarantorRelayOperation;
      resourceId: string;
      routeKey: string;
      idempotencyKey: string;
      requestHash: string;
      payload:
        PreparedGuarantorRelayPayload;
      now: Date;
    }>,
  ): Promise<RelayIntentRecord> => {
    const sql =
      await createDatabaseClient(env);

    const payloadJson =
      JSON.stringify(
        input.payload,
      );

    const rows = await sql`
      INSERT INTO relay_intents (
        operation,
        resource_type,
        resource_id,
        route_key,
        idempotency_key,
        request_hash,
        payload,
        status,
        tx_hash,
        attempt_count,
        last_error_code,
        last_error_message,
        prepared_at,
        submitted_at,
        confirmed_at,
        failed_at,
        created_at,
        updated_at
      )
      VALUES (
        ${input.operation},
        'AUCTION',
        ${input.resourceId},
        ${input.routeKey},
        ${input.idempotencyKey},
        ${input.requestHash},
        ${payloadJson}::jsonb,
        'PREPARED',
        NULL,
        0,
        NULL,
        NULL,
        ${input.now},
        NULL,
        NULL,
        NULL,
        ${input.now},
        ${input.now}
      )
      ON CONFLICT (
        operation,
        resource_id
      )
      DO NOTHING
      RETURNING
        id,
        operation,
        resource_type,
        resource_id,
        route_key,
        idempotency_key,
        request_hash,
        payload,
        status,
        tx_hash,
        attempt_count,
        last_error_code,
        last_error_message,
        prepared_at,
        submitted_at,
        confirmed_at,
        failed_at,
        created_at,
        updated_at
    `;

    const row =
      rows[0] as
        | RelayIntentRow
        | undefined;

    if (row) {
      return toRecord(row);
    }

    const existing =
      await findGuarantorRelayIntent(
        env,
        {
          operation:
            input.operation,
          resourceId:
            input.resourceId,
        },
      );

    if (!existing) {
      throw new DomainError(
        "RPC_UNAVAILABLE",
        "Relay intent could not be persisted or recovered.",
        {
          retryable: true,
          details: {
            operation:
              input.operation,
            resourceId:
              input.resourceId,
          },
        },
      );
    }

    if (
      existing.routeKey !==
        input.routeKey ||
      existing.idempotencyKey !==
        input.idempotencyKey ||
      existing.requestHash !==
        input.requestHash
    ) {
      throw new DomainError(
        "ALREADY_PROCESSED",
        "A different relay intent already exists for this auction operation.",
        {
          details: {
            operation:
              input.operation,
            resourceId:
              input.resourceId,
            status:
              existing.status,
          },
        },
      );
    }

    return existing;
  };

export const markGuarantorRelaySubmitted =
  async (
    env: Env,
    input: Readonly<{
      intentId: string;
      expectedPreparedTxHash: Hex;
      submittedAt: Date;
    }>,
  ): Promise<RelayIntentRecord> => {
    const sql =
      await createDatabaseClient(env);

    const rows = await sql`
      UPDATE relay_intents
      SET
        status = 'SUBMITTED',
        tx_hash =
          ${input.expectedPreparedTxHash.toLowerCase()},
        attempt_count =
          attempt_count + 1,
        last_error_code =
          NULL,
        last_error_message =
          NULL,
        submitted_at =
          ${input.submittedAt},
        confirmed_at =
          NULL,
        failed_at =
          NULL,
        updated_at =
          ${input.submittedAt}
      WHERE id =
          ${input.intentId}
        AND status = 'PREPARED'
        AND payload ->>
          'derivedTxHash' =
          ${input.expectedPreparedTxHash}
      RETURNING
        id,
        operation,
        resource_type,
        resource_id,
        route_key,
        idempotency_key,
        request_hash,
        payload,
        status,
        tx_hash,
        attempt_count,
        last_error_code,
        last_error_message,
        prepared_at,
        submitted_at,
        confirmed_at,
        failed_at,
        created_at,
        updated_at
    `;

    const row =
      rows[0] as
        | RelayIntentRow
        | undefined;

    if (!row) {
      throw new DomainError(
        "AUCTION_STATE_CHANGED",
        "Prepared relay intent is no longer available for submission.",
        {
          retryable: true,
          details: {
            intentId:
              input.intentId,
          },
        },
      );
    }

    return toRecord(row);
  };

export const recordRecoverableGuarantorRelayFailure =
  async (
    env: Env,
    input: Readonly<{
      intentId: string;
      errorCode: string;
      errorMessage: string;
      failedAt: Date;
    }>,
  ): Promise<void> => {
    const sql =
      await createDatabaseClient(env);

    await sql`
      UPDATE relay_intents
      SET
        attempt_count =
          attempt_count + 1,
        last_error_code =
          ${input.errorCode},
        last_error_message =
          ${input.errorMessage},
        updated_at =
          ${input.failedAt}
      WHERE id =
          ${input.intentId}
        AND status = 'PREPARED'
    `;
  };

export const assertRelayIntentBinding = (
  intent: RelayIntentRecord,
  input: Readonly<{
    routeKey: string;
    idempotencyKey: string;
    requestHash: string;
  }>,
): void => {
  if (
    intent.routeKey !==
      input.routeKey ||
    intent.idempotencyKey !==
      input.idempotencyKey ||
    intent.requestHash !==
      input.requestHash
  ) {
    throw new DomainError(
      "ALREADY_PROCESSED",
      "Relay intent belongs to a different request.",
      {
        details: {
          intentId:
            intent.id,
          status:
            intent.status,
        },
      },
    );
  }
};
