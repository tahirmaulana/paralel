import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createMutationHeaders,
} from '../src/lib/api/client-mutation';
import {
  requireIdempotencyKey,
} from '../src/lib/api/request-context';

test(
  'creates JSON mutation headers with a valid idempotency key',
  () => {
    const headers =
      new Headers(
        createMutationHeaders(
          'notary-approve',
        ),
      );

    assert.equal(
      headers.get('Content-Type'),
      'application/json',
    );
    assert.match(
      headers.get('Idempotency-Key') ?? '',
      /^notary-approve:[0-9a-f-]{36}$/i,
    );
    assert.equal(
      requireIdempotencyKey(
        new Request(
          'https://paralel.test/api/notary/approve',
          { headers },
        ),
        'correlation-id',
      ),
      headers.get('Idempotency-Key'),
    );
  },
);
