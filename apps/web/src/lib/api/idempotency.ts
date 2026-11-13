import {
  createHash,
} from 'node:crypto';

import type {
  TransactionSql,
} from 'postgres';

type TransactionJsonValue =
  Parameters<
    TransactionSql['json']
  >[0];

import {
  createDomainError,
} from '@paralel/domain';

const IDEMPOTENCY_TTL_MS =
  24 * 60 * 60 * 1000;

const PROCESSING_TIMEOUT_MS =
  5 * 60 * 1000;

export type IdempotencyStatus =
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED';

export type IdempotencyRecord =
  Readonly<{
    id: string;
    actorWallet: string;
    httpMethod: string;
    routeKey: string;
    idempotencyKey: string;
    requestHash: string;
    status: IdempotencyStatus;
    responseStatus: number | null;
    responseBody: TransactionJsonValue | null;
    correlationId: string;
    lockedAt: Date;
    completedAt: Date | null;
    expiresAt: Date;
  }>;

export type IdempotencyReservation =
  | Readonly<{
      kind: 'ACQUIRED';
      record: IdempotencyRecord;
    }>
  | Readonly<{
      kind: 'REPLAY';
      record: IdempotencyRecord;
      responseStatus: number;
      responseBody: TransactionJsonValue;
    }>;

type IdempotencyRow = {
  id: string;
  actor_wallet: string;
  http_method: string;
  route_key: string;
  idempotency_key: string;
  request_hash: string;
  status: IdempotencyStatus;
  response_status: number | null;
  response_body: TransactionJsonValue | null;
  correlation_id: string;
  locked_at: Date;
  completed_at: Date | null;
  expires_at: Date;
};

function toRecord(
  row: IdempotencyRow,
): IdempotencyRecord {
  return Object.freeze({
    id:
      row.id,
    actorWallet:
      row.actor_wallet,
    httpMethod:
      row.http_method,
    routeKey:
      row.route_key,
    idempotencyKey:
      row.idempotency_key,
    requestHash:
      row.request_hash,
    status:
      row.status,
    responseStatus:
      row.response_status,
    responseBody:
      row.response_body,
    correlationId:
      row.correlation_id,
    lockedAt:
      new Date(row.locked_at),
    completedAt:
      row.completed_at
        ? new Date(row.completed_at)
        : null,
    expiresAt:
      new Date(row.expires_at),
  });
}

export function hashIdempotencyRequest(
  value: unknown,
): string {
  const normalized =
    toTransactionJsonValue(
      value,
    );

  const serialized =
    JSON.stringify(normalized);

  return createHash('sha256')
    .update(serialized)
    .digest('hex');
}

