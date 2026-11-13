import assert from 'node:assert/strict';
import test from 'node:test';

import {
  deriveConsignorSigningExpiry,
  hasRequiredConfirmApprovals,
  normalizeConfirmInitAuctionCode,
  parseConfirmInitInput,
} from '../src/lib/auction/confirm-init-security';

test(
  'normalizes canonical confirm-init input',
  () => {
    assert.equal(
      normalizeConfirmInitAuctionCode(
        ' JKT-ELK-261109-0001 ',
      ),
      'JKT-ELK-261109-0001',
    );

    assert.equal(
      parseConfirmInitInput({}),
      undefined,
    );
  },
);

test(
  'rejects confirmation-code or wallet fields',
  () => {
    assert.throws(
      () =>
        parseConfirmInitInput({
          wallet:
            '0x1111111111111111111111111111111111111111',
        }),
      /must be empty/i,
    );

    assert.throws(
      () =>
        parseConfirmInitInput({
          code:
            'AB12CD34',
        }),
      /must be empty/i,
    );
  },
);

test(
  'requires both Guarantor and Notary approvals',
  () => {
    assert.equal(
      hasRequiredConfirmApprovals([
        'GUARANTOR_APPROVED',
        'NOTARY_APPROVED',
      ]),
      true,
    );

    assert.equal(
      hasRequiredConfirmApprovals([
        'GUARANTOR_APPROVED',
      ]),
      false,
    );

    assert.equal(
      hasRequiredConfirmApprovals([
        'NOTARY_APPROVED',
      ]),
      false,
    );
  },
);

test(
  'derives the immutable 300-second signing expiry',
  () => {
    assert.equal(
      deriveConsignorSigningExpiry(
        new Date(
          '2026-11-09T14:00:00.000Z',
        ),
      ),
      1_794_233_100n,
    );

    assert.throws(
      () =>
        deriveConsignorSigningExpiry(
          new Date('invalid'),
        ),
      /evaluation time/i,
    );
  },
);
