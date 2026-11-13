// @file packages/auth/test/role-resolver.test.ts

import assert from 'node:assert/strict';
import {
  describe,
  it,
} from 'node:test';

import {
  getAddress,
  type Address,
} from 'viem';

import {
  ARBITRUM_SEPOLIA_CHAIN_ID,
} from '@paralel/contracts';

import {
  DomainError,
} from '@paralel/domain';

import {
  assertPartnerRegistrySynchronized,
  assertWorkspaceAvailable,
  createUnauthenticatedWalletContext,
  deriveAvailableWorkspaces,
  deriveDefaultWorkspace,
  hasWorkspace,
  resolveWalletContext,
} from '../src/role-resolver';

import type {
  OnchainRoleReader,
  OnchainRoleState,
  PartnerRoleRecord,
  RoleRepository,
  UserAdminRoleRecord,
  UserRoleRecord,
  WalletRoleFlags,
} from '../src/types';

const USER_WALLET =
  '0x1111111111111111111111111111111111111111' as Address;

const GUARANTOR_WALLET =
  '0x2222222222222222222222222222222222222222' as Address;

const NOTARY_WALLET =
  '0x3333333333333333333333333333333333333333' as Address;

const USER_ADMIN_WALLET =
  '0x4444444444444444444444444444444444444444' as Address;

const PLATFORM_ADMIN_WALLET =
  '0x5555555555555555555555555555555555555555' as Address;

const GUARANTOR_PARTNER_ID =
  'partner-guarantor-001';

const NOTARY_PARTNER_ID =
  'partner-notary-001';

class MemoryRoleRepository
  implements RoleRepository
{
  user:
    UserRoleRecord | null =
      null;

  userAdmin:
    UserAdminRoleRecord | null =
      null;

  partner:
    PartnerRoleRecord | null =
      null;

  userReadCount = 0;
  userAdminReadCount = 0;
  partnerReadCount = 0;

  async findUserByWallet(
    wallet: Address,
  ): Promise<UserRoleRecord | null> {
    this.userReadCount += 1;

    if (
      !this.user ||
      this.user.wallet.toLowerCase() !==
        wallet.toLowerCase()
    ) {
      return null;
    }

    return {
      ...this.user,
    };
  }

  async findUserAdminByWallet(
    wallet: Address,
  ): Promise<
    UserAdminRoleRecord | null
  > {
    this.userAdminReadCount += 1;

    if (
      !this.userAdmin ||
      this.userAdmin.wallet.toLowerCase() !==
        wallet.toLowerCase()
    ) {
      return null;
    }

    return {
      ...this.userAdmin,
    };
  }

  async findPartnerByWallet(
    wallet: Address,
  ): Promise<
    PartnerRoleRecord | null
  > {
    this.partnerReadCount += 1;

    if (
      !this.partner ||
      this.partner.wallet.toLowerCase() !==
        wallet.toLowerCase()
    ) {
      return null;
    }

    return {
      ...this.partner,
    };
  }
}

class MemoryOnchainRoleReader
  implements OnchainRoleReader
{
  state: OnchainRoleState = {
    owner:
      PLATFORM_ADMIN_WALLET,
    partner:
      null,
  };

  readCount = 0;

  async readRoleState(
    _wallet: Address,
  ): Promise<OnchainRoleState> {
    this.readCount += 1;

    return {
      owner:
        this.state.owner,
      partner:
        this.state.partner
          ? {
              ...this.state.partner,
            }
          : null,
    };
  }
}

function roleFlags(
  overrides:
    Partial<WalletRoleFlags> = {},
): WalletRoleFlags {
  return {
    user:
      true,
    guarantor:
      false,
    notary:
      false,
    userAdmin:
      false,
    platformAdmin:
      false,
    ...overrides,
  };
}

function expectDomainError(
  action:
    () =>
      | unknown
      | Promise<unknown>,
  expectedCode:
    DomainError['code'],
): Promise<void> {
  return assert.rejects(
    async () => {
      await action();
    },
    (
      error: unknown,
    ) => {
      assert.equal(
        error instanceof DomainError,
        true,
      );

      if (
        !(error instanceof DomainError)
      ) {
        return false;
      }

      assert.equal(
        error.code,
        expectedCode,
      );

      return true;
    },
  );
}

function createDependencies() {
  return {
    roleRepository:
      new MemoryRoleRepository(),

    onchainRoleReader:
      new MemoryOnchainRoleReader(),
  };
}

