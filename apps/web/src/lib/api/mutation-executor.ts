import {
  NextResponse,
} from 'next/server';

import type {
  TransactionSql,
} from 'postgres';

import type {
  AuthenticatedRequest,
} from '@/lib/auth';

import {
  withTransaction,
} from '@/lib/database';

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
  requireIdempotencyKey,
  type ApiRequestContext,
} from './request-context';

import {
  writeAuditLog,
  type AuditOutcome,
} from './audit';

type TransactionJsonValue =
  Parameters<
    TransactionSql['json']
  >[0];

export type MutationAudit =
  Readonly<{
    action: string;
    resourceType: string;
    resourceId:
      | string
      | null;
    metadata:
      TransactionJsonValue;
  }>;

export type MutationResult =
  Readonly<{
    status: number;
    body: TransactionJsonValue;
    audit?: Readonly<{
      resourceId?:
        | string
        | null;
      metadata?:
        TransactionJsonValue;
    }>;
  }>;

export type MutationOperation =
  (
    transaction: TransactionSql,
  ) => Promise<MutationResult>;

export type ExecuteMutationInput =
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
      MutationAudit;
    operation:
      MutationOperation;
  }>;

const REJECTED_ERROR_CODES =
  new Set([
    'INVALID_INPUT',
    'UNAUTHENTICATED',
    'SESSION_EXPIRED',
    'WRONG_NETWORK',
    'ROLE_FORBIDDEN',
    'RESOURCE_FORBIDDEN',
    'AUCTION_NOT_FOUND',
    'AUCTION_STATE_CHANGED',
    'ALREADY_PROCESSED',
    'NOTARY_ALREADY_ASSIGNED',
    'INVALID_SIGNATURE',
    'SIGNATURE_EXPIRED',
    'PARTNER_INACTIVE',
    'PARTNER_REGISTRY_DRIFT',
    'INSUFFICIENT_BALANCE',
    'TRANSACTION_REVERTED',
  ]);

function responseFromStoredBody(
  body: TransactionJsonValue,
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

function failureAuditOutcome(
  code: string,
): AuditOutcome {
  return REJECTED_ERROR_CODES.has(
    code,
  )
    ? 'REJECTED'
    : 'FAILED';
}

export async function executeMutation(
  input: ExecuteMutationInput,
): Promise<Response> {
  const {
    request,
    requestContext,
    authentication,
  } = input;

  const idempotencyKey =
    requireIdempotencyKey(
      request,
      requestContext.correlationId,
    );

  const requestHash =
    hashIdempotencyRequest({
      routeKey:
        input.routeKey,
      method:
        requestContext.method,
      actorWallet:
        authentication.actor.wallet
          .toLowerCase(),
      body:
        input.requestBody,
    });

  const reservation =
    await withTransaction(
      async (transaction) =>
        reserveIdempotency(
          transaction,
          {
            actorWallet:
              authentication.actor.wallet,
            httpMethod:
              requestContext.method,
            routeKey:
              input.routeKey,
            idempotencyKey,
            requestHash,
            correlationId:
              requestContext.correlationId,
            now:
              new Date(),
          },
        ),
    );

  if (
    reservation.kind ===
      'REPLAY'
  ) {
    return responseFromStoredBody(
      reservation.responseBody,
      reservation.responseStatus,
      requestContext.correlationId,
    );
  }

  try {
    const completed =
      await withTransaction(
        async (transaction) => {
          const result =
            await input.operation(
              transaction,
            );

          const completedAt =
            new Date();

          await writeAuditLog(
            transaction,
            {
              correlationId:
                requestContext
                  .correlationId,
              sessionId:
                authentication
                  .session
                  .sessionId,
              actorWallet:
                authentication
                  .actor
                  .wallet,
              actorRoles:
                actorRolesForAudit(
                  authentication,
                ),
              action:
                input.audit.action,
              resourceType:
                input.audit
                  .resourceType,
              resourceId:
                result.audit
                  ?.resourceId ??
                input.audit
                  .resourceId,
              outcome:
                'SUCCEEDED',
              metadata:
                result.audit
                  ?.metadata ??
                input.audit
                  .metadata,
              createdAt:
                completedAt,
            },
          );

          await completeIdempotency(
            transaction,
            {
              id:
                reservation.record.id,
              outcome:
                'COMPLETED',
              responseStatus:
                result.status,
              responseBody:
                result.body,
              completedAt,
            },
          );

          return result;
        },
      );

    return responseFromStoredBody(
      completed.body,
      completed.status,
      requestContext.correlationId,
    );
  } catch (error: unknown) {
    const canonicalError =
      canonicalErrorResult(
        error,
        requestContext.correlationId,
      );

    const errorBody =
      toTransactionJsonValue(
        canonicalError.body,
      );

    const errorCode =
      canonicalError.body
        .error
        .code;

    const retryable =
      canonicalError.body
        .error
        .retryable;

    try {
      await withTransaction(
        async (transaction) => {
          const finalizedAt =
            new Date();

          await writeAuditLog(
            transaction,
            {
              correlationId:
                requestContext
                  .correlationId,
              sessionId:
                authentication
                  .session
                  .sessionId,
              actorWallet:
                authentication
                  .actor
                  .wallet,
              actorRoles:
                actorRolesForAudit(
                  authentication,
                ),
              action:
                input.audit.action,
              resourceType:
                input.audit
                  .resourceType,
              resourceId:
                input.audit
                  .resourceId,
              outcome:
                failureAuditOutcome(
                  errorCode,
                ),
              metadata:
                toTransactionJsonValue({
                  requestMetadata:
                    input.audit
                      .metadata,
                  error:
                    canonicalError.body
                      .error,
                }),
              createdAt:
                finalizedAt,
            },
          );

          if (retryable) {
            await releaseIdempotency(
              transaction,
              {
                id:
                  reservation
                    .record
                    .id,
              },
            );

            return;
          }

          await completeIdempotency(
            transaction,
            {
              id:
                reservation.record.id,
              outcome:
                'FAILED',
              responseStatus:
                canonicalError.status,
              responseBody:
                errorBody,
              completedAt:
                finalizedAt,
            },
          );
        },
      );
    } catch (
      finalizationError:
        unknown
    ) {
      console.error(
        JSON.stringify({
          level:
            'error',
          event:
            'mutation_failure_finalization_failed',
          correlationId:
            requestContext
              .correlationId,
          routeKey:
            input.routeKey,
          idempotencyId:
            reservation.record.id,
          retryable,
          error:
            finalizationError
              instanceof Error
              ? finalizationError
                  .message
              : String(
                  finalizationError,
                ),
        }),
      );
    }

    throw error;
  }
}
