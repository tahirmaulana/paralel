import assert from 'node:assert/strict';
import test from 'node:test';

import {
  isActiveDocumentConflict,
  isCanonicalGuarantorRegistryState,
  matchesStoredObjectMetadata,
} from '../src/lib/auction/create-security';

test(
  'recognizes only the authoritative active-document conflict',
  () => {
    assert.equal(
      isActiveDocumentConflict({
        code: '23505',
        constraint:
          'uq_active_document_number',
      }),
      true,
    );

    assert.equal(
      isActiveDocumentConflict({
        code: '23505',
        constraint_name:
          'uq_active_document_number',
      }),
      true,
    );

    assert.equal(
      isActiveDocumentConflict({
        code: '23505',
        constraint:
          'auctions_auction_code_key',
      }),
      false,
    );

    assert.equal(
      isActiveDocumentConflict({
        code: '23503',
        constraint:
          'uq_active_document_number',
      }),
      false,
    );

    assert.equal(
      isActiveDocumentConflict(null),
      false,
    );
  },
);

test(
  'accepts exact canonical object metadata',
  () => {
    const expected = {
      slot: 'photo1',
      'actor-wallet':
        '0x1111111111111111111111111111111111111111',
      'content-hash':
        '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      filename:
        'asset-front',
      extension: 'jpg',
      width: '1200',
      height: '800',
    };

    assert.equal(
      matchesStoredObjectMetadata(
        { ...expected },
        expected,
      ),
      true,
    );
  },
);

test(
  'rejects storage metadata owned by another actor',
  () => {
    const expected = {
      slot: 'photo1',
      'actor-wallet':
        '0x1111111111111111111111111111111111111111',
      'content-hash':
        '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    };

    const actual = {
      ...expected,
      'actor-wallet':
        '0x2222222222222222222222222222222222222222',
    };

    assert.equal(
      matchesStoredObjectMetadata(
        actual,
        expected,
      ),
      false,
    );
  },
);

test(
  'rejects missing or changed canonical metadata',
  () => {
    const expected = {
      slot: 'doc',
      'actor-wallet':
        '0x1111111111111111111111111111111111111111',
      'content-hash':
        '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      filename: 'invoice',
      extension: 'pdf',
      width: '',
      height: '',
    };

    const missingHash = {
      slot: expected.slot,
      'actor-wallet':
        expected[
          'actor-wallet'
        ],
      filename:
        expected.filename,
      extension:
        expected.extension,
      width:
        expected.width,
      height:
        expected.height,
    };

    assert.equal(
      matchesStoredObjectMetadata(
        missingHash,
        expected,
      ),
      false,
    );

    assert.equal(
      matchesStoredObjectMetadata(
        {
          ...expected,
          extension: 'jpg',
        },
        expected,
      ),
      false,
    );

    assert.equal(
      matchesStoredObjectMetadata(
        expected,
        {},
      ),
      false,
    );
  },
);

test(
  'accepts only the canonical Guarantor registry state',
  async () => {
    const {
      ContractPartnerType,
      GUARANTOR_COMPATIBILITY_CATEGORY,
    } =
      await import(
        '@paralel/contracts'
      );

    const expected = {
      pType:
        ContractPartnerType
          .GUARANTOR,
      category:
        GUARANTOR_COMPATIBILITY_CATEGORY,
    };

    assert.equal(
      isCanonicalGuarantorRegistryState(
        {
          ...expected,
          active:
            true,
        },
        expected,
      ),
      true,
    );

    assert.equal(
      isCanonicalGuarantorRegistryState(
        {
          ...expected,
          active:
            false,
        },
        expected,
      ),
      false,
    );

    assert.equal(
      isCanonicalGuarantorRegistryState(
        {
          ...expected,
          pType:
            ContractPartnerType
              .NOTARY,
          active:
            true,
        },
        expected,
      ),
      false,
    );

    assert.equal(
      isCanonicalGuarantorRegistryState(
        {
          ...expected,
          category:
            GUARANTOR_COMPATIBILITY_CATEGORY +
            1,
          active:
            true,
        },
        expected,
      ),
      false,
    );
  },
);
