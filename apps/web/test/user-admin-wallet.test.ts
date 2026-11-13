import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isConfiguredUserAdminWallet } from '../src/lib/auth/user-admin-wallet';

describe('configured User Admin wallet matching', () => {
  it('matches checksummed wallet values case-insensitively', () => {
    assert.equal(
      isConfiguredUserAdminWallet(
        '0xD197005d4048840fcef6247cAe7352684AAA2FeD',
        '0xd197005d4048840fcef6247cae7352684aaa2fed',
      ),
      true,
    );
  });

  it('matches comma-separated wallet values regardless of case', () => {
    assert.equal(
      isConfiguredUserAdminWallet(
        '0xD197005d4048840fcef6247cAe7352684AAA2FeD',
        '0x1111111111111111111111111111111111111111, 0xd197005d4048840fcef6247cae7352684aaa2fed',
      ),
      true,
    );
  });

  it('does not match a different address', () => {
    assert.equal(
      isConfiguredUserAdminWallet(
        '0x1111111111111111111111111111111111111111',
        '0xd197005d4048840fcef6247cae7352684aaa2fed',
      ),
      false,
    );
  });
});
