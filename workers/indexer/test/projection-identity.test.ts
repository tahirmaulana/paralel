import assert from 'node:assert/strict';
import test from 'node:test';

import {
  attributeFeeCredits,
} from '../src/fee-attribution';

import type {
  CanonicalTransactionGroup,
} from '../src/event-ordering';

const transaction:
  CanonicalTransactionGroup =
  Object.freeze({
    chainId:
      421_614,
    blockNumber:
      326_878_088n,
    blockHash:
      `0x${'11'.repeat(32)}`,
    transactionIndex:
      5,
    txHash:
      `0x${'22'.repeat(32)}`,
    events:
      Object.freeze([
        Object.freeze({
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
          txHash:
            `0x${'22'.repeat(32)}`,
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
        }),
        Object.freeze({
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
          txHash:
            `0x${'22'.repeat(32)}`,
          logIndex:
            47,
          eventName:
            'Defaulted',
          args: {
            auctionKey:
              `0x${'33'.repeat(32)}`,
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
        }),
      ]),
  });

test(
  'preserves exact FeeCredited transaction-log identity',
  () => {
    const credits =
      attributeFeeCredits(
        transaction,
      );

    assert.equal(
      credits.length,
      1,
    );

    assert.equal(
      credits[0]
        ?.txHash,
      transaction.txHash,
    );

    assert.equal(
      credits[0]
        ?.logIndex,
      44,
    );

    assert.equal(
      credits[0]
        ?.amount,
      52_500n,
    );
  },
);

test(
  'produces stable FeeCredited evidence on replay',
  () => {
    assert.deepEqual(
      attributeFeeCredits(
        transaction,
      ),
      attributeFeeCredits(
        transaction,
      ),
    );
  },
);