describe(
  'workspace derivation',
  () => {
    it(
      'always includes USER workspace',
      () => {
        assert.deepEqual(
          deriveAvailableWorkspaces(
            roleFlags(),
          ),
          [
            'USER',
          ],
        );
      },
    );

    it(
      'returns only the assigned staff workspace',
      () => {
        const result =
          deriveAvailableWorkspaces(
            roleFlags({
              notary:
                true,
            }),
          );

        assert.deepEqual(
          result,
          ['NOTARY'],
        );

        assert.equal(
          Object.isFrozen(result),
          true,
        );
      },
    );

    it(
      'uses USER as the fallback workspace',
      () => {
        assert.equal(
          deriveDefaultWorkspace(
            roleFlags(),
          ),
          'USER',
        );
      },
    );

    it('rejects wallets assigned multiple staff or partner roles', () => {
      assert.throws(
        () => deriveAvailableWorkspaces(roleFlags({ guarantor: true, notary: true })),
        /only one staff or partner role/i,
      );
    });

    it(
      'defaults to the sole Platform Admin role',
      () => {
        assert.equal(
          deriveDefaultWorkspace(
            roleFlags({
              platformAdmin:
                true,
            }),
          ),
          'PLATFORM_ADMIN',
        );
      },
    );
  },
);

describe(
  'ordinary User context resolution',
  () => {
    it(
      'resolves a wallet with no database user as USER with KYC NONE',
      async () => {
        const dependencies =
          createDependencies();

        const context =
          await resolveWalletContext(
            {
              wallet:
                USER_WALLET,
              chainId:
                ARBITRUM_SEPOLIA_CHAIN_ID,
              authenticated:
                true,
            },
            dependencies,
          );

        assert.equal(
          context.wallet,
          USER_WALLET,
        );

        assert.equal(
          context.authenticated,
          true,
        );

        assert.deepEqual(
          context.user,
          {
            userId:
              null,
            kycStatus:
              'NONE',
          },
        );

        assert.deepEqual(
          context.roles,
          {
            user:
              true,
            guarantor:
              false,
            notary:
              false,
            userAdmin:
              false,
            platformAdmin:
              false,
          },
        );

        assert.deepEqual(
          context.availableWorkspaces,
          [
            'USER',
          ],
        );

        assert.equal(
          context.defaultWorkspace,
          'USER',
        );

        assert.equal(
          context.partnerContext,
          null,
        );
      },
    );

    it(
      'resolves user ID and KYC status from the database',
      async () => {
        const dependencies =
          createDependencies();

        dependencies.roleRepository.user = {
          userId:
            'user-001',
          wallet:
            USER_WALLET,
          kycStatus:
            'VERIFIED',
        };

        const context =
          await resolveWalletContext(
            {
              wallet:
                USER_WALLET,
              chainId:
                ARBITRUM_SEPOLIA_CHAIN_ID,
              authenticated:
                true,
            },
            dependencies,
          );

        assert.deepEqual(
          context.user,
          {
            userId:
              'user-001',
            kycStatus:
              'VERIFIED',
          },
        );
      },
    );

    it(
      'reads all role sources exactly once',
      async () => {
        const dependencies =
          createDependencies();

        await resolveWalletContext(
          {
            wallet:
              USER_WALLET,
            chainId:
              ARBITRUM_SEPOLIA_CHAIN_ID,
            authenticated:
              true,
          },
          dependencies,
        );

        assert.equal(
          dependencies.roleRepository
            .userReadCount,
          1,
        );

        assert.equal(
          dependencies.roleRepository
            .userAdminReadCount,
          1,
        );

        assert.equal(
          dependencies.roleRepository
            .partnerReadCount,
          1,
        );

        assert.equal(
          dependencies.onchainRoleReader
            .readCount,
          1,
        );
      },
    );

    it(
      'rejects unauthenticated context resolution before repository reads',
      async () => {
        const dependencies =
          createDependencies();

        await expectDomainError(
          () =>
            resolveWalletContext(
              {
                wallet:
                  USER_WALLET,
                chainId:
                  ARBITRUM_SEPOLIA_CHAIN_ID,
                authenticated:
                  false,
              },
              dependencies,
            ),
          'UNAUTHENTICATED',
        );

        assert.equal(
          dependencies.roleRepository
            .userReadCount,
          0,
        );

        assert.equal(
          dependencies.onchainRoleReader
            .readCount,
          0,
        );
      },
    );

    it(
      'rejects wrong-chain context resolution',
      async () => {
        const dependencies =
          createDependencies();

        await expectDomainError(
          () =>
            resolveWalletContext(
              {
                wallet:
                  USER_WALLET,
                chainId:
                  1,
                authenticated:
                  true,
              },
              dependencies,
            ),
          'WRONG_NETWORK',
        );
      },
    );
  },
);

