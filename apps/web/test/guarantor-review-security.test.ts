import assert from 'node:assert/strict';
import test from 'node:test';

import {
  deriveGuarantorReviewSigningExpiry,
  assertGuarantorReviewSigningWindow,
  parseGuarantorApproval,
  parseGuarantorRejection,
} from '../src/lib/guarantor/review-security';

const auctionId =
  '11111111-1111-4111-8111-111111111111';

const signature =
  `0x${'11'.repeat(65)}`;

test(
  'accepts canonical Guarantor approval',
  () => {
    const input =
      parseGuarantorApproval({
        auctionId,
        signature,
        nonce:
          '7',
        expiry:
          '1794269100',
      });

    assert.equal(
      input.auctionId,
      auctionId,
    );

    assert.equal(
      input.nonce,
      7n,
    );
  },
);

test(
  'accepts and normalizes canonical Guarantor rejection',
  () => {
    const input =
      parseGuarantorRejection({
        auctionId,
        signature,
        nonce:
          '8',
        expiry:
          '1794269100',
        reason:
          '  Asset documentation is incomplete.  ',
      });

    assert.equal(
      input.reason,
      'Asset documentation is incomplete.',
    );
  },
);

test(
  'rejects body wallet authority',
  () => {
    assert.throws(
      () =>
        parseGuarantorApproval({
          auctionId,
          guarantorWallet:
            '0x1111111111111111111111111111111111111111',
          signature,
          nonce:
            '7',
          expiry:
            '1794269100',
        }),
      /unknown fields/i,
    );
  },
);

test(
  'rejects malformed signed review values',
  () => {
    assert.throws(
      () =>
        parseGuarantorApproval({
          auctionId:
            'not-a-uuid',
          signature,
          nonce:
            '7',
          expiry:
            '1794269100',
        }),
      /auctionId/i,
    );

    assert.throws(
      () =>
        parseGuarantorApproval({
          auctionId,
          signature:
            '0x12',
          nonce:
            '7',
          expiry:
            '1794269100',
        }),
      /65-byte/i,
    );

    assert.throws(
      () =>
        parseGuarantorApproval({
          auctionId,
          signature,
          nonce:
            '01',
          expiry:
            '1794269100',
        }),
      /unsigned decimal/i,
    );
  },
);

test(
  'requires a bounded rejection reason',
  () => {
    assert.throws(
      () =>
        parseGuarantorRejection({
          auctionId,
          signature,
          nonce:
            '7',
          expiry:
            '1794269100',
          reason:
            'bad',
        }),
      /between 5 and 500/i,
    );
  },
);

test(
  'accepts only the active 300-second Guarantor signing window',
  async () => {
    const {
      assertGuarantorReviewSigningWindow,
    } =
      await import(
        '../src/lib/guarantor/review-security'
      );

    const now =
      new Date(
        '2026-11-10T00:00:00.000Z',
      );

    const nowSeconds =
      1_794_268_800n;
    const expiry =
      deriveGuarantorReviewSigningExpiry(
        now,
      );

    assert.doesNotThrow(
      () =>
        assertGuarantorReviewSigningWindow({
          expiry,
          now,
        }),
    );
    assert.equal(
      expiry,
      nowSeconds + 240n,
    );

    assert.throws(
      () =>
        assertGuarantorReviewSigningWindow({
          expiry:
            nowSeconds + 3_600n,
          now,
        }),
      /300-second/i,
    );

    assert.throws(
      () =>
        assertGuarantorReviewSigningWindow({
          expiry:
            nowSeconds -
            1n,
          now,
        }),
      /expired/i,
    );

    assert.throws(
      () =>
        assertGuarantorReviewSigningWindow({
          expiry:
            nowSeconds +
            301n,
          now,
        }),
      /300-second/i,
    );

    assert.throws(
      () =>
        assertGuarantorReviewSigningWindow({
          expiry:
            nowSeconds,
          now:
            new Date('invalid'),
        }),
      /evaluation time/i,
    );
  },
);

test(
  'accepts canonical Guarantor collected input',
  async () => {
    const {
      parseGuarantorCollected,
    } =
      await import(
        '../src/lib/guarantor/review-security'
      );

    const input =
      parseGuarantorCollected({
        auctionId,
        signature,
        nonce:
          '11',
        expiry:
          '1794269100',
      });

    assert.deepEqual(
      input,
      {
        auctionId,
        signature,
        nonce:
          11n,
        expiry:
          1_794_269_100n,
      },
    );
  },
);

test(
  'accepts canonical Guarantor withdrawn input',
  async () => {
    const {
      parseGuarantorWithdrawn,
    } =
      await import(
        '../src/lib/guarantor/review-security'
      );

    const input =
      parseGuarantorWithdrawn({
        auctionId,
        signature,
        nonce:
          '12',
        expiry:
          '1794269100',
      });

    assert.equal(
      input.nonce,
      12n,
    );
  },
);

test(
  'rejects wallet authority from Guarantor lifecycle actions',
  async () => {
    const {
      parseGuarantorCollected,
      parseGuarantorWithdrawn,
    } =
      await import(
        '../src/lib/guarantor/review-security'
      );

    for (
      const parser
      of [
        parseGuarantorCollected,
        parseGuarantorWithdrawn,
      ]
    ) {
      assert.throws(
        () =>
          parser({
            auctionId,
            guarantorWallet:
              '0x1111111111111111111111111111111111111111',
            signature,
            nonce:
              '11',
            expiry:
              '1794269100',
          }),
        /unknown fields/i,
      );
    }
  },
);
