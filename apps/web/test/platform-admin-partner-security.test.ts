import assert from 'node:assert/strict';
import test from 'node:test';

import {
  parsePartnerPhotoKey,
  parsePartnerRegistration,
} from '../src/lib/platform-admin/partner-security';

const wallet =
  '0x1111111111111111111111111111111111111111';

test(
  'accepts canonical Notary registration',
  () => {
    assert.deepEqual(
      parsePartnerRegistration({
        wallet,
        type:
          'NOTARY',
        name:
          'Notary One',
        documentNumber:
          'DOC-001',
      }),
      {
        wallet,
        type:
          'NOTARY',
        name:
          'Notary One',
        category:
          null,
        city:
          null,
        documentNumber:
          'DOC-001',
        address:
          null,
        photo:
          null,
      },
    );
  },
);

test(
  'accepts canonical Guarantor registration',
  () => {
    const input =
      parsePartnerRegistration({
        wallet,
        type:
          'GUARANTOR',
        name:
          'Guarantor One',
        category:
          'OTOMOTIF',
        city:
          'Jakarta',
        address:
          'Central Jakarta',
      });

    assert.equal(
      input.type,
      'GUARANTOR',
    );

    assert.equal(
      input.category,
      'OTOMOTIF',
    );

    assert.equal(
      input.city,
      'Jakarta',
    );
  },
);

test(
  'rejects body owner authority',
  () => {
    assert.throws(
      () =>
        parsePartnerRegistration({
          wallet,
          owner:
            '0x2222222222222222222222222222222222222222',
          type:
            'NOTARY',
          name:
            'Notary One',
        }),
      /unknown fields/i,
    );
  },
);

test(
  'requires factual Guarantor category and city',
  () => {
    assert.throws(
      () =>
        parsePartnerRegistration({
          wallet,
          type:
            'GUARANTOR',
          name:
            'Guarantor One',
        }),
      /category is required/i,
    );

    assert.throws(
      () =>
        parsePartnerRegistration({
          wallet,
          type:
            'GUARANTOR',
          name:
            'Guarantor One',
          category:
            'ALL',
        }),
      /city is required/i,
    );
  },
);

test(
  'rejects Notary Guarantor-only metadata',
  () => {
    assert.throws(
      () =>
        parsePartnerRegistration({
          wallet,
          type:
            'NOTARY',
          name:
            'Notary One',
          category:
            'ALL',
        }),
      /category must be null/i,
    );
  },
);

test(
  'accepts only canonical partner photo object keys',
  () => {
    assert.equal(
      parsePartnerPhotoKey(
        'partners-photos/123e4567-e89b-12d3-a456-426614174000.jpg',
      ),
      'partners-photos/123e4567-e89b-12d3-a456-426614174000.jpg',
    );
    assert.throws(
      () =>
        parsePartnerPhotoKey(
          'data:image/jpeg;base64,abc',
        ),
      /canonical partner object key/i,
    );
  },
);
