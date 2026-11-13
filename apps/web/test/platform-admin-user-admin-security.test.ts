import assert from 'node:assert/strict';
import test from 'node:test';

import {
  parseAddUserAdmin,
} from '../src/lib/platform-admin/user-admin-security';

test(
  'accepts and normalizes canonical User Admin wallet',
  () => {
    assert.deepEqual(
      parseAddUserAdmin({
        wallet:
          '0x1111111111111111111111111111111111111111',
      }),
      {
        wallet:
          '0x1111111111111111111111111111111111111111',
      },
    );
  },
);

test(
  'rejects body owner authority',
  () => {
    assert.throws(
      () =>
        parseAddUserAdmin({
          wallet:
            '0x1111111111111111111111111111111111111111',
          owner:
            '0x2222222222222222222222222222222222222222',
        }),
      /unknown fields/i,
    );
  },
);

test(
  'rejects malformed User Admin wallet',
  () => {
    assert.throws(
      () =>
        parseAddUserAdmin({
          wallet:
            'not-an-address',
        }),
      /valid EVM address/i,
    );
  },
);

test(
  'rejects non-object User Admin request body',
  () => {
    assert.throws(
      () =>
        parseAddUserAdmin(
          null,
        ),
      /JSON object/i,
    );
  },
);

test(
  'accepts and normalizes canonical User Admin route wallet',
  async () => {
    const {
      parseUserAdminWalletParameter,
    } =
      await import(
        '../src/lib/platform-admin/user-admin-security'
      );

    assert.equal(
      parseUserAdminWalletParameter(
        '0x1111111111111111111111111111111111111111',
      ),
      '0x1111111111111111111111111111111111111111',
    );
  },
);

test(
  'rejects malformed User Admin route wallet',
  async () => {
    const {
      parseUserAdminWalletParameter,
    } =
      await import(
        '../src/lib/platform-admin/user-admin-security'
      );

    assert.throws(
      () =>
        parseUserAdminWalletParameter(
          'not-an-address',
        ),
      /valid EVM address/i,
    );
  },
);
