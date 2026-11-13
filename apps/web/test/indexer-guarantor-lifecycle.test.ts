import assert from 'node:assert/strict';
import test from 'node:test';

import {
  hasExactLifecycleRelayBinding,
  parseGuarantorLifecycleProjection,
} from '../../../workers/indexer/src/guarantor-lifecycle';

const auctionKey =
  `0x${'11'.repeat(32)}`;

const txHash =
  `0x${'22'.repeat(32)}`;

test(
  'parses canonical Collected projection',
  () => {
    assert.deepEqual(
      parseGuarantorLifecycleProjection({
        eventName:
          'Collected',
        args: {
          auctionKey,
          roundNo:
            2n,
        },
        txHash,
        blockTs:
          new Date(
            '2026-11-10T01:00:00.000Z',
          ),
      }),
      {
        operation:
          'MARK_COLLECTED',
        eventName:
          'Collected',
        roundNo:
          2,
        txHash,
        blockTs:
          new Date(
            '2026-11-10T01:00:00.000Z',
          ),
        attestationType:
          'GUARANTOR_COLLECTED',
        targetStatus:
          'CLAIM_PERIOD',
      },
    );
  },
);

test(
  'parses canonical WithdrawnItem projection',
  () => {
    const projection =
      parseGuarantorLifecycleProjection({
        eventName:
          'WithdrawnItem',
        args: {
          auctionKey,
          roundNo:
            3,
        },
        txHash,
        blockTs:
          new Date(
            '2026-11-10T01:00:00.000Z',
          ),
      });

    assert.equal(
      projection.operation,
      'MARK_WITHDRAWN',
    );

    assert.equal(
      projection.targetStatus,
      'WITHDRAWN',
    );
  },
);

test(
  'accepts exact PREPARED lifecycle tx binding',
  () => {
    assert.equal(
      hasExactLifecycleRelayBinding({
        expectedOperation:
          'MARK_COLLECTED',
        relayStatus:
          'PREPARED',
        durableDerivedTxHash:
          txHash,
        durableTxHash:
          null,
        eventTxHash:
          txHash,
      }),
      true,
    );
  },
);

test(
  'rejects lifecycle tx drift and terminal failure',
  () => {
    assert.equal(
      hasExactLifecycleRelayBinding({
        expectedOperation:
          'MARK_COLLECTED',
        relayStatus:
          'SUBMITTED',
        durableDerivedTxHash:
          txHash,
        durableTxHash:
          `0x${'33'.repeat(32)}`,
        eventTxHash:
          txHash,
      }),
      false,
    );

    assert.equal(
      hasExactLifecycleRelayBinding({
        expectedOperation:
          'MARK_COLLECTED',
        relayStatus:
          'FAILED',
        durableDerivedTxHash:
          txHash,
        durableTxHash:
          null,
        eventTxHash:
          txHash,
      }),
      false,
    );
  },
);

test(
  'rejects malformed lifecycle evidence',
  () => {
    assert.throws(
      () =>
        parseGuarantorLifecycleProjection({
          eventName:
            'Collected',
          args: {
            auctionKey:
              '0x12',
            roundNo:
              1,
          },
          txHash,
          blockTs:
            new Date(),
        }),
      /auctionKey/i,
    );

    assert.throws(
      () =>
        parseGuarantorLifecycleProjection({
          eventName:
            'Unsupported',
          args: {
            auctionKey,
            roundNo:
              1,
          },
          txHash,
          blockTs:
            new Date(),
        }),
      /unsupported/i,
    );
  },
);