describe(
  'Platform Admin role resolution',
  () => {
    it(
      'derives Platform Admin from contract owner',
      async () => {
        const dependencies =
          createDependencies();

        dependencies.onchainRoleReader.state = {
          owner:
            PLATFORM_ADMIN_WALLET,
          partner:
            null,
        };

        const context =
          await resolveWalletContext(
            {
              wallet:
                PLATFORM_ADMIN_WALLET,
              chainId:
                ARBITRUM_SEPOLIA_CHAIN_ID,
              authenticated:
                true,
            },
            dependencies,
          );

        assert.equal(
          context.roles.platformAdmin,
          true,
        );

        assert.deepEqual(
          context.availableWorkspaces,
          ['PLATFORM_ADMIN'],
        );

        assert.equal(
          context.defaultWorkspace,
          'PLATFORM_ADMIN',
        );
      },
    );

    it(
      'compares valid owner address representations case-insensitively',
      async () => {
        const dependencies =
          createDependencies();

        const lowercaseOwner =
          '0x5472ca834b67de0e54833e6f779725b4e77ca893' as Address;

        const checksummedOwner =
          getAddress(
            lowercaseOwner,
          );

        dependencies.onchainRoleReader.state = {
          owner:
            lowercaseOwner,
          partner:
            null,
        };

        const context =
          await resolveWalletContext(
            {
              wallet:
                checksummedOwner,
              chainId:
                ARBITRUM_SEPOLIA_CHAIN_ID,
              authenticated:
                true,
            },
            dependencies,
          );

        assert.equal(
          context.wallet,
          checksummedOwner,
        );

        assert.equal(
          context.roles.platformAdmin,
          true,
        );
      },
    );

    it(
      'does not derive Platform Admin from a database role',
      async () => {
        const dependencies =
          createDependencies();

        dependencies.roleRepository.userAdmin = {
          wallet:
            USER_WALLET,
          active:
            true,
        };

        const context =
          await resolveWalletContext(
            {
              wallet:
                USER_WALLET,
              chainId:
                ARBITRUM_SEPOLIA_CHAIN_ID,
              authenticated:
                true,
            },
            dependencies,
          );

        assert.equal(
          context.roles.platformAdmin,
          false,
        );

        assert.equal(
          context.roles.userAdmin,
          true,
        );
      },
    );
  },
);

describe(
  'User Admin role resolution',
  () => {
    it(
      'grants User Admin from active database registry',
      async () => {
        const dependencies =
          createDependencies();

        dependencies.roleRepository.userAdmin = {
          wallet:
            USER_ADMIN_WALLET,
          active:
            true,
        };

        const context =
          await resolveWalletContext(
            {
              wallet:
                USER_ADMIN_WALLET,
              chainId:
                ARBITRUM_SEPOLIA_CHAIN_ID,
              authenticated:
                true,
            },
            dependencies,
          );

        assert.equal(
          context.roles.userAdmin,
          true,
        );

        assert.deepEqual(
          context.availableWorkspaces,
          ['USER_ADMIN'],
        );

        assert.equal(
          context.defaultWorkspace,
          'USER_ADMIN',
        );
      },
    );

    it(
      'does not grant User Admin from inactive registry',
      async () => {
        const dependencies =
          createDependencies();

        dependencies.roleRepository.userAdmin = {
          wallet:
            USER_ADMIN_WALLET,
          active:
            false,
        };

        const context =
          await resolveWalletContext(
            {
              wallet:
                USER_ADMIN_WALLET,
              chainId:
                ARBITRUM_SEPOLIA_CHAIN_ID,
              authenticated:
                true,
            },
            dependencies,
          );

        assert.equal(
          context.roles.userAdmin,
          false,
        );

        assert.equal(
          context.defaultWorkspace,
          'USER',
        );
      },
    );
  },
);

