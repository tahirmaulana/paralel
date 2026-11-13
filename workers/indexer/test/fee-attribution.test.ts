import assert from 'node:assert/strict';
import test from 'node:test';

import {
  attributeFeeCredits,
} from '../src/fee-attribution';

import type {
  CanonicalTransactionGroup,
} from '../src/event-ordering';

const txHash =
  `0x${'aa'.repeat(32)}`;

const group:
  CanonicalTransactionGroup =
  {
    chainId:
      421_614,
    blockNumber:
      326_878_088n,
    blockHash:
      `0x${'11'.repeat(32)}`,
    transactionIndex:
      5,
    txHash,
    events: [
      {
        id:
          17,
        chainId:
          421_614,
        contractAddress:
          '0x80db02bfb4d0163a2dbd7f096178bf7ae5a66d2c',
        blockNumber:
          326_878_088n,
        blockHash:
          `0x${'11'.repeat(32)}`,
        blockTs:
          new Date(
            '2026-11-07T08:02:00.000Z',
          ),
        transactionIndex:
          5,
        txHash,
        logIndex:
          44,
        eventName:
          'FeeCredited',
        args: {
          recipient:
            '0x5472CA834B67De0E54833e6F779725B4E77CA893',
          amount:
            '52500',
        },
        canonical:
          true,
        projectionVersion:
          1,
        processed:
          false,
        processingError:
          null,
      },
      {
        id:
          20,
        chainId:
          421_614,
        contractAddress:
          '0x80db02bfb4d0163a2dbd7f096178bf7ae5a66d2c',
        blockNumber:
          326_878_088n,
        blockHash:
          `0x${'11'.repeat(32)}`,
        blockTs:
          new Date(
            '2026-11-07T08:02:00.000Z',
          ),
        transactionIndex:
          5,
        txHash,
        logIndex:
          47,
        eventName:
          'Defaulted',
        args: {
          auctionKey:
            `0x${'22'.repeat(32)}`,
          roundNo:
            1,
          candidate:
            '0x1111111111111111111111111111111111111111',
          defaultFee:
            '105000',
        },
        canonical:
          true,
        projectionVersion:
          1,
        processed:
          false,
        processingError:
          null,
      },
    ],
  };

test(
  'attributes FeeCredited from same transaction auction context',
  () => {
    assert.deepEqual(
      attributeFeeCredits(
        group,
      ),
      [
        {
          auctionKey:
            `0x${'22'.repeat(32)}`,
          roundNo:
            1,
          recipient:
            '0x5472ca834b67de0e54833e6f779725b4e77ca893',
          amount:
            52_500n,
          txHash,
          logIndex:
            44,
        },
      ],
    );
  },
);
