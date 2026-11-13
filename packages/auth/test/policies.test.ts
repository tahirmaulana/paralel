// @file packages/auth/test/policies.test.ts

import assert from 'node:assert/strict';
import {
  describe,
  it,
} from 'node:test';

import type {
  Address,
} from 'viem';

import {
  ARBITRUM_SEPOLIA_CHAIN_ID,
} from '@paralel/contracts';

import {
  DomainError,
} from '@paralel/domain';

import {
  assertAuthenticatedRequest,
  assertAuthenticatedWalletContext,
  assertAuthenticatedWorkspace,
  assertSessionBinding,
  assertTrustedRequestOrigin,
  isMutatingHttpMethod,
  normalizeHttpOrigin,
  walletContextToAuthorizationActor,
} from '../src/policies';

import type {
  SessionClaims,
  WalletContext,
} from '../src/types';

const USER_WALLET =
  '0x1111111111111111111111111111111111111111' as Address;

const OTHER_WALLET =
  '0x2222222222222222222222222222222222222222' as Address;

const GUARANTOR_WALLET =
  '0x3333333333333333333333333333333333333333' as Address;

const NOW =
  new Date(
    '2026-11-08T10:00:00.000Z',
  );

const SESSION_ID =
  'session000000000000000000000001';

const EXPECTED_ORIGIN =
  'http://localhost:3000';

function sessionClaims(
  overrides:
    Partial<SessionClaims> = {},
): SessionClaims {
  return {
    sessionId:
      SESSION_ID,
    wallet:
      USER_WALLET,
    chainId:
      ARBITRUM_SEPOLIA_CHAIN_ID,
    issuedAt:
      new Date(
        '2026-11-08T09:00:00.000Z',
      ),
    expiresAt:
      new Date(
        '2026-11-08T18:00:00.000Z',
      ),
    generation:
      1,
    ...overrides,
  };
}

