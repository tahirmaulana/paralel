import assert from 'node:assert/strict';
import test from 'node:test';

import {
  groupCanonicalTransactions,
  type CanonicalChainEvent,
} from '../src/event-ordering';

function event(
  input:
    Partial<
      CanonicalChainEvent
    > &
    Pick<
      CanonicalChainEvent,
      | 'id'
      | 'blockNumber'
      | 'transactionIndex'
      | 'txHash'
      | 'logIndex'
      | 'eventName'
    >,
): CanonicalChainEvent {
  return {
    chainId:
      421_614,
    contractAddress:
      '0x80db02bfb4d0163a2dbd7f096178bf7ae5a66d2c',
    blockHash:
      `0x${'11'.repeat(32)}`,
    blockTs:
      new Date(
        '2026-11-07T08:02:00.000Z',
      ),
    args:
      {},
    canonical:
      true,
    projectionVersion:
      1,
    processed:
      false,
    processingError:
      null,
    ...input,
  };
}

test(
  'orders canonical events by block transaction and log',
  () => {
    const txA =
      `0x${'aa'.repeat(32)}`;

    const txB =
      `0x${'bb'.repeat(32)}`;

    const groups =
      groupCanonicalTransactions([
        event({
          id:
            3,
          blockNumber:
            10n,
          transactionIndex:
            2,
          txHash:
            txB,
          logIndex:
            1,
          eventName:
            'AwardingStarted',
        }),
        event({
          id:
            1,
          blockNumber:
            10n,
          transactionIndex:
            1,
          txHash:
            txA,
          logIndex:
            2,
          eventName:
            'Second',
        }),
        event({
          id:
            2,
          blockNumber:
            10n,
          transactionIndex:
            1,
          txHash:
            txA,
          logIndex:
            1,
          eventName:
            'First',
        }),
      ]);

    assert.equal(
      groups.length,
      2,
    );

    assert.deepEqual(
      groups[0]
        ?.events
        .map(
          (value) =>
            value.eventName,
        ),
      [
        'First',
        'Second',
      ],
    );

    assert.equal(
      groups[1]
        ?.txHash,
      txB,
    );
  },
);

test(
  'ignores non-canonical events',
  () => {
    const groups =
      groupCanonicalTransactions([
        event({
          id:
            1,
          blockNumber:
            10n,
          transactionIndex:
            1,
          txHash:
            `0x${'aa'.repeat(32)}`,
          logIndex:
            1,
          eventName:
            'Removed',
          canonical:
            false,
        }),
      ]);

    assert.equal(
      groups.length,
      0,
    );
  },
);