describe(
  'Guarantor role resolution',
  () => {
    it(
      'grants Guarantor when database and on-chain state are synchronized',
      async () => {
        const dependencies =
          createDependencies();

        dependencies.roleRepository.partner = {
          partnerId:
            GUARANTOR_PARTNER_ID,
          wallet:
            GUARANTOR_WALLET,
          type:
            'GUARANTOR',
          lifecycleStatus:
            'ACTIVE',
          dbActive:
            true,
        };

        dependencies.onchainRoleReader.state = {
          owner:
            PLATFORM_ADMIN_WALLET,
          partner: {
            type:
              'GUARANTOR',
            category:
              1,
            active:
              true,
          },
        };

        const context =
          await resolveWalletContext(
            {
              wallet:
                GUARANTOR_WALLET,
              chainId:
                ARBITRUM_SEPOLIA_CHAIN_ID,
              authenticated:
                true,
            },
            dependencies,
          );

        assert.equal(
          context.roles.guarantor,
          true,
        );

        assert.equal(
          context.roles.notary,
          false,
        );

        assert.deepEqual(
          context.partnerContext,
          {
            partnerId:
              GUARANTOR_PARTNER_ID,
            wallet:
              GUARANTOR_WALLET,
            type:
              'GUARANTOR',
            lifecycleStatus:
              'ACTIVE',
            dbActive:
              true,
            onchainActive:
              true,
            syncStatus:
              'SYNCED',
          },
        );

        assert.deepEqual(
          context.availableWorkspaces,
          ['GUARANTOR'],
        );

        assert.equal(
          context.defaultWorkspace,
          'GUARANTOR',
        );
      },
    );

    it(
      'does not grant Guarantor when database role is pending on-chain',
      async () => {
        const dependencies =
          createDependencies();

        dependencies.roleRepository.partner = {
          partnerId:
            GUARANTOR_PARTNER_ID,
          wallet:
            GUARANTOR_WALLET,
          type:
            'GUARANTOR',
          lifecycleStatus:
            'ACTIVE',
          dbActive:
            true,
        };

        dependencies.onchainRoleReader.state = {
          owner:
            PLATFORM_ADMIN_WALLET,
          partner:
            null,
        };

        const context =
          await resolveWalletContext(
            {
              wallet:
                GUARANTOR_WALLET,
              chainId:
                ARBITRUM_SEPOLIA_CHAIN_ID,
              authenticated:
                true,
            },
            dependencies,
          );

        assert.equal(
          context.roles.guarantor,
          false,
        );

        assert.equal(
          context.partnerContext?.syncStatus,
          'PENDING',
        );

        assert.equal(
          context.partnerContext?.onchainActive,
          false,
        );

        assert.equal(
          context.defaultWorkspace,
          'USER',
        );
      },
    );

    it(
      'does not grant Guarantor when active flags drift',
      async () => {
        const dependencies =
          createDependencies();

        dependencies.roleRepository.partner = {
          partnerId:
            GUARANTOR_PARTNER_ID,
          wallet:
            GUARANTOR_WALLET,
          type:
            'GUARANTOR',
          lifecycleStatus:
            'ACTIVE',
          dbActive:
            true,
        };

        dependencies.onchainRoleReader.state = {
          owner:
            PLATFORM_ADMIN_WALLET,
          partner: {
            type:
              'GUARANTOR',
            category:
              1,
            active:
              false,
          },
        };

        const context =
          await resolveWalletContext(
            {
              wallet:
                GUARANTOR_WALLET,
              chainId:
                ARBITRUM_SEPOLIA_CHAIN_ID,
              authenticated:
                true,
            },
            dependencies,
          );

        assert.equal(
          context.roles.guarantor,
          false,
        );

        assert.equal(
          context.partnerContext?.syncStatus,
          'DRIFTED',
        );

        assert.equal(
          context.defaultWorkspace,
          'USER',
        );
      },
    );

    it(
      'does not grant Guarantor when partner type drifts',
      async () => {
        const dependencies =
          createDependencies();

        dependencies.roleRepository.partner = {
          partnerId:
            GUARANTOR_PARTNER_ID,
          wallet:
            GUARANTOR_WALLET,
          type:
            'GUARANTOR',
          lifecycleStatus:
            'ACTIVE',
          dbActive:
            true,
        };

        dependencies.onchainRoleReader.state = {
          owner:
            PLATFORM_ADMIN_WALLET,
          partner: {
            type:
              'NOTARY',
            category:
              1,
            active:
              true,
          },
        };

        const context =
          await resolveWalletContext(
            {
              wallet:
                GUARANTOR_WALLET,
              chainId:
                ARBITRUM_SEPOLIA_CHAIN_ID,
              authenticated:
                true,
            },
            dependencies,
          );

        assert.equal(
          context.roles.guarantor,
          false,
        );

        assert.equal(
          context.partnerContext?.syncStatus,
          'DRIFTED',
        );
      },
    );

    it(
      'keeps inactive partner context but removes privileged role',
      async () => {
        const dependencies =
          createDependencies();

        dependencies.roleRepository.partner = {
          partnerId:
            GUARANTOR_PARTNER_ID,
          wallet:
            GUARANTOR_WALLET,
          type:
            'GUARANTOR',
          lifecycleStatus:
            'INACTIVE',
          dbActive:
            false,
        };

        dependencies.onchainRoleReader.state = {
          owner:
            PLATFORM_ADMIN_WALLET,
          partner: {
            type:
              'GUARANTOR',
            category:
              1,
            active:
              false,
          },
        };

        const context =
          await resolveWalletContext(
            {
              wallet:
                GUARANTOR_WALLET,
              chainId:
                ARBITRUM_SEPOLIA_CHAIN_ID,
              authenticated:
                true,
            },
            dependencies,
          );

        assert.equal(
          context.roles.guarantor,
          false,
        );

        assert.equal(
          context.partnerContext?.lifecycleStatus,
          'INACTIVE',
        );

        assert.equal(
          context.partnerContext?.syncStatus,
          'SYNCED',
        );
      },
    );

    it(
      'keeps SUSPENDING context but does not grant active workspace after deactivation',
      async () => {
        const dependencies =
          createDependencies();

        dependencies.roleRepository.partner = {
          partnerId:
            GUARANTOR_PARTNER_ID,
          wallet:
            GUARANTOR_WALLET,
          type:
            'GUARANTOR',
          lifecycleStatus:
            'SUSPENDING',
          dbActive:
            false,
        };

        dependencies.onchainRoleReader.state = {
          owner:
            PLATFORM_ADMIN_WALLET,
          partner: {
            type:
              'GUARANTOR',
            category:
              1,
            active:
              false,
          },
        };

        const context =
          await resolveWalletContext(
            {
              wallet:
                GUARANTOR_WALLET,
              chainId:
                ARBITRUM_SEPOLIA_CHAIN_ID,
              authenticated:
                true,
            },
            dependencies,
          );

        assert.equal(
          context.roles.guarantor,
          false,
        );

        assert.equal(
          context.partnerContext?.lifecycleStatus,
          'SUSPENDING',
        );

        assert.equal(
          context.defaultWorkspace,
          'USER',
        );
      },
    );
  },
);

