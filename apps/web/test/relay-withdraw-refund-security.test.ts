import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assertWithdrawRefundSigningWindow,
  parseWithdrawRefund,
} from '../src/lib/relay/withdraw-refund-security';

const auctionKey =
  `0x${'11'.repeat(32)}`;

const signature =
  `0x${'22'.repeat(65)}`;

test(
  'accepts canonical authenticated refund request',
  () => {
    assert.deepEqual(
      parseWithdrawRefund({
        auctionKey,
        roundNo:
          2,
        nonce:
          '7',
        expiry:
          '1794272400',
        signature,
      }),
      {
        auctionKey,
        roundNo:
          2,
        nonce:
          7n,
        expiry:
          1_794_272_400n,
        signature,
      },
    );
  },
);

test(
  'rejects bidder authority in the request body',
  () => {
    assert.throws(
      () =>
        parseWithdrawRefund({
          auctionKey,
          roundNo:
            2,
          bidder:
            '0x3333333333333333333333333333333333333333',
          nonce:
            '7',
          expiry:
            '1794272400',
          signature,
        }),
      /unknown fields/i,
    );
  },
);

test(
  'rejects malformed refund signing material',
  () => {
    assert.throws(
      () =>
        parseWithdrawRefund({
          auctionKey:
            '0x12',
          roundNo:
            2,
          nonce:
            '7',
          expiry:
            '1794272400',
          signature,
        }),
      /32-byte/i,
    );

    assert.throws(
      () =>
        parseWithdrawRefund({
          auctionKey,
          roundNo:
            0,
          nonce:
            '7',
          expiry:
            '1794272400',
          signature,
        }),
      /roundNo/i,
    );
  },
);

test(
  'accepts only the active 3600-second refund signing window',
  () => {
    assert.doesNotThrow(
      () =>
        assertWithdrawRefundSigningWindow({
          blockTimestamp:
            1_794_272_000n,
          expiry:
            1_794_275_600n,
        }),
    );

    assert.throws(
      () =>
        assertWithdrawRefundSigningWindow({
          blockTimestamp:
            1_794_272_000n,
          expiry:
            1_794_272_000n,
        }),
      /expired/i,
    );

    assert.throws(
      () =>
        assertWithdrawRefundSigningWindow({
          blockTimestamp:
            1_794_272_000n,
          expiry:
            1_794_275_601n,
        }),
      /3600-second/i,
    );
  },
);
