// @file apps/web/src/lib/api/relay-intent.ts
//
// Durable persistence boundary for signed relay transactions.
//
// PREPARED:
// - signed transaction and deterministic hash are persisted in payload;
// - tx_hash column remains NULL;
// - transaction has not been acknowledged as broadcast.
//
// SUBMITTED:
// - exact signed transaction has been broadcast;
// - tx_hash column and submitted_at are populated.
//
// CONFIRMED is owned by chain-event projection.
import type {
  TransactionSql,
} from 'postgres';

import type {
  Hex,
} from 'viem';

import {
  createDomainError,
} from '@paralel/domain';

type TransactionJsonValue =
  Parameters<
    TransactionSql['json']
  >[0];

export type RelayIntentStatus =
  | 'PREPARED'
  | 'SUBMITTED'
  | 'CONFIRMED'
  | 'FAILED';

export type RelayOperation =
  | 'REGISTER_AUCTION'
  | 'MARK_COLLECTED'
  | 'MARK_WITHDRAWN'
  | 'SUBMIT_AWARD'
  | 'WITHDRAW_REFUND'
  | 'WITHDRAW_CONSIGNOR'
  | 'REUSE_ROUND';

type PreparedRelayBase =
  Readonly<{
    version: 1;
    auctionCode: string;
    serializedTransaction:
      Hex;
    derivedTxHash:
      Hex;
  }>;

export type PreparedRegisterAuctionPayload =
  PreparedRelayBase &
  Readonly<{
    operation:
      'REGISTER_AUCTION';
    registerAuction:
      TransactionJsonValue;
  }>;

export type PreparedMarkCollectedPayload =
  PreparedRelayBase &
  Readonly<{
    operation:
      'MARK_COLLECTED';
    markCollected:
      TransactionJsonValue;
  }>;

export type PreparedMarkWithdrawnPayload =
  PreparedRelayBase &
  Readonly<{
    operation:
      'MARK_WITHDRAWN';
    markWithdrawn:
      TransactionJsonValue;
  }>;

export type PreparedSubmitAwardPayload =
  PreparedRelayBase &
  Readonly<{
    operation:
      'SUBMIT_AWARD';
    submitAward:
      TransactionJsonValue;
  }>;

export type PreparedWithdrawRefundPayload =
  PreparedRelayBase &
  Readonly<{
    operation:
      'WITHDRAW_REFUND';
    withdrawRefund:
      TransactionJsonValue;
  }>;

export type PreparedWithdrawConsignorPayload =
  PreparedRelayBase &
  Readonly<{
    operation:
      'WITHDRAW_CONSIGNOR';
    withdrawConsignor:
      TransactionJsonValue;
  }>;

export type PreparedReuseRoundPayload =
  PreparedRelayBase &
  Readonly<{
    operation:
      'REUSE_ROUND';
    reuseRound:
      TransactionJsonValue;
  }>;

export type PreparedRelayPayload =
  | PreparedRegisterAuctionPayload
  | PreparedMarkCollectedPayload
  | PreparedMarkWithdrawnPayload
  | PreparedSubmitAwardPayload
  | PreparedWithdrawRefundPayload
  | PreparedWithdrawConsignorPayload
  | PreparedReuseRoundPayload;

export type RelayIntentRecord =
  Readonly<{
    id: string;
    resourceId: string;
    routeKey: string;
    idempotencyKey: string;
    requestHash: string;
    payload:
      PreparedRelayPayload;
    status:
      RelayIntentStatus;
    txHash:
      | Hex
      | null;
    attemptCount:
      number;
    preparedAt:
      Date;
    submittedAt:
      | Date
      | null;
    confirmedAt:
      | Date
      | null;
    failedAt:
      | Date
      | null;
  }>;

type RelayIntentRow =
  Readonly<{
    id: string;
    operation:
      RelayOperation;
    resource_id: string;
    route_key: string;
    idempotency_key: string;
    request_hash: string;
    payload:
      unknown;
    status:
      RelayIntentStatus;
    tx_hash:
      | string
      | null;
    attempt_count:
      number;
    prepared_at:
      Date;
    submitted_at:
      | Date
      | null;
    confirmed_at:
      | Date
      | null;
    failed_at:
      | Date
      | null;
  }>;

