import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createRelayRequestOptions,
} from '../src/lib/api/relay-client';

test(
  'creates an idempotent relay POST request',
  () => {
    const body =
      '{"auctionKey":"0x1234"}';
    const key =
      'b6f7a543-9428-40cb-91c3-827b8a10ab2f';
    const options =
      createRelayRequestOptions(
        body,
        key,
      );
    const headers =
      new Headers(options.headers);

    assert.equal(
      options.method,
      'POST',
    );
    assert.equal(
      options.body,
      body,
    );
    assert.equal(
      headers.get('content-type'),
      'application/json',
    );
    assert.equal(
      headers.get('idempotency-key'),
      key,
    );
  },
);

test(
  'rejects malformed relay idempotency keys',
  () => {
    assert.throws(
      () =>
        createRelayRequestOptions(
          '{}',
          'short',
        ),
      /idempotency key/i,
    );
  },
);
