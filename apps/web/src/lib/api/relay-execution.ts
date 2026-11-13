// @file apps/web/src/lib/api/relay-execution.ts
//
// Pure recovery decisions for durable relay execution.
// No database, RPC, environment, or signing access.
import {
  createDomainError,
} from '@paralel/domain';

import type {
  Hex,
} from 'viem';

import type {
  RelayIntentRecord,
} from './relay-intent';

export type RelayExecutionDecision =
  | Readonly<{
      action:
        'BROADCAST_PREPARED';
      intentId:
        string;
      txHash:
        Hex;
      serializedTransaction:
        Hex;
    }>
  | Readonly<{
      action:
        'WAIT_FOR_PROJECTION';
      intentId:
        string;
      txHash:
        Hex;
    }>
  | Readonly<{
      action:
        'RETURN_CONFIRMED';
      intentId:
        string;
      txHash:
        Hex;
    }>;

function normalizedHex(
  value: Hex,
): string {
  return value.toLowerCase();
}

export function decideRelayExecution(
  intent:
    RelayIntentRecord,
): RelayExecutionDecision {
  const derivedTxHash =
    intent.payload
      .derivedTxHash;

  if (
    intent.status ===
      'PREPARED'
  ) {
    if (
      intent.txHash !== null
    ) {
      throw new Error(
        'PREPARED relay intent unexpectedly contains a submitted tx hash.',
      );
    }

    return Object.freeze({
      action:
        'BROADCAST_PREPARED',
      intentId:
        intent.id,
      txHash:
        derivedTxHash,
      serializedTransaction:
        intent.payload
          .serializedTransaction,
    });
  }

  if (
    intent.status ===
      'SUBMITTED'
  ) {
    if (
      intent.txHash === null
    ) {
      throw new Error(
        'SUBMITTED relay intent is missing its tx hash.',
      );
    }

    if (
      normalizedHex(
        intent.txHash,
      ) !==
      normalizedHex(
        derivedTxHash,
      )
    ) {
      throw new Error(
        'Submitted relay tx hash does not match the signed transaction.',
      );
    }

    return Object.freeze({
      action:
        'WAIT_FOR_PROJECTION',
      intentId:
        intent.id,
      txHash:
        intent.txHash,
    });
  }

  if (
    intent.status ===
      'CONFIRMED'
  ) {
    if (
      intent.txHash === null
    ) {
      throw new Error(
        'CONFIRMED relay intent is missing its tx hash.',
      );
    }

    if (
      normalizedHex(
        intent.txHash,
      ) !==
      normalizedHex(
        derivedTxHash,
      )
    ) {
      throw new Error(
        'Confirmed relay tx hash does not match the signed transaction.',
      );
    }

    return Object.freeze({
      action:
        'RETURN_CONFIRMED',
      intentId:
        intent.id,
      txHash:
        intent.txHash,
    });
  }

  throw createDomainError(
    'TRANSACTION_REVERTED',
    'Relay intent reached a terminal failed state.',
    {
      details: {
        intentId:
          intent.id,
      },
    },
  );
}

export function assertRelayIntentBinding(
  intent:
    RelayIntentRecord,
  expected:
    Readonly<{
      resourceId: string;
      routeKey: string;
      idempotencyKey: string;
      requestHash: string;
    }>,
): void {
  const mismatches:
    string[] = [];

  if (
    intent.resourceId !==
    expected.resourceId
  ) {
    mismatches.push(
      'resourceId',
    );
  }

  if (
    intent.routeKey !==
    expected.routeKey
  ) {
    mismatches.push(
      'routeKey',
    );
  }

  if (
    intent.idempotencyKey !==
    expected.idempotencyKey
  ) {
    mismatches.push(
      'idempotencyKey',
    );
  }

  if (
    intent.requestHash !==
    expected.requestHash
  ) {
    mismatches.push(
      'requestHash',
    );
  }

  if (
    mismatches.length !== 0
  ) {
    throw createDomainError(
      'ALREADY_PROCESSED',
      'Relay intent is bound to a different request.',
      {
        details: {
          intentId:
            intent.id,
          mismatches,
        },
      },
    );
  }
}