function isHex32(
  value: unknown,
): value is Hex {
  return (
    typeof value ===
      'string' &&
    /^0x[0-9a-f]{64}$/.test(
      value,
    )
  );
}

function isSerializedTransaction(
  value: unknown,
): value is Hex {
  return (
    typeof value ===
      'string' &&
    /^0x[0-9a-f]+$/.test(
      value,
    ) &&
    value.length > 2
  );
}

function parsePayloadDetail(
  value: unknown,
  field: string,
): TransactionJsonValue {
  if (
    typeof value !==
      'object' ||
    value === null ||
    Array.isArray(value)
  ) {
    throw new Error(
      `Relay intent ${field} projection is invalid.`,
    );
  }

  return value as
    TransactionJsonValue;
}

function parsePayload(
  value: unknown,
): PreparedRelayPayload {
  if (
    typeof value !==
      'object' ||
    value === null ||
    Array.isArray(value)
  ) {
    throw new Error(
      'Relay intent payload is invalid.',
    );
  }

  const payload =
    value as
      Record<string, unknown>;

  if (
    payload.version !== 1 ||
    typeof payload.auctionCode !==
      'string' ||
    payload.auctionCode.length === 0 ||
    !isSerializedTransaction(
      payload.serializedTransaction,
    ) ||
    !isHex32(
      payload.derivedTxHash,
    )
  ) {
    throw new Error(
      'Relay intent payload projection is invalid.',
    );
  }

  const base =
    Object.freeze({
      version:
        1 as const,
      auctionCode:
        payload.auctionCode,
      serializedTransaction:
        payload.serializedTransaction,
      derivedTxHash:
        payload.derivedTxHash,
    });

  if (
    payload.operation ===
      'REGISTER_AUCTION'
  ) {
    return Object.freeze({
      ...base,
      operation:
        'REGISTER_AUCTION',
      registerAuction:
        parsePayloadDetail(
          payload.registerAuction,
          'registerAuction',
        ),
    });
  }

  if (
    payload.operation ===
      'MARK_COLLECTED'
  ) {
    return Object.freeze({
      ...base,
      operation:
        'MARK_COLLECTED',
      markCollected:
        parsePayloadDetail(
          payload.markCollected,
          'markCollected',
        ),
    });
  }

  if (
    payload.operation ===
      'MARK_WITHDRAWN'
  ) {
    return Object.freeze({
      ...base,
      operation:
        'MARK_WITHDRAWN',
      markWithdrawn:
        parsePayloadDetail(
          payload.markWithdrawn,
          'markWithdrawn',
        ),
    });
  }

  if (
    payload.operation ===
      'SUBMIT_AWARD'
  ) {
    return Object.freeze({
      ...base,
      operation:
        'SUBMIT_AWARD',
      submitAward:
        parsePayloadDetail(
          payload.submitAward,
          'submitAward',
        ),
    });
  }

  if (
    payload.operation ===
      'WITHDRAW_REFUND'
  ) {
    return Object.freeze({
      ...base,
      operation:
        'WITHDRAW_REFUND',
      withdrawRefund:
        parsePayloadDetail(
          payload.withdrawRefund,
          'withdrawRefund',
        ),
    });
  }

  if (
    payload.operation ===
      'WITHDRAW_CONSIGNOR'
  ) {
    return Object.freeze({
      ...base,
      operation:
        'WITHDRAW_CONSIGNOR',
      withdrawConsignor:
        parsePayloadDetail(
          payload.withdrawConsignor,
          'withdrawConsignor',
        ),
    });
  }

  if (
    payload.operation ===
      'REUSE_ROUND'
  ) {
    return Object.freeze({
      ...base,
      operation:
        'REUSE_ROUND',
      reuseRound:
        parsePayloadDetail(
          payload.reuseRound,
          'reuseRound',
        ),
    });
  }

  throw new Error(
    'Relay intent payload projection is invalid: unsupported operation.',
  );
}

