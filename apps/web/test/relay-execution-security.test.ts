import assert from 'node:assert/strict';
import test from 'node:test';

import type {
  Hex,
} from 'viem';

import {
  decideRelayExecution,
} from '../src/lib/api/relay-execution';

import type {
  RelayIntentRecord,
} from '../src/lib/api/relay-intent';

const txHash =
  `0x${'11'.repeat(32)}` as Hex;

const serializedTransaction =
  '0x02abcdef' as Hex;

function intent(
  status:
    RelayIntentRecord['status'],
  storedTxHash:
    Hex | null,
): RelayIntentRecord {
  const payload:
    RelayIntentRecord['payload'] =
      Object.freeze({
        version:
          1,
        operation:
          'REGISTER_AUCTION',
        auctionCode:
          'JKT-ELK-261109-0001',
        serializedTransaction,
        derivedTxHash:
          txHash,
        registerAuction: {
          auctionKey:
            `0x${'22'.repeat(32)}`,
        },
      });

  return Object.freeze({
    id:
      '11111111-1111-4111-8111-111111111111',
    resourceId:
      '22222222-2222-4222-8222-222222222222',
    routeKey:
      'POST:/api/auction/JKT-ELK-261109-0001/confirm',
    idempotencyKey:
      'confirm-request-0001',
    requestHash:
      'a'.repeat(64),
    payload,
    status,
    txHash:
      storedTxHash,
    attemptCount:
      0,
    preparedAt:
      new Date(
        '2026-11-09T14:00:00.000Z',
      ),
    submittedAt:
      status === 'SUBMITTED' ||
      status === 'CONFIRMED'
        ? new Date(
            '2026-11-09T14:00:01.000Z',
          )
        : null,
    confirmedAt:
      status === 'CONFIRMED'
        ? new Date(
            '2026-11-09T14:00:02.000Z',
          )
        : null,
    failedAt:
      status === 'FAILED'
        ? new Date(
            '2026-11-09T14:00:01.000Z',
          )
        : null,
  });
}

test(
  'broadcasts an exact PREPARED signed transaction',
  () => {
    const decision =
      decideRelayExecution(
        intent(
          'PREPARED',
          null,
        ),
      );

    assert.equal(
      decision.action,
      'BROADCAST_PREPARED',
    );

    if (
      decision.action !==
      'BROADCAST_PREPARED'
    ) {
      assert.fail(
        'Unexpected decision.',
      );
    }

    assert.equal(
      decision.txHash,
      txHash,
    );

    assert.equal(
      decision.serializedTransaction,
      serializedTransaction,
    );
  },
);

test(
  'waits for projection after submission',
  () => {
    assert.deepEqual(
      decideRelayExecution(
        intent(
          'SUBMITTED',
          txHash,
        ),
      ).action,
      'WAIT_FOR_PROJECTION',
    );
  },
);

test(
  'returns a confirmed durable relay',
  () => {
    assert.deepEqual(
      decideRelayExecution(
        intent(
          'CONFIRMED',
          txHash,
        ),
      ).action,
      'RETURN_CONFIRMED',
    );
  },
);

test(
  'rejects submitted tx-hash drift',
  () => {
    assert.throws(
      () =>
        decideRelayExecution(
          intent(
            'SUBMITTED',
            `0x${'33'.repeat(32)}`,
          ),
        ),
      /does not match/i,
    );
  },
);

test(
  'rejects terminal failed relay intent',
  () => {
    assert.throws(
      () =>
        decideRelayExecution(
          intent(
            'FAILED',
            null,
          ),
        ),
      /terminal failed state/i,
    );
  },
);

test(
  'accepts the exact durable request binding',
  async () => {
    const {
      assertRelayIntentBinding,
    } =
      await import(
        '../src/lib/api/relay-execution'
      );

    const relayIntent =
      intent(
        'PREPARED',
        null,
      );

    assert.doesNotThrow(
      () =>
        assertRelayIntentBinding(
          relayIntent,
          {
            resourceId:
              relayIntent.resourceId,
            routeKey:
              relayIntent.routeKey,
            idempotencyKey:
              relayIntent
                .idempotencyKey,
            requestHash:
              relayIntent
                .requestHash,
          },
        ),
    );
  },
);

test(
  'rejects relay intent reuse by a different request',
  async () => {
    const {
      assertRelayIntentBinding,
    } =
      await import(
        '../src/lib/api/relay-execution'
      );

    const relayIntent =
      intent(
        'PREPARED',
        null,
      );

    assert.throws(
      () =>
        assertRelayIntentBinding(
          relayIntent,
          {
            resourceId:
              relayIntent.resourceId,
            routeKey:
              relayIntent.routeKey,
            idempotencyKey:
              'different-request-key',
            requestHash:
              'b'.repeat(64),
          },
        ),
      /different request/i,
    );
  },
);
