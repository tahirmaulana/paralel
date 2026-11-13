import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assertCheckpointAdvance,
  assertCheckpointCanonical,
} from '../src/checkpoint';

const first =
  {
    chainId:
      421_614,
    blockNumber:
      100n,
    blockHash:
      `0x${'11'.repeat(32)}`,
  } as const;

test(
  'accepts matching checkpoint evidence',
  () => {
    assert.doesNotThrow(
      () =>
        assertCheckpointCanonical(
          first,
          first,
        ),
    );
  },
);

test(
  'rejects checkpoint hash drift',
  () => {
    assert.throws(
      () =>
        assertCheckpointCanonical(
          first,
          {
            ...first,
            blockHash:
              `0x${'22'.repeat(32)}`,
          },
        ),
      /REORG_DETECTED/i,
    );
  },
);

test(
  'rejects checkpoint regression',
  () => {
    assert.throws(
      () =>
        assertCheckpointAdvance(
          first,
          {
            ...first,
            blockNumber:
              99n,
          },
        ),
      /cannot move backward/i,
    );
  },
);

test(
  'accepts the first RPC-verified checkpoint',
  () => {
    assert.doesNotThrow(
      () =>
        assertCheckpointAdvance(
          null,
          {
            chainId:
              421_614,
            blockNumber:
              327_906_837n,
            blockHash:
              `0x${'33'.repeat(32)}`,
          },
        ),
    );
  },
);

test(
  'allows a forward checkpoint on the same chain',
  () => {
    assert.doesNotThrow(
      () =>
        assertCheckpointAdvance(
          first,
          {
            ...first,
            blockNumber:
              101n,
            blockHash:
              `0x${'44'.repeat(32)}`,
          },
        ),
    );
  },
);

test(
  'rejects a checkpoint on another chain',
  () => {
    assert.throws(
      () =>
        assertCheckpointAdvance(
          first,
          {
            ...first,
            chainId:
              1,
            blockNumber:
              101n,
          },
        ),
      /across chains/i,
    );
  },
);