function toRecord(
  row: RelayIntentRow,
): RelayIntentRecord {
  const payload =
    parsePayload(
      row.payload,
    );

  if (
    payload.operation !==
      row.operation
  ) {
    throw new Error(
      'Relay intent operation does not match its durable payload.',
    );
  }

  if (
    row.tx_hash !== null &&
    !isHex32(
      row.tx_hash,
    )
  ) {
    throw new Error(
      'Relay intent tx hash projection is invalid.',
    );
  }

  return Object.freeze({
    id:
      row.id,
    resourceId:
      row.resource_id,
    routeKey:
      row.route_key,
    idempotencyKey:
      row.idempotency_key,
    requestHash:
      row.request_hash,
    payload,
    status:
      row.status,
    txHash:
      row.tx_hash,
    attemptCount:
      row.attempt_count,
    preparedAt:
      new Date(
        row.prepared_at,
      ),
    submittedAt:
      row.submitted_at ===
        null
        ? null
        : new Date(
            row.submitted_at,
          ),
    confirmedAt:
      row.confirmed_at ===
        null
        ? null
        : new Date(
            row.confirmed_at,
          ),
    failedAt:
      row.failed_at ===
        null
        ? null
        : new Date(
            row.failed_at,
          ),
  });
}

export async function findRelayIntentForUpdate(
  transaction:
    TransactionSql,
  resourceId:
    string,
  operation:
    RelayOperation =
      'REGISTER_AUCTION',
): Promise<
  RelayIntentRecord | null
> {
  const rows =
    await transaction<
      RelayIntentRow[]
    >`
      SELECT
        id,
        operation,
        resource_id,
        route_key,
        idempotency_key,
        request_hash,
        payload,
        status,
        tx_hash,
        attempt_count,
        prepared_at,
        submitted_at,
        confirmed_at,
        failed_at
      FROM relay_intents
      WHERE
        operation =
          ${operation}
        AND resource_id =
          ${resourceId}
      FOR UPDATE
    `;

  const row =
    rows[0];

  return row
    ? toRecord(row)
    : null;
}

export async function createPreparedRelayIntent(
  transaction:
    TransactionSql,
  input:
    Readonly<{
      resourceId: string;
      routeKey: string;
      idempotencyKey: string;
      requestHash: string;
      payload:
        PreparedRelayPayload;
      preparedAt: Date;
    }>,
): Promise<RelayIntentRecord> {
  const rows =
    await transaction<
      RelayIntentRow[]
    >`
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
        prepared_at,
        submitted_at,
        confirmed_at,
        failed_at,
        created_at,
        updated_at
      )
      VALUES (
        ${input.payload.operation},
        'AUCTION',
        ${input.resourceId},
        ${input.routeKey},
        ${input.idempotencyKey},
        ${input.requestHash},
        ${transaction.json(
          input.payload,
        )},
        'PREPARED',
        NULL,
        0,
        ${input.preparedAt},
        NULL,
        NULL,
        NULL,
        ${input.preparedAt},
        ${input.preparedAt}
      )
      RETURNING
        id,
        operation,
        resource_id,
        route_key,
        idempotency_key,
        request_hash,
        payload,
        status,
        tx_hash,
        attempt_count,
        prepared_at,
        submitted_at,
        confirmed_at,
        failed_at
    `;

  const row =
    rows[0];

  if (!row) {
    throw new Error(
      'Relay intent insert returned no record.',
    );
  }

  return toRecord(row);
}

export type PreparedRelayIntentInput =
  Readonly<{
    resourceId: string;
    routeKey: string;
    idempotencyKey: string;
    requestHash: string;
    payload:
      PreparedRelayPayload;
    preparedAt: Date;
  }>;

export type RelayIntentReuseDecision =
  | 'CREATE'
  | 'REUSE'
  | 'REPLACE_CONFIRMED'
  | 'CONFLICT';

export function decideRelayIntentReuse(
  existing:
    RelayIntentRecord | null,
  input:
    PreparedRelayIntentInput,
): RelayIntentReuseDecision {
  if (existing === null) {
    return 'CREATE';
  }

  if (
    existing.resourceId !==
      input.resourceId ||
    existing.payload.operation !==
      input.payload.operation
  ) {
    return 'CONFLICT';
  }

  if (
    existing.routeKey ===
      input.routeKey &&
    existing.idempotencyKey ===
      input.idempotencyKey &&
    existing.requestHash ===
      input.requestHash
  ) {
    return 'REUSE';
  }

  return existing.status ===
    'CONFIRMED'
    ? 'REPLACE_CONFIRMED'
    : 'CONFLICT';
}

