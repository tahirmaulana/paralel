import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assertNotaryApprovalSigningWindow,
  normalizeNotarySignerWallet,
  parseNotaryApproval,
  parseNotaryApprovalInit,
} from '../src/lib/notary/approval-security';

const auctionId =
  '11111111-1111-4111-8111-111111111111';

const signature =
  `0x${'11'.repeat(65)}`;

test(
  'normalizes authenticated Notary signer wallet for lowercase database constraint',
  () => {
    assert.equal(
      normalizeNotarySignerWallet(
        '0xAbCdEfabcdefABCDEFabcdefabcdefABCDEFabcd',
      ),
      '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
    );
  },
);

test(
  'rejects malformed authenticated Notary signer wallets',
  () => {
    assert.throws(
      () => normalizeNotarySignerWallet('0xABC'),
      /valid EVM address/i,
    );
  },
);

test(
  'accepts canonical Notary approval init',
  () => {
    assert.deepEqual(
      parseNotaryApprovalInit({
        auctionId,
      }),
      {
        auctionId,
      },
    );
  },
);

test(
  'accepts canonical Notary approval',
  () => {
    assert.deepEqual(
      parseNotaryApproval({
        auctionId,
        signature,
        nonce:
          '7',
        expiry:
          '1794272400',
      }),
      {
        auctionId,
        signature,
        nonce:
          7n,
        expiry:
          1_794_272_400n,
      },
    );
  },
);

test(
  'rejects Notary wallet authority and unknown fields',
  () => {
    assert.throws(
      () =>
        parseNotaryApprovalInit({
          auctionId,
          notaryWallet:
            '0x1111111111111111111111111111111111111111',
        }),
      /unknown fields/i,
    );

    assert.throws(
      () =>
        parseNotaryApproval({
          auctionId,
          notaryWallet:
            '0x1111111111111111111111111111111111111111',
          signature,
          nonce:
            '7',
          expiry:
            '1794272400',
        }),
      /unknown fields/i,
    );
  },
);

test(
  'rejects malformed Notary approval material',
  () => {
    assert.throws(
      () =>
        parseNotaryApproval({
          auctionId:
            'not-a-uuid',
          signature,
          nonce:
            '7',
          expiry:
            '1794272400',
        }),
      /auctionId/i,
    );

    assert.throws(
      () =>
        parseNotaryApproval({
          auctionId,
          signature:
            '0x12',
          nonce:
            '7',
          expiry:
            '1794272400',
        }),
      /65-byte/i,
    );

    assert.throws(
      () =>
        parseNotaryApproval({
          auctionId,
          signature,
          nonce:
            '01',
          expiry:
            '1794272400',
        }),
      /unsigned decimal/i,
    );
  },
);

test(
  'accepts only the active 3600-second Notary signing window',
  () => {
    const now =
      new Date(
        '2026-11-10T00:00:00.000Z',
      );

    const nowSeconds =
      1_794_268_800n;

    assert.doesNotThrow(
      () =>
        assertNotaryApprovalSigningWindow({
          expiry:
            nowSeconds +
            3_600n,
          now,
        }),
    );

    assert.throws(
      () =>
        assertNotaryApprovalSigningWindow({
          expiry:
            nowSeconds -
            1n,
          now,
        }),
      /expired/i,
    );

    assert.throws(
      () =>
        assertNotaryApprovalSigningWindow({
          expiry:
            nowSeconds +
            3_601n,
          now,
        }),
      /3600-second/i,
    );
  },
);

test(
  'derives deterministic 3600-second Notary expiry',
  async () => {
    const {
      deriveNotaryApprovalSigningExpiry,
    } =
      await import(
        '../src/lib/notary/approval-security'
      );

    assert.equal(
      deriveNotaryApprovalSigningExpiry(
        new Date(
          '2026-11-10T00:00:00.999Z',
        ),
      ),
      1_794_272_400n,
    );
  },
);

test(
  'rejects invalid Notary expiry evaluation time',
  async () => {
    const {
      deriveNotaryApprovalSigningExpiry,
    } =
      await import(
        '../src/lib/notary/approval-security'
      );

    assert.throws(
      () =>
        deriveNotaryApprovalSigningExpiry(
          new Date(
            Number.NaN,
          ),
        ),
      /evaluation time/i,
    );
  },
);