function userContext(
  overrides:
    Partial<WalletContext> = {},
): WalletContext {
  return {
    wallet:
      USER_WALLET,
    chainId:
      ARBITRUM_SEPOLIA_CHAIN_ID,
    authenticated:
      true,

    user: {
      userId:
        'user-001',
      kycStatus:
        'VERIFIED',
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

    ...overrides,
  };
}

function guarantorContext(): WalletContext {
  return userContext({
    wallet:
      GUARANTOR_WALLET,

    roles: {
      user:
        true,
      guarantor:
        true,
      notary:
        false,
      userAdmin:
        false,
      platformAdmin:
        false,
    },

    partnerContext: {
      partnerId:
        'partner-guarantor-001',
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

    availableWorkspaces: [
      'USER',
      'GUARANTOR',
    ],

    defaultWorkspace:
      'GUARANTOR',
  });
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

describe(
  'HTTP method classification',
  () => {
    it(
      'classifies POST, PUT, PATCH, and DELETE as mutating',
      () => {
        for (
          const method
          of [
            'POST',
            'PUT',
            'PATCH',
            'DELETE',
          ]
        ) {
          assert.equal(
            isMutatingHttpMethod(
              method,
            ),
            true,
          );
        }
      },
    );

    it(
      'normalizes method casing and whitespace',
      () => {
        assert.equal(
          isMutatingHttpMethod(
            ' post ',
          ),
          true,
        );

        assert.equal(
          isMutatingHttpMethod(
            'patch',
          ),
          true,
        );
      },
    );

    it(
      'does not classify read-only methods as mutating',
      () => {
        for (
          const method
          of [
            'GET',
            'HEAD',
            'OPTIONS',
          ]
        ) {
          assert.equal(
            isMutatingHttpMethod(
              method,
            ),
            false,
          );
        }
      },
    );
  },
);

describe(
  'HTTP origin normalization',
  () => {
    it(
      'normalizes scheme and host casing',
      () => {
        assert.equal(
          normalizeHttpOrigin(
            'HTTP://LOCALHOST:3000',
          ),
          'http://localhost:3000',
        );
      },
    );

    it(
      'normalizes default HTTPS port',
      () => {
        assert.equal(
          normalizeHttpOrigin(
            'https://example.com:443',
          ),
          'https://example.com',
        );
      },
    );

    it(
      'accepts plain localhost origin',
      () => {
        assert.equal(
          normalizeHttpOrigin(
            'http://localhost:3000',
          ),
          EXPECTED_ORIGIN,
        );
      },
    );

    it(
      'rejects origin with a path',
      () => {
        assert.throws(
          () =>
            normalizeHttpOrigin(
              'http://localhost:3000/auth',
            ),
          DomainError,
        );
      },
    );

    it(
      'rejects origin with a query string',
      () => {
        assert.throws(
          () =>
            normalizeHttpOrigin(
              'http://localhost:3000/?source=test',
            ),
          DomainError,
        );
      },
    );

    it(
      'rejects origin with a fragment',
      () => {
        assert.throws(
          () =>
            normalizeHttpOrigin(
              'http://localhost:3000/#auth',
            ),
          DomainError,
        );
      },
    );

    it(
      'rejects origin credentials',
      () => {
        assert.throws(
          () =>
            normalizeHttpOrigin(
              'http://user:password@localhost:3000',
            ),
          DomainError,
        );
      },
    );

    it(
      'rejects non-HTTP protocol',
      () => {
        assert.throws(
          () =>
            normalizeHttpOrigin(
              'file://localhost',
            ),
          DomainError,
        );
      },
    );

    it(
      'throws for malformed absolute origin',
      () => {
        assert.throws(
          () =>
            normalizeHttpOrigin(
              'not-an-origin',
            ),
          Error,
        );
      },
    );
  },
);

describe(
  'trusted request origin',
  () => {
    it(
      'allows matching origin for POST',
      () => {
        assert.doesNotThrow(
          () =>
            assertTrustedRequestOrigin({
              method:
                'POST',
              origin:
                EXPECTED_ORIGIN,
              expectedOrigin:
                EXPECTED_ORIGIN,
            }),
        );
      },
    );

    it(
      'allows equivalent normalized origin',
      () => {
        assert.doesNotThrow(
          () =>
            assertTrustedRequestOrigin({
              method:
                'POST',
              origin:
                'HTTP://LOCALHOST:3000',
              expectedOrigin:
                EXPECTED_ORIGIN,
            }),
        );
      },
    );

    it(
      'requires Origin for POST',
      async () => {
        await expectDomainError(
          () =>
            assertTrustedRequestOrigin({
              method:
                'POST',
              origin:
                null,
              expectedOrigin:
                EXPECTED_ORIGIN,
            }),
          'UNAUTHENTICATED',
        );
      },
    );

    it(
      'requires Origin for PUT',
      async () => {
        await expectDomainError(
          () =>
            assertTrustedRequestOrigin({
              method:
                'PUT',
              origin:
                undefined,
              expectedOrigin:
                EXPECTED_ORIGIN,
            }),
          'UNAUTHENTICATED',
        );
      },
    );

    it(
      'requires Origin for PATCH',
      async () => {
        await expectDomainError(
          () =>
            assertTrustedRequestOrigin({
              method:
                'PATCH',
              origin:
                '',
              expectedOrigin:
                EXPECTED_ORIGIN,
            }),
          'UNAUTHENTICATED',
        );
      },
    );

    it(
      'requires Origin for DELETE',
      async () => {
        await expectDomainError(
          () =>
            assertTrustedRequestOrigin({
              method:
                'DELETE',
              origin:
                null,
              expectedOrigin:
                EXPECTED_ORIGIN,
            }),
          'UNAUTHENTICATED',
        );
      },
    );

    it(
      'rejects a different origin',
      async () => {
        await expectDomainError(
          () =>
            assertTrustedRequestOrigin({
              method:
                'POST',
              origin:
                'https://evil.example',
              expectedOrigin:
                EXPECTED_ORIGIN,
            }),
          'UNAUTHENTICATED',
        );
      },
    );

    it(
      'converts malformed request origin into UNAUTHENTICATED',
      async () => {
        await expectDomainError(
          () =>
            assertTrustedRequestOrigin({
              method:
                'POST',
              origin:
                'not-an-origin',
              expectedOrigin:
                EXPECTED_ORIGIN,
            }),
          'UNAUTHENTICATED',
        );
      },
    );

    it(
      'does not require Origin for GET',
      () => {
        assert.doesNotThrow(
          () =>
            assertTrustedRequestOrigin({
              method:
                'GET',
              origin:
                null,
              expectedOrigin:
                EXPECTED_ORIGIN,
            }),
        );
      },
    );

    it(
      'does not require Origin for HEAD',
      () => {
        assert.doesNotThrow(
          () =>
            assertTrustedRequestOrigin({
              method:
                'HEAD',
              origin:
                undefined,
              expectedOrigin:
                EXPECTED_ORIGIN,
            }),
        );
      },
    );

    it(
      'rejects an invalid HTTP method',
      async () => {
        await expectDomainError(
          () =>
            assertTrustedRequestOrigin({
              method:
                'POST /api/test',
              origin:
                EXPECTED_ORIGIN,
              expectedOrigin:
                EXPECTED_ORIGIN,
            }),
          'INVALID_INPUT',
        );
      },
    );
  },
);

describe(
  'session identity binding',
  () => {
    it(
      'accepts matching wallet, chain, and active session',
      () => {
        assert.doesNotThrow(
          () =>
            assertSessionBinding({
              session:
                sessionClaims(),
              expectedWallet:
                USER_WALLET,
              expectedChainId:
                ARBITRUM_SEPOLIA_CHAIN_ID,
              now:
                NOW,
            }),
        );
      },
    );

    it(
      'compares valid wallet representations case-insensitively',
      () => {
        const lowercaseWallet =
          '0x5472ca834b67de0e54833e6f779725b4e77ca893' as Address;

        const checksummedWallet =
          '0x5472CA834B67De0E54833e6F779725B4E77CA893' as Address;

        assert.doesNotThrow(
          () =>
            assertSessionBinding({
              session:
                sessionClaims({
                  wallet:
                    lowercaseWallet,
                }),
              expectedWallet:
                checksummedWallet,
              expectedChainId:
                ARBITRUM_SEPOLIA_CHAIN_ID,
              now:
                NOW,
            }),
        );
      },
    );

    it(
      'rejects wallet mismatch',
      async () => {
        await expectDomainError(
          () =>
            assertSessionBinding({
              session:
                sessionClaims(),
              expectedWallet:
                OTHER_WALLET,
              expectedChainId:
                ARBITRUM_SEPOLIA_CHAIN_ID,
              now:
                NOW,
            }),
          'RESOURCE_FORBIDDEN',
        );
      },
    );

    it(
      'rejects session chain mismatch',
      async () => {
        await expectDomainError(
          () =>
            assertSessionBinding({
              session:
                sessionClaims({
                  chainId:
                    1,
                }),
              expectedWallet:
                USER_WALLET,
              expectedChainId:
                ARBITRUM_SEPOLIA_CHAIN_ID,
              now:
                NOW,
            }),
          'WRONG_NETWORK',
        );
      },
    );

    it(
      'rejects unsupported expected chain',
      async () => {
        await expectDomainError(
          () =>
            assertSessionBinding({
              session:
                sessionClaims(),
              expectedWallet:
                USER_WALLET,
              expectedChainId:
                1,
              now:
                NOW,
            }),
          'WRONG_NETWORK',
        );
      },
    );

    it(
      'rejects session exactly at expiration',
      async () => {
        const session =
          sessionClaims({
            expiresAt:
              new Date(
                '2026-11-08T10:00:00.000Z',
              ),
          });

        await expectDomainError(
          () =>
            assertSessionBinding({
              session,
              expectedWallet:
                USER_WALLET,
              expectedChainId:
                ARBITRUM_SEPOLIA_CHAIN_ID,
              now:
                NOW,
            }),
          'SESSION_EXPIRED',
        );
      },
    );

    it(
      'rejects session after expiration',
      async () => {
        const session =
          sessionClaims({
            expiresAt:
              new Date(
                '2026-11-08T09:59:59.999Z',
              ),
          });

        await expectDomainError(
          () =>
            assertSessionBinding({
              session,
              expectedWallet:
                USER_WALLET,
              expectedChainId:
                ARBITRUM_SEPOLIA_CHAIN_ID,
              now:
                NOW,
            }),
          'SESSION_EXPIRED',
        );
      },
    );

    it(
      'rejects invalid evaluation time',
      async () => {
        await expectDomainError(
          () =>
            assertSessionBinding({
              session:
                sessionClaims(),
              expectedWallet:
                USER_WALLET,
              expectedChainId:
                ARBITRUM_SEPOLIA_CHAIN_ID,
              now:
                new Date(
                  Number.NaN,
                ),
            }),
          'INVALID_INPUT',
        );
      },
    );
  },
);

describe(
  'authenticated WalletContext policies',
  () => {
    it(
      'accepts authenticated context on Arbitrum Sepolia',
      () => {
        assert.doesNotThrow(
          () =>
            assertAuthenticatedWalletContext(
              userContext(),
            ),
        );
      },
    );

    it(
      'rejects unauthenticated context',
      async () => {
        await expectDomainError(
          () =>
            assertAuthenticatedWalletContext(
              userContext({
                authenticated:
                  false,
              }),
            ),
          'UNAUTHENTICATED',
        );
      },
    );

    it(
      'rejects context on wrong chain',
      async () => {
        await expectDomainError(
          () =>
            assertAuthenticatedWalletContext(
              userContext({
                chainId:
                  1,
              }),
            ),
          'WRONG_NETWORK',
        );
      },
    );

    it(
      'accepts an available authenticated workspace',
      () => {
        assert.doesNotThrow(
          () =>
            assertAuthenticatedWorkspace(
              guarantorContext(),
              'GUARANTOR',
            ),
        );
      },
    );

    it(
      'rejects unavailable workspace',
      async () => {
        await expectDomainError(
          () =>
            assertAuthenticatedWorkspace(
              userContext(),
              'PLATFORM_ADMIN',
            ),
          'ROLE_FORBIDDEN',
        );
      },
    );

    it(
      'checks authentication before workspace availability',
      async () => {
        await expectDomainError(
          () =>
            assertAuthenticatedWorkspace(
              userContext({
                authenticated:
                  false,
              }),
              'PLATFORM_ADMIN',
            ),
          'UNAUTHENTICATED',
        );
      },
    );
  },
);

describe(
  'WalletContext to domain actor',
  () => {
    it(
      'converts ordinary User context',
      () => {
        const actor =
          walletContextToAuthorizationActor(
            userContext(),
          );

        assert.deepEqual(
          actor,
          {
            wallet:
              USER_WALLET,
            authenticated:
              true,
            chainId:
              ARBITRUM_SEPOLIA_CHAIN_ID,
            expectedChainId:
              ARBITRUM_SEPOLIA_CHAIN_ID,
            userId:
              'user-001',
            kycStatus:
              'VERIFIED',
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
            partner:
              null,
          },
        );

        assert.equal(
          Object.isFrozen(actor),
          true,
        );
      },
    );

    it(
      'converts partner context',
      () => {
        const actor =
          walletContextToAuthorizationActor(
            guarantorContext(),
          );

        assert.deepEqual(
          actor.partner,
          {
            partnerId:
              'partner-guarantor-001',
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

        assert.equal(
          actor.roles.guarantor,
          true,
        );

        assert.equal(
          Object.isFrozen(
            actor.partner,
          ),
          true,
        );
      },
    );

    it(
      'rejects converting unauthenticated context',
      async () => {
        await expectDomainError(
          () =>
            walletContextToAuthorizationActor(
              userContext({
                authenticated:
                  false,
              }),
            ),
          'UNAUTHENTICATED',
        );
      },
    );
  },
);

describe(
  'full authenticated request boundary',
  () => {
    it(
      'authorizes valid mutating User request',
      () => {
        const context =
          userContext();

        const actor =
          assertAuthenticatedRequest({
            method:
              'POST',
            origin:
              EXPECTED_ORIGIN,
            expectedOrigin:
              EXPECTED_ORIGIN,
            session:
              sessionClaims(),
            context,
            workspace:
              'USER',
            now:
              NOW,
          });

        assert.equal(
          actor.wallet,
          USER_WALLET,
        );

        assert.equal(
          actor.authenticated,
          true,
        );
      },
    );

    it(
      'authorizes valid Guarantor workspace request',
      () => {
        const context =
          guarantorContext();

        const actor =
          assertAuthenticatedRequest({
            method:
              'PATCH',
            origin:
              EXPECTED_ORIGIN,
            expectedOrigin:
              EXPECTED_ORIGIN,
            session:
              sessionClaims({
                wallet:
                  GUARANTOR_WALLET,
              }),
            context,
            workspace:
              'GUARANTOR',
            now:
              NOW,
          });

        assert.equal(
          actor.roles.guarantor,
          true,
        );

        assert.equal(
          actor.partner?.type,
          'GUARANTOR',
        );
      },
    );

    it(
      'rejects untrusted origin before producing actor',
      async () => {
        await expectDomainError(
          () =>
            assertAuthenticatedRequest({
              method:
                'POST',
              origin:
                'https://evil.example',
              expectedOrigin:
                EXPECTED_ORIGIN,
              session:
                sessionClaims(),
              context:
                userContext(),
              workspace:
                'USER',
              now:
                NOW,
            }),
          'UNAUTHENTICATED',
        );
      },
    );

    it(
      'rejects unavailable workspace',
      async () => {
        await expectDomainError(
          () =>
            assertAuthenticatedRequest({
              method:
                'POST',
              origin:
                EXPECTED_ORIGIN,
              expectedOrigin:
                EXPECTED_ORIGIN,
              session:
                sessionClaims(),
              context:
                userContext(),
              workspace:
                'PLATFORM_ADMIN',
              now:
                NOW,
            }),
          'ROLE_FORBIDDEN',
        );
      },
    );

    it(
      'rejects body-style wallet impersonation through session mismatch',
      async () => {
        await expectDomainError(
          () =>
            assertAuthenticatedRequest({
              method:
                'POST',
              origin:
                EXPECTED_ORIGIN,
              expectedOrigin:
                EXPECTED_ORIGIN,
              session:
                sessionClaims({
                  wallet:
                    OTHER_WALLET,
                }),
              context:
                userContext(),
              workspace:
                'USER',
              now:
                NOW,
            }),
          'RESOURCE_FORBIDDEN',
        );
      },
    );

    it(
      'allows read-only request without Origin',
      () => {
        const actor =
          assertAuthenticatedRequest({
            method:
              'GET',
            origin:
              null,
            expectedOrigin:
              EXPECTED_ORIGIN,
            session:
              sessionClaims(),
            context:
              userContext(),
            workspace:
              'USER',
            now:
              NOW,
          });

        assert.equal(
          actor.wallet,
          USER_WALLET,
        );
      },
    );

    it(
      'rejects expired session before returning actor',
      async () => {
        await expectDomainError(
          () =>
            assertAuthenticatedRequest({
              method:
                'GET',
              origin:
                null,
              expectedOrigin:
                EXPECTED_ORIGIN,
              session:
                sessionClaims({
                  expiresAt:
                    new Date(
                      NOW.getTime(),
                    ),
                }),
              context:
                userContext(),
              workspace:
                'USER',
              now:
                NOW,
            }),
          'SESSION_EXPIRED',
        );
      },
    );
  },
);