describe(
  'Notary role resolution',
  () => {
    it(
      'grants Notary when database and on-chain state are synchronized',
      async () => {
        const dependencies =
          createDependencies();

        dependencies.roleRepository.partner = {
          partnerId:
            NOTARY_PARTNER_ID,
          wallet:
            NOTARY_WALLET,
          type:
            'NOTARY',
          lifecycleStatus:
            'ACTIVE',
          dbActive:
            true,
        };

        dependencies.onchainRoleReader.state = {
          owner:
            PLATFORM_ADMIN_WALLET,
          partner: {
            type:
              'NOTARY',
            category:
              2,
            active:
              true,
          },
        };

        const context =
          await resolveWalletContext(
            {
              wallet:
                NOTARY_WALLET,
              chainId:
                ARBITRUM_SEPOLIA_CHAIN_ID,
              authenticated:
                true,
            },
            dependencies,
          );

        assert.equal(
          context.roles.notary,
          true,
        );

        assert.equal(
          context.roles.guarantor,
          false,
        );

        assert.equal(
          context.defaultWorkspace,
          'NOTARY',
        );

        assert.equal(
          context.partnerContext?.syncStatus,
          'SYNCED',
        );
      },
    );

    it(
      'does not invent a DB partner from an on-chain-only entry',
      async () => {
        const dependencies =
          createDependencies();

        dependencies.onchainRoleReader.state = {
          owner:
            PLATFORM_ADMIN_WALLET,
          partner: {
            type:
              'NOTARY',
            category:
              2,
            active:
              true,
          },
        };

        const context =
          await resolveWalletContext(
            {
              wallet:
                NOTARY_WALLET,
              chainId:
                ARBITRUM_SEPOLIA_CHAIN_ID,
              authenticated:
                true,
            },
            dependencies,
          );

        assert.equal(
          context.roles.notary,
          false,
        );

        assert.equal(
          context.partnerContext,
          null,
        );

        assert.equal(
          context.defaultWorkspace,
          'USER',
        );
      },
    );
  },
);

