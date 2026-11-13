import assert from 'node:assert/strict';
import test from 'node:test';

import {
  parseKycSubmission,
} from '../src/lib/user/kyc-security';

const png =
  Buffer.from([
    0x89,
    0x50,
    0x4e,
    0x47,
    0x0d,
    0x0a,
    0x1a,
    0x0a,
    0x00,
  ]);

const pngDataUrl =
  `data:image/png;base64,${png.toString('base64')}`;

test(
  'accepts and normalizes canonical KYC input',
  () => {
    assert.deepEqual(
      parseKycSubmission({
        fullName:
          '  Tahir Maulana  ',
        nik:
          '1234567890123456',
        address:
          '  Jakarta, Indonesia  ',
        ktpPhoto:
          pngDataUrl,
      }),
      {
        fullName:
          'Tahir Maulana',
        nik:
          '1234567890123456',
        address:
          'Jakarta, Indonesia',
        ktpPhoto:
          pngDataUrl,
      },
    );
  },
);

test(
  'rejects wallet authority and unknown fields',
  () => {
    assert.throws(
      () =>
        parseKycSubmission({
          fullName:
            'Tahir Maulana',
          nik:
            '1234567890123456',
          address:
            'Jakarta',
          ktpPhoto:
            pngDataUrl,
          wallet:
            '0x1111111111111111111111111111111111111111',
        }),
      /unknown fields/i,
    );
  },
);

test(
  'requires exactly sixteen NIK digits',
  () => {
    for (
      const nik
      of [
        '123',
        '123456789012345A',
        1234567890123456,
      ]
    ) {
      assert.throws(
        () =>
          parseKycSubmission({
            fullName:
              'Tahir Maulana',
            nik,
            address:
              'Jakarta',
            ktpPhoto:
              pngDataUrl,
          }),
        /nik/i,
      );
    }
  },
);

test(
  'rejects image content that mismatches its declared type',
  () => {
    const fakePng =
      `data:image/png;base64,${Buffer
        .from('not-a-png')
        .toString('base64')}`;

    assert.throws(
      () =>
        parseKycSubmission({
          fullName:
            'Tahir Maulana',
          nik:
            '1234567890123456',
          address:
            'Jakarta',
          ktpPhoto:
            fakePng,
        }),
      /does not match/i,
    );
  },
);

test(
  'rejects KTP images above 500 KB',
  () => {
    const oversized =
      Buffer.concat([
        png,
        Buffer.alloc(
          500 * 1024,
        ),
      ]);

    assert.throws(
      () =>
        parseKycSubmission({
          fullName:
            'Tahir Maulana',
          nik:
            '1234567890123456',
          address:
            'Jakarta',
          ktpPhoto:
            `data:image/png;base64,${oversized.toString('base64')}`,
        }),
      /500 KB/i,
    );
  },
);

test(
  'classifies an initial KYC submission',
  async () => {
    const {
      decideKycSubmission,
    } =
      await import(
        '../src/lib/user/kyc-security'
      );

    assert.deepEqual(
      decideKycSubmission(
        null,
      ),
      {
        kind:
          'INITIAL',
        resultingStatus:
          'UNVERIFIED',
      },
    );
  },
);

test(
  'classifies an unverified KYC resubmission',
  async () => {
    const {
      decideKycSubmission,
    } =
      await import(
        '../src/lib/user/kyc-security'
      );

    assert.deepEqual(
      decideKycSubmission(
        'UNVERIFIED',
      ),
      {
        kind:
          'RESUBMISSION',
        resultingStatus:
          'UNVERIFIED',
      },
    );
  },
);

test(
  'rejects resubmission after KYC verification',
  async () => {
    const {
      decideKycSubmission,
    } =
      await import(
        '../src/lib/user/kyc-security'
      );

    assert.throws(
      () =>
        decideKycSubmission(
          'VERIFIED',
        ),
      /already verified/i,
    );
  },
);
