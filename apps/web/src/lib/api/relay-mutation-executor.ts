// @file apps/web/src/lib/api/relay-mutation-executor.ts
//
// Durable two-transaction executor for an external relay side effect.
//
// Transaction A:
// - reserve persistent API idempotency;
// - revalidate and lock route-owned state;
// - create or recover the durable relay intent;
// - commit before broadcast.
//
// External phase:
// - recover or broadcast the exact signed transaction.
//
// Transaction B:
// - promote PREPARED to SUBMITTED when required;
// - write audit;
// - complete API idempotency.
//
// SCHEDULED projection remains owned by the chain indexer.
import {
  NextResponse,
} from 'next/server';

import type {
  TransactionSql,
} from 'postgres';

import type {
  Hex,
} from 'viem';

import type {
  AuthenticatedRequest,
} from '@/lib/auth';

import {
  canonicalErrorResult,
} from './error-response';

import {
  completeIdempotency,
  hashIdempotencyRequest,
  releaseIdempotency,
  reserveIdempotency,
  toTransactionJsonValue,
} from './idempotency';

import {
  assertRelayIntentBinding,
  decideRelayExecution,
  type RelayExecutionDecision,
} from './relay-execution';

import {
  markRelayIntentSubmitted,
  recordRelayBroadcastFailure,
  type RelayIntentRecord,
} from './relay-intent';

import type {
  ApiRequestContext,
} from './request-context';

import {
  requireIdempotencyKey,
} from './request-context';

import {
  writeAuditLog,
} from './audit';

import {
  withTransaction,
} from '@/lib/database/transaction';

type TransactionJsonValue =
  Parameters<
    TransactionSql['json']
  >[0];

type DurableRelayBinding =
  Readonly<{
    idempotencyId: string;
    idempotencyKey: string;
    requestHash: string;
    routeKey: string;
  }>;

type DurableRelayResponse =
  Readonly<{
    status: number;
    body:
      TransactionJsonValue;
    auditMetadata:
      TransactionJsonValue;
  }>;

type PrepareRelayOperation =
  (
    transaction:
      TransactionSql,
    binding:
      DurableRelayBinding,
  ) =>
    Promise<RelayIntentRecord>;

export type ExecuteRelayMutationInput =
  Readonly<{
    request: Request;
    requestContext:
      ApiRequestContext;
    authentication:
      AuthenticatedRequest;
    routeKey: string;
    requestBody:
      TransactionJsonValue;

    audit:
      Readonly<{
        action: string;
        resourceType: string;
        resourceId:
          string | null;
        metadata:
          TransactionJsonValue;
      }>;

    prepare:
      PrepareRelayOperation;

    broadcast:
      (
        prepared:
          Readonly<{
            txHash: Hex;
            serializedTransaction:
              Hex;
          }>,
      ) =>
        Promise<Hex>;

    response:
      (
        decision:
          RelayExecutionDecision,
        intent:
          RelayIntentRecord,
      ) =>
        DurableRelayResponse;
  }>;

type PreparationResult =
  | Readonly<{
      kind: 'REPLAY';
      status: number;
      body:
        TransactionJsonValue;
    }>
  | Readonly<{
      kind: 'EXECUTE';
      idempotencyId: string;
      idempotencyKey: string;
      requestHash: string;
      intent:
        RelayIntentRecord;
    }>;

function responseFromStoredBody(
  body:
    TransactionJsonValue,
  status: number,
  correlationId: string,
): Response {
  return NextResponse.json(
    body,
    {
      status,
      headers: {
        'x-correlation-id':
          correlationId,
        'cache-control':
          'no-store',
      },
    },
  );
}

function actorRolesForAudit(
  authentication:
    AuthenticatedRequest,
): TransactionJsonValue {
  return toTransactionJsonValue(
    authentication.actor.roles,
  );
}

function safeErrorMessage(
  error: unknown,
): string {
  if (
    error instanceof Error
  ) {
    return error.message
      .slice(
        0,
        2_000,
      );
  }

  return 'Unknown relay broadcast failure.';
}

async function prepareDurableExecution(
  input:
    ExecuteRelayMutationInput,
  idempotencyKey: string,
  requestHash: string,
): Promise<PreparationResult> {
  return withTransaction(
    async (
      transaction,
    ) => {
      const reservation =
        await reserveIdempotency(
          transaction,
          {
            actorWallet:
              input.authentication
                .actor.wallet,
            httpMethod:
              input.requestContext
                .method,
            routeKey:
              input.routeKey,
            idempotencyKey,
            requestHash,
            correlationId:
              input.requestContext
                .correlationId,
            now:
              new Date(),
          },
        );

      if (
        reservation.kind ===
          'REPLAY'
      ) {
        return Object.freeze({
          kind:
            'REPLAY',
          status:
            reservation
              .responseStatus,
          body:
            reservation
              .responseBody,
        });
      }

      const binding =
        Object.freeze({
          idempotencyId:
            reservation
              .record.id,
          idempotencyKey,
          requestHash,
          routeKey:
            input.routeKey,
        });

      const intent =
        await input.prepare(
          transaction,
          binding,
        );

      assertRelayIntentBinding(
        intent,
        {
          resourceId:
            intent.resourceId,
          routeKey:
            input.routeKey,
          idempotencyKey,
          requestHash,
        },
      );

      return Object.freeze({
        kind:
          'EXECUTE',
        idempotencyId:
          reservation
            .record.id,
        idempotencyKey,
        requestHash,
        intent,
      });
    },
  );
}

