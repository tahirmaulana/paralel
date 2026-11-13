import assert from 'node:assert/strict';
import test from 'node:test';

import {
  hashIdempotencyRequest,
  toTransactionJsonValue,
} from '../src/lib/api/idempotency';

test(
  'produces the same hash for semantically equal object key order',
  () => {
    const first =
      hashIdempotencyRequest({
        routeKey:
          'POST:/api/auction',
        method:
          'POST',
        actorWallet:
          '0x1111111111111111111111111111111111111111',
        body: {
          category:
            'ELEKTRONIK',
          startingBid:
            '100000000',
        },
      });

    const second =
      hashIdempotencyRequest({
        body: {
          startingBid:
            '100000000',
          category:
            'ELEKTRONIK',
        },
        actorWallet:
          '0x1111111111111111111111111111111111111111',
        method:
          'POST',
        routeKey:
          'POST:/api/auction',
      });

    assert.equal(
      first,
      second,
    );

    assert.match(
      first,
      /^[0-9a-f]{64}$/,
    );
  },
);

test(
  'binds the request hash to route actor method and body',
  () => {
    const baseline = {
      routeKey:
        'POST:/api/auction',
      method:
        'POST',
      actorWallet:
        '0x1111111111111111111111111111111111111111',
      body: {
        category:
          'ELEKTRONIK',
      },
    };

    const baselineHash =
      hashIdempotencyRequest(
        baseline,
      );

    assert.notEqual(
      baselineHash,
      hashIdempotencyRequest({
        ...baseline,
        routeKey:
          'POST:/api/user/kyc',
      }),
    );

    assert.notEqual(
      baselineHash,
      hashIdempotencyRequest({
        ...baseline,
        method:
          'PUT',
      }),
    );

    assert.notEqual(
      baselineHash,
      hashIdempotencyRequest({
        ...baseline,
        actorWallet:
          '0x2222222222222222222222222222222222222222',
      }),
    );

    assert.notEqual(
      baselineHash,
      hashIdempotencyRequest({
        ...baseline,
        body: {
          category:
            'PROPERTI',
        },
      }),
    );
  },
);

test(
  'preserves array order in the request hash',
  () => {
    const first =
      hashIdempotencyRequest({
        files: [
          'photo1',
          'photo2',
        ],
      });

    const second =
      hashIdempotencyRequest({
        files: [
          'photo2',
          'photo1',
        ],
      });

    assert.notEqual(
      first,
      second,
    );
  },
);

test(
  'serializes Date values deterministically',
  () => {
    assert.deepEqual(
      toTransactionJsonValue({
        createdAt:
          new Date(
            '2026-11-09T00:00:00.000Z',
          ),
      }),
      {
        createdAt:
          '2026-11-09T00:00:00.000Z',
      },
    );
  },
);

test(
  'rejects unsupported and non-finite JSON values',
  () => {
    assert.throws(
      () =>
        toTransactionJsonValue({
          amount:
            1n,
        }),
      /unsupported JSON value/i,
    );

    assert.throws(
      () =>
        toTransactionJsonValue({
          amount:
            Number.NaN,
        }),
      /non-finite number/i,
    );

    assert.throws(
      () =>
        toTransactionJsonValue({
          amount:
            Number.POSITIVE_INFINITY,
        }),
      /non-finite number/i,
    );
  },
);

test(
  'rejects circular request bodies',
  () => {
    const circular:
      Record<string, unknown> = {};

    circular.self =
      circular;

    assert.throws(
      () =>
        hashIdempotencyRequest(
          circular,
        ),
      /circular JSON value/i,
    );
  },
);

test(
  'binds normalized Date values into the request hash',
  () => {
    const first =
      hashIdempotencyRequest({
        scheduledAt:
          new Date(
            '2026-11-09T00:00:00.000Z',
          ),
      });

    const equivalent =
      hashIdempotencyRequest({
        scheduledAt:
          '2026-11-09T00:00:00.000Z',
      });

    const different =
      hashIdempotencyRequest({
        scheduledAt:
          new Date(
            '2026-11-10T00:00:00.000Z',
          ),
      });

    assert.equal(
      first,
      equivalent,
    );

    assert.notEqual(
      first,
      different,
    );
  },
);

test(
  'replays completed and failed responses for the same request',
  async () => {
    const {
      decideExistingIdempotency,
    } =
      await import(
        '../src/lib/api/idempotency'
      );

    const now =
      new Date(
        '2026-11-09T00:01:00.000Z',
      );

    for (
      const status
      of [
        'COMPLETED',
        'FAILED',
      ] as const
    ) {
      const decision =
        decideExistingIdempotency(
          {
            requestHash:
              'same-hash',
            status,
            responseStatus:
              status ===
                'COMPLETED'
                ? 201
                : 409,
            responseBody: {
              result:
                status,
            },
            lockedAt:
              new Date(
                '2026-11-09T00:00:00.000Z',
              ),
          },
          {
            requestHash:
              'same-hash',
            correlationId:
              'correlation-replay',
            routeKey:
              'POST:/api/auction',
            now,
          },
        );

      assert.equal(
        decision.kind,
        'REPLAY',
      );

      if (
        decision.kind ===
          'REPLAY'
      ) {
        assert.equal(
          decision.responseStatus,
          status ===
            'COMPLETED'
            ? 201
            : 409,
        );
      }
    }
  },
);

test(
  'rejects the same key with a different request hash',
  async () => {
    const {
      decideExistingIdempotency,
    } =
      await import(
        '../src/lib/api/idempotency'
      );

    assert.throws(
      () =>
        decideExistingIdempotency(
          {
            requestHash:
              'first-hash',
            status:
              'COMPLETED',
            responseStatus:
              201,
            responseBody: {
              ok: true,
            },
            lockedAt:
              new Date(
                '2026-11-09T00:00:00.000Z',
              ),
          },
          {
            requestHash:
              'different-hash',
            correlationId:
              'correlation-conflict',
            routeKey:
              'POST:/api/auction',
            now:
              new Date(
                '2026-11-09T00:01:00.000Z',
              ),
          },
        ),
      /different request/i,
    );
  },
);

test(
  'blocks active processing and reacquires only a stale lock',
  async () => {
    const {
      decideExistingIdempotency,
    } =
      await import(
        '../src/lib/api/idempotency'
      );

    const base = {
      requestHash:
        'same-hash',
      status:
        'PROCESSING' as const,
      responseStatus:
        null,
      responseBody:
        null,
    };

    assert.throws(
      () =>
        decideExistingIdempotency(
          {
            ...base,
            lockedAt:
              new Date(
                '2026-11-09T00:00:00.000Z',
              ),
          },
          {
            requestHash:
              'same-hash',
            correlationId:
              'correlation-processing',
            routeKey:
              'POST:/api/auction',
            now:
              new Date(
                '2026-11-09T00:04:59.999Z',
              ),
          },
        ),
      /already processing/i,
    );

    assert.deepEqual(
      decideExistingIdempotency(
        {
          ...base,
          lockedAt:
            new Date(
              '2026-11-09T00:00:00.000Z',
            ),
        },
        {
          requestHash:
            'same-hash',
          correlationId:
            'correlation-reacquire',
          routeKey:
            'POST:/api/auction',
          now:
            new Date(
              '2026-11-09T00:05:00.000Z',
            ),
        },
      ),
      {
        kind:
          'REACQUIRE',
      },
    );
  },
);