describe(
  'multi-role wallet resolution',
  () => {
    it(
      'rejects a Platform Admin wallet also assigned User Admin',
      async () => {
        const dependencies =
          createDependencies();

        dependencies.roleRepository.userAdmin = {
          wallet:
            PLATFORM_ADMIN_WALLET,
          active:
            true,
        };

        dependencies.onchainRoleReader.state = {
          owner:
            PLATFORM_ADMIN_WALLET,
          partner:
            null,
        };

        await assert.rejects(
          resolveWalletContext(
            {
              wallet:
                PLATFORM_ADMIN_WALLET,
              chainId:
                ARBITRUM_SEPOLIA_CHAIN_ID,
              authenticated:
                true,
            },
            dependencies,
          ),
          /only one staff or partner role/i,
        );
      },
    );

    it(
      'rejects a Notary wallet also assigned User Admin',
      async () => {
        const dependencies =
          createDependencies();

        dependencies.roleRepository.userAdmin = {
          wallet:
            NOTARY_WALLET,
          active:
            true,
        };

        dependencies.roleRepository.partner = {
          partnerId:
            NOTARY_PARTNER_ID,
          wallet:
            NOTARY_WALLET,
          type:
            'NOTARY',
          lifecycleStatus:
            'ACTIVE',
          dbActive:
            true,
        };

        dependencies.onchainRoleReader.state = {
          owner:
            PLATFORM_ADMIN_WALLET,
          partner: {
            type:
              'NOTARY',
            category:
              2,
            active:
              true,
          },
        };

        await assert.rejects(
          resolveWalletContext(
            {
              wallet:
                NOTARY_WALLET,
              chainId:
                ARBITRUM_SEPOLIA_CHAIN_ID,
              authenticated:
                true,
            },
            dependencies,
          ),
          /only one staff or partner role/i,
        );
      },
    );
  },
);

describe(
  'workspace access',
  () => {
    it(
      'reports available workspaces',
      async () => {
        const dependencies =
          createDependencies();

        dependencies.roleRepository.userAdmin = {
          wallet:
            USER_ADMIN_WALLET,
          active:
            true,
        };

        const context =
          await resolveWalletContext(
            {
              wallet:
                USER_ADMIN_WALLET,
              chainId:
                ARBITRUM_SEPOLIA_CHAIN_ID,
              authenticated:
                true,
            },
            dependencies,
          );

        assert.equal(
          hasWorkspace(
            context,
            'USER',
          ),
          false,
        );

        assert.equal(
          hasWorkspace(
            context,
            'USER_ADMIN',
          ),
          true,
        );

        assert.equal(
          hasWorkspace(
            context,
            'PLATFORM_ADMIN',
          ),
          false,
        );
      },
    );

    it(
      'allows assertion for an available workspace',
      async () => {
        const dependencies =
          createDependencies();

        const context =
          await resolveWalletContext(
            {
              wallet:
                USER_WALLET,
              chainId:
                ARBITRUM_SEPOLIA_CHAIN_ID,
              authenticated:
                true,
            },
            dependencies,
          );

        assert.doesNotThrow(
          () =>
            assertWorkspaceAvailable(
              context,
              'USER',
            ),
        );
      },
    );

    it(
      'rejects assertion for an unavailable workspace',
      async () => {
        const dependencies =
          createDependencies();

        const context =
          await resolveWalletContext(
            {
              wallet:
                USER_WALLET,
              chainId:
                ARBITRUM_SEPOLIA_CHAIN_ID,
              authenticated:
                true,
            },
            dependencies,
          );

        assert.throws(
          () =>
            assertWorkspaceAvailable(
              context,
              'PLATFORM_ADMIN',
            ),
          (
            error: unknown,
          ) => {
            assert.equal(
              error instanceof DomainError,
              true,
            );

            if (
              !(error instanceof DomainError)
            ) {
              return false;
            }

            assert.equal(
              error.code,
              'ROLE_FORBIDDEN',
            );

            return true;
          },
        );
      },
    );
  },
);