export async function reserveIdempotency(
  transaction: TransactionSql,
  input: Readonly<{
    actorWallet: string;
    httpMethod: string;
    routeKey: string;
    idempotencyKey: string;
    requestHash: string;
    correlationId: string;
    now: Date;
  }>,
): Promise<IdempotencyReservation> {
  const actorWallet =
    input.actorWallet.toLowerCase();

  const httpMethod =
    input.httpMethod.toUpperCase();

  const expiresAt =
    new Date(
      input.now.getTime() +
      IDEMPOTENCY_TTL_MS,
    );

  const inserted =
    await transaction<
      IdempotencyRow[]
    >`
      INSERT INTO api_idempotency (
        actor_wallet,
        http_method,
        route_key,
        idempotency_key,
        request_hash,
        status,
        correlation_id,
        locked_at,
        expires_at,
        created_at,
        updated_at
      )
      VALUES (
        ${actorWallet},
        ${httpMethod},
        ${input.routeKey},
        ${input.idempotencyKey},
        ${input.requestHash},
        'PROCESSING',
        ${input.correlationId},
        ${input.now},
        ${expiresAt},
        ${input.now},
        ${input.now}
      )
      ON CONFLICT (
        actor_wallet,
        http_method,
        route_key,
        idempotency_key
      )
      DO NOTHING
      RETURNING *
    `;

  const insertedRow =
    inserted[0];

  if (insertedRow) {
    return Object.freeze({
      kind: 'ACQUIRED',
      record:
        toRecord(insertedRow),
    });
  }

  const existingRows =
    await transaction<
      IdempotencyRow[]
    >`
      SELECT *
      FROM api_idempotency
      WHERE actor_wallet =
        ${actorWallet}
        AND http_method =
          ${httpMethod}
        AND route_key =
          ${input.routeKey}
        AND idempotency_key =
          ${input.idempotencyKey}
      FOR UPDATE
    `;

  const existingRow =
    existingRows[0];

  if (!existingRow) {
    throw createDomainError(
      'RPC_UNAVAILABLE',
      'Idempotency record could not be resolved.',
      {
        retryable: true,
        correlationId:
          input.correlationId,
      },
    );
  }

  const existingDecision =
    decideExistingIdempotency(
      {
        requestHash:
          existingRow
            .request_hash,
        status:
          existingRow.status,
        responseStatus:
          existingRow
            .response_status,
        responseBody:
          existingRow
            .response_body,
        lockedAt:
          new Date(
            existingRow
              .locked_at,
          ),
      },
      {
        requestHash:
          input.requestHash,
        correlationId:
          input.correlationId,
        routeKey:
          input.routeKey,
        now:
          input.now,
      },
    );

  if (
    existingDecision.kind ===
      'REPLAY'
  ) {
    return Object.freeze({
      kind: 'REPLAY',
      record:
        toRecord(existingRow),
      responseStatus:
        existingDecision
          .responseStatus,
      responseBody:
        existingDecision
          .responseBody,
    });
  }

  const recovered =
    await transaction<
      IdempotencyRow[]
    >`
      UPDATE api_idempotency
      SET
        correlation_id =
          ${input.correlationId},
        locked_at =
          ${input.now},
        expires_at =
          ${expiresAt},
        updated_at =
          ${input.now}
      WHERE id =
        ${existingRow.id}
      RETURNING *
    `;

  return Object.freeze({
    kind: 'ACQUIRED',
    record:
      toRecord(recovered[0]),
  });
}

export async function completeIdempotency(
  transaction: TransactionSql,
  input: Readonly<{
    id: string;
    outcome:
      | 'COMPLETED'
      | 'FAILED';
    responseStatus: number;
    responseBody: TransactionJsonValue;
    completedAt: Date;
  }>,
): Promise<void> {
  const rows =
    await transaction<
      ReadonlyArray<{
        id: string;
      }>
    >`
      UPDATE api_idempotency
      SET
        status =
          ${input.outcome},
        response_status =
          ${input.responseStatus},
        response_body =
          ${transaction.json(
            input.responseBody,
          )},
        completed_at =
          ${input.completedAt},
        updated_at =
          ${input.completedAt}
      WHERE id =
        ${input.id}
        AND status =
          'PROCESSING'
      RETURNING id
    `;

  if (rows.length !== 1) {
    throw createDomainError(
      'AUCTION_STATE_CHANGED',
      'Idempotency reservation is no longer active.',
      {
        details: {
          idempotencyId:
            input.id,
        },
      },
    );
  }
}

export function toTransactionJsonValue(
  value: unknown,
): TransactionJsonValue {
  const activeObjects =
    new WeakSet<object>();

  function normalize(
    current: unknown,
    path: string,
  ): TransactionJsonValue {
    if (
      current === null ||
      typeof current === 'string' ||
      typeof current === 'boolean'
    ) {
      return current;
    }

    if (
      typeof current === 'number'
    ) {
      if (!Number.isFinite(current)) {
        throw createDomainError(
          'INVALID_INPUT',
          `Non-finite number at ${path} cannot be serialized as JSON.`,
        );
      }

      return current;
    }

    if (
      typeof current === 'bigint' ||
      typeof current === 'undefined' ||
      typeof current === 'function' ||
      typeof current === 'symbol'
    ) {
      throw createDomainError(
        'INVALID_INPUT',
        `Unsupported JSON value at ${path}.`,
      );
    }

    if (
      current instanceof Date
    ) {
      return current.toISOString();
    }

    if (
      Array.isArray(current)
    ) {
      if (
        activeObjects.has(current)
      ) {
        throw createDomainError(
          'INVALID_INPUT',
          `Circular JSON value detected at ${path}.`,
        );
      }

      activeObjects.add(current);

      const normalized =
        current.map(
          (item, index) =>
            normalize(
              item,
              `${path}[${index}]`,
            ),
        );

      activeObjects.delete(current);

      return normalized;
    }

    if (
      current !== null &&
      typeof current === 'object'
    ) {
      if (
        activeObjects.has(current)
      ) {
        throw createDomainError(
          'INVALID_INPUT',
          `Circular JSON value detected at ${path}.`,
        );
      }

      activeObjects.add(current);

      const normalized:
        Record<
          string,
          TransactionJsonValue
        > = {};

      for (
        const [key, child]
        of Object.entries(current)
          .sort(
            ([left], [right]) =>
              left.localeCompare(right),
          )
      ) {
        normalized[key] =
          normalize(
            child,
            `${path}.${key}`,
          );
      }

      activeObjects.delete(current);

      return normalized;
    }

    throw createDomainError(
      'INVALID_INPUT',
      `Unsupported JSON value at ${path}.`,
    );
  }

  return normalize(
    value,
    '$',
  );
}