export async function createOrReplacePreparedRelayIntent(
  transaction:
    TransactionSql,
  existing:
    RelayIntentRecord | null,
  input:
    PreparedRelayIntentInput,
): Promise<RelayIntentRecord> {
  const decision =
    decideRelayIntentReuse(
      existing,
      input,
    );

  if (decision === 'CREATE') {
    return createPreparedRelayIntent(
      transaction,
      input,
    );
  }

  if (decision === 'REUSE') {
    if (existing === null) {
      throw new Error(
        'Relay intent reuse decision lost its existing record.',
      );
    }

    return existing;
  }

  if (
    decision !==
      'REPLACE_CONFIRMED' ||
    existing === null
  ) {
    throw createDomainError(
      'AUCTION_STATE_CHANGED',
      'A different relay action for this auction is still awaiting reconciliation.',
    );
  }

  const rows =
    await transaction<
      RelayIntentRow[]
    >`
      UPDATE relay_intents
      SET
        route_key =
          ${input.routeKey},
        idempotency_key =
          ${input.idempotencyKey},
        request_hash =
          ${input.requestHash},
        payload =
          ${transaction.json(
            input.payload,
          )},
        status =
          'PREPARED',
        tx_hash =
          NULL,
        attempt_count =
          0,
        prepared_at =
          ${input.preparedAt},
        submitted_at =
          NULL,
        confirmed_at =
          NULL,
        failed_at =
          NULL,
        last_error_code =
          NULL,
        last_error_message =
          NULL,
        updated_at =
          ${input.preparedAt}
      WHERE
        id =
          ${existing.id}
        AND resource_id =
          ${input.resourceId}
        AND operation =
          ${input.payload.operation}
        AND status =
          'CONFIRMED'
      RETURNING
        id,
        operation,
        resource_id,
        route_key,
        idempotency_key,
        request_hash,
        payload,
        status,
        tx_hash,
        attempt_count,
        prepared_at,
        submitted_at,
        confirmed_at,
        failed_at
    `;

  const row =
    rows[0];

  if (!row) {
    throw createDomainError(
      'AUCTION_STATE_CHANGED',
      'The confirmed relay action changed before a new action could be prepared.',
      {
        retryable: true,
      },
    );
  }

  return toRecord(row);
}

export async function markRelayIntentSubmitted(
  transaction:
    TransactionSql,
  input:
    Readonly<{
      intentId: string;
      txHash: Hex;
      submittedAt: Date;
    }>,
): Promise<RelayIntentRecord> {
  const rows =
    await transaction<
      RelayIntentRow[]
    >`
      UPDATE relay_intents
      SET
        status =
          'SUBMITTED',
        tx_hash =
          ${input.txHash.toLowerCase()},
        attempt_count =
          attempt_count + 1,
        submitted_at =
          ${input.submittedAt},
        last_error_code =
          NULL,
        last_error_message =
          NULL,
        updated_at =
          ${input.submittedAt}
      WHERE
        id =
          ${input.intentId}
        AND status =
          'PREPARED'
        AND tx_hash IS NULL
      RETURNING
        id,
        operation,
        resource_id,
        route_key,
        idempotency_key,
        request_hash,
        payload,
        status,
        tx_hash,
        attempt_count,
        prepared_at,
        submitted_at,
        confirmed_at,
        failed_at
    `;

  const row =
    rows[0];

  if (!row) {
    throw new Error(
      'Relay intent submission state changed.',
    );
  }

  return toRecord(row);
}

export async function recordRelayBroadcastFailure(
  transaction:
    TransactionSql,
  input:
    Readonly<{
      intentId: string;
      errorCode: string;
      errorMessage: string;
      failedAt: Date;
    }>,
): Promise<void> {
  const rows =
    await transaction<
      Array<{
        id: string;
      }>
    >`
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
      WHERE
        id =
          ${input.intentId}
        AND status =
          'PREPARED'
      RETURNING id
    `;

  if (
    rows.length !== 1
  ) {
    throw new Error(
      'Relay intent failure recording lost its state boundary.',
    );
  }
}

export function validatePreparedRelayPayload(
  value: unknown,
): PreparedRelayPayload {
  return parsePayload(value);
}
