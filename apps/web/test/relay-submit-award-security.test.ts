import assert from 'node:assert/strict';
import test from 'node:test';

import {
  parseSubmitAward,
} from '../src/lib/relay/submit-award-security';

const auctionKey =
  `0x${'11'.repeat(32)}`;

const signature =
  `0x${'22'.repeat(65)}`;

test(
  'accepts canonical AwardSign relay input',
  () => {
    assert.deepEqual(
      parseSubmitAward({
        auctionKey,
        roundNo:
          2,
        rank:
          0,
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
        rank:
          0,
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
  'normalizes canonical decimal AwardSign fields',
  () => {
    const input =
      parseSubmitAward({
        auctionKey:
          auctionKey.toUpperCase()
            .replace(
              '0X',
              '0x',
            ),
        roundNo:
          '2',
        rank:
          '9',
        nonce:
          '0',
        expiry:
          '1794272400',
        signature,
      });

    assert.equal(
      input.auctionKey,
      auctionKey,
    );

    assert.equal(
      input.roundNo,
      2,
    );

    assert.equal(
      input.rank,
      9,
    );
  },
);

test(
  'rejects body candidate authority and unknown fields',
  () => {
    assert.throws(
      () =>
        parseSubmitAward({
          auctionKey,
          roundNo:
            2,
          rank:
            0,
          nonce:
            '7',
          expiry:
            '1794272400',
          signature,
          candidate:
            '0x3333333333333333333333333333333333333333',
        }),
      /unknown fields/i,
    );
  },
);

test(
  'rejects malformed AwardSign bytes',
  () => {
    assert.throws(
      () =>
        parseSubmitAward({
          auctionKey:
            '0x12',
          roundNo:
            2,
          rank:
            0,
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
        parseSubmitAward({
          auctionKey,
          roundNo:
            2,
          rank:
            0,
          nonce:
            '7',
          expiry:
            '1794272400',
          signature:
            '0x12',
        }),
      /65-byte/i,
    );
  },
);

test(
  'rejects invalid AwardSign round rank nonce and expiry',
  () => {
    assert.throws(
      () =>
        parseSubmitAward({
          auctionKey,
          roundNo:
            0,
          rank:
            0,
          nonce:
            '7',
          expiry:
            '1794272400',
          signature,
        }),
      /roundNo/i,
    );

    assert.throws(
      () =>
        parseSubmitAward({
          auctionKey,
          roundNo:
            2,
          rank:
            10,
          nonce:
            '7',
          expiry:
            '1794272400',
          signature,
        }),
      /rank/i,
    );

    assert.throws(
      () =>
        parseSubmitAward({
          auctionKey,
          roundNo:
            2,
          rank:
            0,
          nonce:
            '07',
          expiry:
            '1794272400',
          signature,
        }),
      /unsigned decimal/i,
    );

    assert.throws(
      () =>
        parseSubmitAward({
          auctionKey,
          roundNo:
            2,
          rank:
            0,
          nonce:
            '7',
          expiry:
            '0',
          signature,
        }),
      /greater than zero/i,
    );
  },
);

test(
  'accepts the active AwardSign signature and candidate windows',
  async () => {
    const {
      assertSubmitAwardSigningWindow,
    } =
      await import(
        '../src/lib/relay/submit-award-security'
      );

    assert.doesNotThrow(
      () =>
        assertSubmitAwardSigningWindow({
          blockTimestamp:
            1_794_272_000n,
          expiry:
            1_794_275_600n,
          awardingDeadline:
            1_794_272_300n,
        }),
    );
  },
);

test(
  'rejects expired or overlong AwardSign signature expiry',
  async () => {
    const {
      assertSubmitAwardSigningWindow,
    } =
      await import(
        '../src/lib/relay/submit-award-security'
      );

    assert.throws(
      () =>
        assertSubmitAwardSigningWindow({
          blockTimestamp:
            1_794_272_000n,
          expiry:
            1_794_272_000n,
          awardingDeadline:
            1_794_272_300n,
        }),
      /signature has expired/i,
    );

    assert.throws(
      () =>
        assertSubmitAwardSigningWindow({
          blockTimestamp:
            1_794_272_000n,
          expiry:
            1_794_275_601n,
          awardingDeadline:
            1_794_272_300n,
        }),
      /3600-second/i,
    );
  },
);

test(
  'rejects an expired contract candidate deadline',
  async () => {
    const {
      assertSubmitAwardSigningWindow,
    } =
      await import(
        '../src/lib/relay/submit-award-security'
      );

    assert.throws(
      () =>
        assertSubmitAwardSigningWindow({
          blockTimestamp:
            1_794_272_301n,
          expiry:
            1_794_275_600n,
          awardingDeadline:
            1_794_272_300n,
        }),
      /candidate deadline has passed/i,
    );
  },
);