export async function releaseIdempotency(
  transaction: TransactionSql,
  input: Readonly<{
    id: string;
  }>,
): Promise<void> {
  const rows =
    await transaction<
      ReadonlyArray<{
        id: string;
      }>
    >`
      DELETE FROM api_idempotency
      WHERE id = ${input.id}
        AND status = 'PROCESSING'
      RETURNING id
    `;

  if (rows.length !== 1) {
    throw createDomainError(
      'AUCTION_STATE_CHANGED',
      'Idempotency reservation is no longer releasable.',
      {
        details: {
          idempotencyId:
            input.id,
        },
      },
    );
  }
}

export type ExistingIdempotencyDecision =
  | Readonly<{
      kind: 'REPLAY';
      responseStatus: number;
      responseBody:
        TransactionJsonValue;
    }>
  | Readonly<{
      kind: 'REACQUIRE';
    }>;

export function decideExistingIdempotency(
  record:
    Readonly<{
      requestHash: string;
      status:
        IdempotencyStatus;
      responseStatus:
        number | null;
      responseBody:
        TransactionJsonValue | null;
      lockedAt:
        Date;
    }>,
  input:
    Readonly<{
      requestHash: string;
      correlationId: string;
      routeKey: string;
      now: Date;
    }>,
): ExistingIdempotencyDecision {
  if (
    !Number.isFinite(
      input.now.getTime(),
    ) ||
    !Number.isFinite(
      record.lockedAt
        .getTime(),
    )
  ) {
    throw createDomainError(
      'INVALID_INPUT',
      'Idempotency evaluation time is invalid.',
      {
        correlationId:
          input.correlationId,
      },
    );
  }

  if (
    record.requestHash !==
    input.requestHash
  ) {
    throw createDomainError(
      'INVALID_INPUT',
      'Idempotency-Key was already used with a different request.',
      {
        correlationId:
          input.correlationId,
        details: {
          routeKey:
            input.routeKey,
        },
      },
    );
  }

  if (
    record.status ===
      'COMPLETED' ||
    record.status ===
      'FAILED'
  ) {
    if (
      record.responseStatus ===
        null ||
      record.responseBody ===
        null
    ) {
      throw createDomainError(
        'RPC_UNAVAILABLE',
        'Stored idempotency response is incomplete.',
        {
          retryable: true,
          correlationId:
            input.correlationId,
        },
      );
    }

    return Object.freeze({
      kind: 'REPLAY',
      responseStatus:
        record.responseStatus,
      responseBody:
        record.responseBody,
    });
  }

  const staleBefore =
    new Date(
      input.now.getTime() -
      PROCESSING_TIMEOUT_MS,
    );

  if (
    record.lockedAt >
    staleBefore
  ) {
    throw createDomainError(
      'ALREADY_PROCESSED',
      'An equivalent request is already processing.',
      {
        retryable: true,
        correlationId:
          input.correlationId,
        details: {
          routeKey:
            input.routeKey,
        },
      },
    );
  }

  return Object.freeze({
    kind: 'REACQUIRE',
  });
}