describe(
  'partner synchronization assertion',
  () => {
    it(
      'accepts a synchronized partner context',
      async () => {
        const dependencies =
          createDependencies();

        dependencies.roleRepository.partner = {
          partnerId:
            GUARANTOR_PARTNER_ID,
          wallet:
            GUARANTOR_WALLET,
          type:
            'GUARANTOR',
          lifecycleStatus:
            'ACTIVE',
          dbActive:
            true,
        };

        dependencies.onchainRoleReader.state = {
          owner:
            PLATFORM_ADMIN_WALLET,
          partner: {
            type:
              'GUARANTOR',
            category:
              1,
            active:
              true,
          },
        };

        const context =
          await resolveWalletContext(
            {
              wallet:
                GUARANTOR_WALLET,
              chainId:
                ARBITRUM_SEPOLIA_CHAIN_ID,
              authenticated:
                true,
            },
            dependencies,
          );

        assert.doesNotThrow(
          () =>
            assertPartnerRegistrySynchronized(
              context,
            ),
        );
      },
    );

    it(
      'rejects a wallet without partner context',
      async () => {
        const dependencies =
          createDependencies();

        const context =
          await resolveWalletContext(
            {
              wallet:
                USER_WALLET,
              chainId:
                ARBITRUM_SEPOLIA_CHAIN_ID,
              authenticated:
                true,
            },
            dependencies,
          );

        assert.throws(
          () =>
            assertPartnerRegistrySynchronized(
              context,
            ),
          (
            error: unknown,
          ) => {
            assert.equal(
              error instanceof DomainError,
              true,
            );

            if (
              !(error instanceof DomainError)
            ) {
              return false;
            }

            assert.equal(
              error.code,
              'ROLE_FORBIDDEN',
            );

            return true;
          },
        );
      },
    );

    it(
      'rejects a drifted partner context',
      async () => {
        const dependencies =
          createDependencies();

        dependencies.roleRepository.partner = {
          partnerId:
            GUARANTOR_PARTNER_ID,
          wallet:
            GUARANTOR_WALLET,
          type:
            'GUARANTOR',
          lifecycleStatus:
            'ACTIVE',
          dbActive:
            true,
        };

        dependencies.onchainRoleReader.state = {
          owner:
            PLATFORM_ADMIN_WALLET,
          partner: {
            type:
              'GUARANTOR',
            category:
              1,
            active:
              false,
          },
        };

        const context =
          await resolveWalletContext(
            {
              wallet:
                GUARANTOR_WALLET,
              chainId:
                ARBITRUM_SEPOLIA_CHAIN_ID,
              authenticated:
                true,
            },
            dependencies,
          );

        assert.throws(
          () =>
            assertPartnerRegistrySynchronized(
              context,
            ),
          (
            error: unknown,
          ) => {
            assert.equal(
              error instanceof DomainError,
              true,
            );

            if (
              !(error instanceof DomainError)
            ) {
              return false;
            }

            assert.equal(
              error.code,
              'PARTNER_REGISTRY_DRIFT',
            );

            return true;
          },
        );
      },
    );
  },
);

describe(
  'unauthenticated UI context',
  () => {
    it(
      'creates a minimal local UI context without role reads',
      () => {
        const context =
          createUnauthenticatedWalletContext({
            wallet:
              USER_WALLET,
            chainId:
              ARBITRUM_SEPOLIA_CHAIN_ID,
          });

        assert.deepEqual(
          context,
          {
            wallet:
              USER_WALLET,
            chainId:
              ARBITRUM_SEPOLIA_CHAIN_ID,
            authenticated:
              false,
            user: {
              userId:
                null,
              kycStatus:
                'NONE',
            },
            roles: {
              user:
                true,
              guarantor:
                false,
              notary:
                false,
              userAdmin:
                false,
              platformAdmin:
                false,
            },
            partnerContext:
              null,
            availableWorkspaces: [
              'USER',
            ],
            defaultWorkspace:
              'USER',
          },
        );
      },
    );

    it(
      'does not treat the unauthenticated UI context as server authorization',
      () => {
        const context =
          createUnauthenticatedWalletContext({
            wallet:
              USER_WALLET,
            chainId:
              ARBITRUM_SEPOLIA_CHAIN_ID,
          });

        assert.equal(
          context.authenticated,
          false,
        );
      },
    );
  },
);
