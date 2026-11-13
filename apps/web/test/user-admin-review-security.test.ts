import assert from 'node:assert/strict';
import test from 'node:test';

import {
  parseKycReview,
} from '../src/lib/user-admin/review-security';

const userId =
  '11111111-1111-4111-8111-111111111111';

test(
  'accepts canonical VERIFIED review',
  () => {
    assert.deepEqual(
      parseKycReview({
        userId,
        status:
          'VERIFIED',
        comment:
          'ignored after verification',
      }),
      {
        userId,
        status:
          'VERIFIED',
        comment:
          null,
      },
    );
  },
);

test(
  'accepts and normalizes UNVERIFIED review',
  () => {
    assert.deepEqual(
      parseKycReview({
        userId,
        status:
          'UNVERIFIED',
        comment:
          '  Identity document is unreadable.  ',
      }),
      {
        userId,
        status:
          'UNVERIFIED',
        comment:
          'Identity document is unreadable.',
      },
    );
  },
);

test(
  'rejects body admin authority and unknown fields',
  () => {
    assert.throws(
      () =>
        parseKycReview({
          userId,
          status:
            'VERIFIED',
          adminWallet:
            '0x1111111111111111111111111111111111111111',
        }),
      /unknown fields/i,
    );
  },
);

test(
  'requires rejection comment',
  () => {
    assert.throws(
      () =>
        parseKycReview({
          userId,
          status:
            'UNVERIFIED',
        }),
      /comment is required/i,
    );
  },
);

test(
  'rejects malformed review fields',
  () => {
    assert.throws(
      () =>
        parseKycReview({
          userId:
            'not-a-uuid',
          status:
            'VERIFIED',
        }),
      /userId/i,
    );

    assert.throws(
      () =>
        parseKycReview({
          userId,
          status:
            'PENDING',
        }),
      /status/i,
    );
  },
);
