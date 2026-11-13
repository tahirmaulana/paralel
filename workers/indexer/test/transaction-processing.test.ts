import assert from 'node:assert/strict';
import test from 'node:test';

import {
  groupCanonicalTransactions,
  type CanonicalChainEvent,
} from '../src/event-ordering';

function event(
  input:
    Readonly<{
      id:
        number;
      blockNumber?:
        bigint;
      transactionIndex:
        number;
      txHash:
        `0x${string}`;
      logIndex:
        number;
      eventName:
        string;
    }>,
): CanonicalChainEvent {
  return Object.freeze({
    id:
      input.id,
    chainId:
      421_614,
    contractAddress:
      '0x80db02bfb4d0163a2dbd7f096178bf7ae5a66d2c',
    blockNumber:
      input.blockNumber ??
        326_878_088n,
    blockHash:
      `0x${'11'.repeat(32)}`,
    blockTs:
      new Date(
        '2026-11-07T08:02:00.000Z',
      ),
    transactionIndex:
      input.transactionIndex,
    txHash:
      input.txHash,
    logIndex:
      input.logIndex,
    eventName:
      input.eventName,
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
  });
}

test(
  'keeps all events from one blockchain transaction in one group',
  () => {
    const txHash =
      `0x${'aa'.repeat(32)}`;

    const groups =
      groupCanonicalTransactions([
        event({
          id:
            21,
          transactionIndex:
            5,
          txHash,
          logIndex:
            48,
          eventName:
            'PassedIn',
        }),
        event({
          id:
            17,
          transactionIndex:
            5,
          txHash,
          logIndex:
            44,
          eventName:
            'FeeCredited',
        }),
        event({
          id:
            20,
          transactionIndex:
            5,
          txHash,
          logIndex:
            47,
          eventName:
            'Defaulted',
        }),
      ]);

    assert.equal(
      groups.length,
      1,
    );

    assert.deepEqual(
      groups[0]
        ?.events
        .map(
          (
            item,
          ) =>
            item.logIndex,
        ),
      [
        44,
        47,
        48,
      ],
    );
  },
);

test(
  'separates different transactions in the same block',
  () => {
    const groups =
      groupCanonicalTransactions([
        event({
          id:
            1,
          transactionIndex:
            3,
          txHash:
            `0x${'bb'.repeat(32)}`,
          logIndex:
            0,
          eventName:
            'Second',
        }),
        event({
          id:
            2,
          transactionIndex:
            2,
          txHash:
            `0x${'aa'.repeat(32)}`,
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

    assert.equal(
      groups[0]
        ?.transactionIndex,
      2,
    );

    assert.equal(
      groups[1]
        ?.transactionIndex,
      3,
    );
  },
);
