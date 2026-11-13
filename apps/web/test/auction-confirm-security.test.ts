import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assertConfirmSigningWindow,
  parseConfirmAuctionInput,
} from '../src/lib/auction/confirm-security';

const signature =
  `0x${'11'.repeat(65)}`;

test(
  'accepts canonical confirm input',
  () => {
    const input =
      parseConfirmAuctionInput({
        signature,
        nonce:
          '7',
        expiry:
          '1794233100',
      });

    assert.equal(
      input.signature,
      signature,
    );

    assert.equal(
      input.nonce,
      7n,
    );

    assert.equal(
      input.expiry,
      1_794_233_100n,
    );
  },
);

test(
  'rejects wallet authority and unknown fields',
  () => {
    assert.throws(
      () =>
        parseConfirmAuctionInput({
          wallet:
            '0x1111111111111111111111111111111111111111',
          signature,
          nonce:
            '7',
          expiry:
            '1794233100',
        }),
      /unknown fields/i,
    );
  },
);

test(
  'rejects malformed signatures',
  () => {
    for (
      const invalid
      of [
        '',
        '0x12',
        `0x${'zz'.repeat(65)}`,
      ]
    ) {
      assert.throws(
        () =>
          parseConfirmAuctionInput({
            signature:
              invalid,
            nonce:
              '0',
            expiry:
              '1',
          }),
        /65-byte hexadecimal/i,
      );
    }
  },
);

test(
  'rejects malformed nonce and expiry values',
  () => {
    for (
      const invalid
      of [
        -1,
        '-1',
        '01',
        '1.5',
        1,
      ]
    ) {
      assert.throws(
        () =>
          parseConfirmAuctionInput({
            signature,
            nonce:
              invalid,
            expiry:
              '1794233100',
          }),
        /unsigned decimal/i,
      );
    }
  },
);

test(
  'accepts only the active 300-second signing window',
  () => {
    const now =
      new Date(
        '2026-11-09T14:00:00.000Z',
      );

    assert.doesNotThrow(
      () =>
        assertConfirmSigningWindow({
          expiry:
            1_794_233_100n,
          now,
        }),
    );

    assert.throws(
      () =>
        assertConfirmSigningWindow({
          expiry:
            1_794_232_799n,
          now,
        }),
      /expired/i,
    );

    assert.throws(
      () =>
        assertConfirmSigningWindow({
          expiry:
            1_794_233_101n,
          now,
        }),
      /exceeds/i,
    );
  },
);