async function recordRecoverableBroadcastFailure(
  input:
    ExecuteRelayMutationInput,
  preparation:
    Extract<
      PreparationResult,
      Readonly<{
        kind: 'EXECUTE';
      }>
    >,
  error:
    unknown,
): Promise<void> {
  const canonical =
    canonicalErrorResult(
      error,
      input.requestContext
        .correlationId,
    );

  await withTransaction(
    async (
      transaction,
    ) => {
      await recordRelayBroadcastFailure(
        transaction,
        {
          intentId:
            preparation
              .intent.id,
          errorCode:
            canonical.body
              .error.code,
          errorMessage:
            safeErrorMessage(
              error,
            ),
          failedAt:
            new Date(),
        },
      );

      await releaseIdempotency(
        transaction,
        {
          id:
            preparation
              .idempotencyId,
        },
      );
    },
  );
}

async function completeDurableExecution(
  input:
    ExecuteRelayMutationInput,
  preparation:
    Extract<
      PreparationResult,
      Readonly<{
        kind: 'EXECUTE';
      }>
    >,
  decision:
    RelayExecutionDecision,
  submittedTxHash:
    Hex | null,
): Promise<Response> {
  return withTransaction(
    async (
      transaction,
    ) => {
      let intent =
        preparation.intent;

      if (
        decision.action ===
          'BROADCAST_PREPARED'
      ) {
        if (
          submittedTxHash ===
            null ||
          submittedTxHash
            .toLowerCase() !==
          decision.txHash
            .toLowerCase()
        ) {
          throw new Error(
            'Submitted relay hash does not match the durable prepared transaction.',
          );
        }

        intent =
          await markRelayIntentSubmitted(
            transaction,
            {
              intentId:
                decision
                  .intentId,
              txHash:
                submittedTxHash,
              submittedAt:
                new Date(),
            },
          );
      }

      const finalDecision =
        decideRelayExecution(
          intent,
        );

      const response =
        input.response(
          finalDecision,
          intent,
        );

      const completedAt =
        new Date();

      await writeAuditLog(
        transaction,
        {
          correlationId:
            input.requestContext
              .correlationId,
          sessionId:
            input.authentication
              .session.sessionId,
          actorWallet:
            input.authentication
              .actor.wallet,
          actorRoles:
            actorRolesForAudit(
              input.authentication,
            ),
          action:
            input.audit.action,
          resourceType:
            input.audit
              .resourceType,
          resourceId:
            intent.resourceId ??
            input.audit
              .resourceId,
          outcome:
            'SUCCEEDED',
          metadata:
            toTransactionJsonValue({
              ...(
                input.audit.metadata as
                  Record<
                    string,
                    TransactionJsonValue
                  >
              ),
              ...(
                response.auditMetadata as
                  Record<
                    string,
                    TransactionJsonValue
                  >
              ),
              relayIntentId:
                intent.id,
              relayStatus:
                intent.status,
              txHash:
                intent.txHash,
            }),
          createdAt:
            completedAt,
        },
      );

      await completeIdempotency(
        transaction,
        {
          id:
            preparation
              .idempotencyId,
          outcome:
            'COMPLETED',
          responseStatus:
            response.status,
          responseBody:
            response.body,
          completedAt,
        },
      );

      return responseFromStoredBody(
        response.body,
        response.status,
        input.requestContext
          .correlationId,
      );
    },
  );
}

export async function executeRelayMutation(
  input:
    ExecuteRelayMutationInput,
): Promise<Response> {
  const idempotencyKey =
    requireIdempotencyKey(
      input.request,
      input.requestContext
        .correlationId,
    );

  const requestHash =
    hashIdempotencyRequest({
      routeKey:
        input.routeKey,
      method:
        input.requestContext.method,
      actorWallet:
        input.authentication
          .actor.wallet
          .toLowerCase(),
      body:
        input.requestBody,
    });

  const preparation =
    await prepareDurableExecution(
      input,
      idempotencyKey,
      requestHash,
    );

  if (
    preparation.kind ===
      'REPLAY'
  ) {
    return responseFromStoredBody(
      preparation.body,
      preparation.status,
      input.requestContext
        .correlationId,
    );
  }

  const decision =
    decideRelayExecution(
      preparation.intent,
    );

  if (
    decision.action !==
      'BROADCAST_PREPARED'
  ) {
    return completeDurableExecution(
      input,
      preparation,
      decision,
      null,
    );
  }

  let submittedTxHash:
    Hex;

  try {
    submittedTxHash =
      await input.broadcast({
        txHash:
          decision.txHash,
        serializedTransaction:
          decision
            .serializedTransaction,
      });
  } catch (
    error: unknown
  ) {
    await recordRecoverableBroadcastFailure(
      input,
      preparation,
      error,
    );

    throw error;
  }

  return completeDurableExecution(
    input,
    preparation,
    decision,
    submittedTxHash,
  );
}
