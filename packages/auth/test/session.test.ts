// @file packages/auth/test/session.test.ts

import assert from 'node:assert/strict';
import {
  describe,
  it,
} from 'node:test';

import type {
  Address,
  Hex,
} from 'viem';

import {
  ARBITRUM_SEPOLIA_CHAIN_ID,
} from '@paralel/contracts';

import {
  DomainError,
} from '@paralel/domain';

import {
  DEFAULT_SESSION_TTL_SECONDS,
  MAX_SESSION_TTL_SECONDS,
  MIN_SESSION_TTL_SECONDS,
  SESSION_COOKIE_NAME,
  SESSION_TOKEN_PREFIX,
  buildSessionToken,
  createStoredSession,
  getSessionCookieOptions,
  hashSessionToken,
  isSessionTokenFormatValid,
  issueSession,
  revokeAllWalletSessions,
  revokeSession,
  rotateSession,
  sessionTokenHashesEqual,
  validateSession,
} from '../src/session';

import type {
  SessionRepository,
  SessionRevocationReason,
  StoredSession,
} from '../src/types';

const WALLET =
  '0x1111111111111111111111111111111111111111' as Address;

const OTHER_WALLET =
  '0x2222222222222222222222222222222222222222' as Address;

const NOW =
  new Date(
    '2026-11-08T10:00:00.000Z',
  );

const SESSION_ID =
  'session000000000000000000000001';

const NEXT_SESSION_ID =
  'session000000000000000000000002';

const TOKEN_MATERIAL =
  'abcdefghijklmnopqrstuvwxyzABCDEFG_1234567890';

const NEXT_TOKEN_MATERIAL =
  'ZYXWVUTSRQPONMLKJIHGFEDCBA9876543210_abcd';

function cloneStoredSession(
  value: StoredSession,
): StoredSession {
  return {
    ...value,
    issuedAt:
      new Date(
        value.issuedAt.getTime(),
      ),
    expiresAt:
      new Date(
        value.expiresAt.getTime(),
      ),
    lastSeenAt:
      new Date(
        value.lastSeenAt.getTime(),
      ),
    revokedAt:
      value.revokedAt
        ? new Date(
            value.revokedAt.getTime(),
          )
        : null,
    createdAt:
      new Date(
        value.createdAt.getTime(),
      ),
    updatedAt:
      new Date(
        value.updatedAt.getTime(),
      ),
  };
}

class MemorySessionRepository
  implements SessionRepository
{
  private readonly records =
    new Map<
      string,
      StoredSession
    >();

  createCalls = 0;
  findCalls = 0;
  touchCalls = 0;
  revokeCalls = 0;
  revokeAllCalls = 0;

  failTouch = false;
  failRevokeSessionIds =
    new Set<string>();

  async create(
    session: StoredSession,
  ): Promise<void> {
    this.createCalls += 1;

    if (
      this.records.has(
        session.sessionId,
      )
    ) {
      throw new Error(
        'Duplicate session ID',
      );
    }

    for (
      const existing
      of this.records.values()
    ) {
      if (
        existing.tokenHash.toLowerCase() ===
        session.tokenHash.toLowerCase()
      ) {
        throw new Error(
          'Duplicate session token hash',
        );
      }
    }

    this.records.set(
      session.sessionId,
      cloneStoredSession(
        session,
      ),
    );
  }

  async findByTokenHash(
    tokenHash: Hex,
  ): Promise<
    StoredSession | null
  > {
    this.findCalls += 1;

    for (
      const session
      of this.records.values()
    ) {
      if (
        sessionTokenHashesEqual(
          session.tokenHash,
          tokenHash,
        )
      ) {
        return cloneStoredSession(
          session,
        );
      }
    }

    return null;
  }

  async touch(
    input: Readonly<{
      sessionId: string;
      lastSeenAt: Date;
    }>,
  ): Promise<boolean> {
    this.touchCalls += 1;

    if (this.failTouch) {
      return false;
    }

    const current =
      this.records.get(
        input.sessionId,
      );

    if (
      !current ||
      current.status !== 'ACTIVE' ||
      current.revokedAt !== null ||
      input.lastSeenAt.getTime() >=
        current.expiresAt.getTime()
    ) {
      return false;
    }

    this.records.set(
      input.sessionId,
      {
        ...current,
        lastSeenAt:
          new Date(
            input.lastSeenAt.getTime(),
          ),
        updatedAt:
          new Date(
            input.lastSeenAt.getTime(),
          ),
      },
    );

    return true;
  }

  async revoke(
    input: Readonly<{
      sessionId: string;
      revokedAt: Date;
      reason:
        SessionRevocationReason;
    }>,
  ): Promise<boolean> {
    this.revokeCalls += 1;

    if (
      this.failRevokeSessionIds.has(
        input.sessionId,
      )
    ) {
      return false;
    }

    const current =
      this.records.get(
        input.sessionId,
      );

    if (
      !current ||
      current.status !== 'ACTIVE' ||
      current.revokedAt !== null
    ) {
      return false;
    }

    this.records.set(
      input.sessionId,
      {
        ...current,
        status:
          'REVOKED',
        revokedAt:
          new Date(
            input.revokedAt.getTime(),
          ),
        revocationReason:
          input.reason,
        updatedAt:
          new Date(
            input.revokedAt.getTime(),
          ),
      },
    );

    return true;
  }

  async revokeAllForWallet(
    input: Readonly<{
      wallet: Address;
      revokedAt: Date;
      reason:
        SessionRevocationReason;
    }>,
  ): Promise<number> {
    this.revokeAllCalls += 1;

    let revokedCount = 0;

    for (
      const [
        sessionId,
        current,
      ] of this.records.entries()
    ) {
      if (
        current.wallet.toLowerCase() !==
          input.wallet.toLowerCase() ||
        current.status !== 'ACTIVE' ||
        current.revokedAt !== null
      ) {
        continue;
      }

      this.records.set(
        sessionId,
        {
          ...current,
          status:
            'REVOKED',
          revokedAt:
            new Date(
              input.revokedAt.getTime(),
            ),
          revocationReason:
            input.reason,
          updatedAt:
            new Date(
              input.revokedAt.getTime(),
            ),
        },
      );

      revokedCount += 1;
    }

    return revokedCount;
  }

  seed(
    session: StoredSession,
  ): void {
    this.records.set(
      session.sessionId,
      cloneStoredSession(
        session,
      ),
    );
  }

  get(
    sessionId: string,
  ): StoredSession | null {
    const session =
      this.records.get(
        sessionId,
      );

    return session
      ? cloneStoredSession(
          session,
        )
      : null;
  }

  all(): StoredSession[] {
    return Array.from(
      this.records.values(),
      cloneStoredSession,
    );
  }
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

async function issueTestSession(
  repository:
    SessionRepository,
  overrides: Partial<{
    wallet: Address;
    chainId: number;
    now: Date;
    ttlSeconds: number;
    sessionId: string;
    tokenMaterial: string;
    generation: number;
  }> = {},
) {
  return issueSession(
    {
      wallet:
        overrides.wallet ??
        WALLET,
      chainId:
        overrides.chainId ??
        ARBITRUM_SEPOLIA_CHAIN_ID,
      now:
        overrides.now ??
        NOW,
      ttlSeconds:
        overrides.ttlSeconds,
    },
    {
      repository,
      generateSessionId:
        () =>
          overrides.sessionId ??
          SESSION_ID,
      generateTokenMaterial:
        () =>
          overrides.tokenMaterial ??
          TOKEN_MATERIAL,
    },
    overrides.generation ??
      1,
  );
}

describe(
  'session token security',
  () => {
    it(
      'builds a prefixed session token',
      () => {
        const token =
          buildSessionToken(
            TOKEN_MATERIAL,
          );

        assert.equal(
          token,
          `${SESSION_TOKEN_PREFIX}${TOKEN_MATERIAL}`,
        );
      },
    );

    it(
      'recognizes valid session token format',
      () => {
        const token =
          buildSessionToken(
            TOKEN_MATERIAL,
          );

        assert.equal(
          isSessionTokenFormatValid(
            token,
          ),
          true,
        );

        assert.equal(
          isSessionTokenFormatValid(
            TOKEN_MATERIAL,
          ),
          false,
        );

        assert.equal(
          isSessionTokenFormatValid(
            null,
          ),
          false,
        );
      },
    );

    it(
      'rejects invalid token material',
      () => {
        assert.throws(
          () =>
            buildSessionToken(
              'short',
            ),
          DomainError,
        );

        assert.throws(
          () =>
            buildSessionToken(
              `${TOKEN_MATERIAL}!`,
            ),
          DomainError,
        );
      },
    );

    it(
      'hashes the complete prefixed session token',
      () => {
        const token =
          buildSessionToken(
            TOKEN_MATERIAL,
          );

        const hash =
          hashSessionToken(
            token,
          );

        assert.match(
          hash,
          /^0x[0-9a-f]{64}$/i,
        );

        assert.equal(
          hashSessionToken(token),
          hash,
        );
      },
    );

    it(
      'rejects hashing an invalid token format',
      () => {
        assert.throws(
          () =>
            hashSessionToken(
              TOKEN_MATERIAL,
            ),
          DomainError,
        );
      },
    );

    it(
      'compares equal token hashes',
      () => {
        const hash =
          hashSessionToken(
            buildSessionToken(
              TOKEN_MATERIAL,
            ),
          );

        assert.equal(
          sessionTokenHashesEqual(
            hash,
            hash,
          ),
          true,
        );
      },
    );

    it(
      'detects different token hashes',
      () => {
        const left =
          hashSessionToken(
            buildSessionToken(
              TOKEN_MATERIAL,
            ),
          );

        const right =
          hashSessionToken(
            buildSessionToken(
              NEXT_TOKEN_MATERIAL,
            ),
          );

        assert.equal(
          sessionTokenHashesEqual(
            left,
            right,
          ),
          false,
        );
      },
    );
  },
);

describe(
  'session cookie security',
  () => {
    it(
      'builds the canonical secure cookie options',
      () => {
        const options =
          getSessionCookieOptions();

        assert.deepEqual(
          options,
          {
            name:
              SESSION_COOKIE_NAME,
            path:
              '/',
            httpOnly:
              true,
            secure:
              true,
            sameSite:
              'lax',
            maxAgeSeconds:
              DEFAULT_SESSION_TTL_SECONDS,
          },
        );

        assert.equal(
          Object.isFrozen(
            options,
          ),
          true,
        );
      },
    );

    it(
      'supports strict SameSite policy',
      () => {
        const options =
          getSessionCookieOptions(
            MIN_SESSION_TTL_SECONDS,
            'strict',
          );

        assert.equal(
          options.sameSite,
          'strict',
        );

        assert.equal(
          options.maxAgeSeconds,
          MIN_SESSION_TTL_SECONDS,
        );
      },
    );

    it(
      'rejects cookie TTL outside the session range',
      () => {
        assert.throws(
          () =>
            getSessionCookieOptions(
              MIN_SESSION_TTL_SECONDS -
                1,
            ),
          DomainError,
        );

        assert.throws(
          () =>
            getSessionCookieOptions(
              MAX_SESSION_TTL_SECONDS +
                1,
            ),
          DomainError,
        );
      },
    );
  },
);

describe(
  'session issuance',
  () => {
    it(
      'issues an eight-hour session by default',
      async () => {
        const repository =
          new MemorySessionRepository();

        const issued =
          await issueTestSession(
            repository,
          );

        assert.equal(
          DEFAULT_SESSION_TTL_SECONDS,
          28_800,
        );

        assert.equal(
          issued.token,
          `${SESSION_TOKEN_PREFIX}${TOKEN_MATERIAL}`,
        );

        assert.deepEqual(
          issued.claims,
          {
            sessionId:
              SESSION_ID,
            wallet:
              WALLET,
            chainId:
              ARBITRUM_SEPOLIA_CHAIN_ID,
            issuedAt:
              NOW,
            expiresAt:
              new Date(
                '2026-11-08T18:00:00.000Z',
              ),
            generation:
              1,
          },
        );

        assert.equal(
          repository.createCalls,
          1,
        );
      },
    );

    it(
      'stores only the token hash',
      async () => {
        const repository =
          new MemorySessionRepository();

        const issued =
          await issueTestSession(
            repository,
          );

        const stored =
          repository.get(
            SESSION_ID,
          );

        assert.ok(stored);

        assert.equal(
          stored.tokenHash,
          hashSessionToken(
            issued.token,
          ),
        );

        assert.equal(
          Object.hasOwn(
            stored,
            'token',
          ),
          false,
        );

        assert.equal(
          stored.status,
          'ACTIVE',
        );

        assert.equal(
          stored.revokedAt,
          null,
        );

        assert.equal(
          stored.revocationReason,
          null,
        );
      },
    );

    it(
      'accepts minimum session TTL',
      async () => {
        const repository =
          new MemorySessionRepository();

        const issued =
          await issueTestSession(
            repository,
            {
              ttlSeconds:
                MIN_SESSION_TTL_SECONDS,
            },
          );

        assert.equal(
          issued.claims.expiresAt.getTime() -
            issued.claims.issuedAt.getTime(),
          MIN_SESSION_TTL_SECONDS *
            1_000,
        );
      },
    );

    it(
      'accepts maximum session TTL',
      async () => {
        const repository =
          new MemorySessionRepository();

        const issued =
          await issueTestSession(
            repository,
            {
              ttlSeconds:
                MAX_SESSION_TTL_SECONDS,
            },
          );

        assert.equal(
          issued.claims.expiresAt.getTime() -
            issued.claims.issuedAt.getTime(),
          MAX_SESSION_TTL_SECONDS *
            1_000,
        );
      },
    );

    it(
      'rejects TTL below minimum',
      async () => {
        const repository =
          new MemorySessionRepository();

        await expectDomainError(
          () =>
            issueTestSession(
              repository,
              {
                ttlSeconds:
                  MIN_SESSION_TTL_SECONDS -
                  1,
              },
            ),
          'INVALID_INPUT',
        );
      },
    );

    it(
      'rejects TTL above maximum',
      async () => {
        const repository =
          new MemorySessionRepository();

        await expectDomainError(
          () =>
            issueTestSession(
              repository,
              {
                ttlSeconds:
                  MAX_SESSION_TTL_SECONDS +
                  1,
              },
            ),
          'INVALID_INPUT',
        );
      },
    );

    it(
      'rejects a fractional TTL',
      async () => {
        const repository =
          new MemorySessionRepository();

        await expectDomainError(
          () =>
            issueTestSession(
              repository,
              {
                ttlSeconds:
                  300.5,
              },
            ),
          'INVALID_INPUT',
        );
      },
    );

    it(
      'rejects wrong chain issuance',
      async () => {
        const repository =
          new MemorySessionRepository();

        await expectDomainError(
          () =>
            issueTestSession(
              repository,
              {
                chainId:
                  1,
              },
            ),
          'WRONG_NETWORK',
        );

        assert.equal(
          repository.createCalls,
          0,
        );
      },
    );

    it(
      'rejects invalid generation',
      async () => {
        const repository =
          new MemorySessionRepository();

        await expectDomainError(
          () =>
            issueTestSession(
              repository,
              {
                generation:
                  0,
              },
            ),
          'INVALID_INPUT',
        );
      },
    );

    it(
      'rejects invalid generated session ID',
      async () => {
        const repository =
          new MemorySessionRepository();

        await expectDomainError(
          () =>
            issueTestSession(
              repository,
              {
                sessionId:
                  'short',
              },
            ),
          'INVALID_INPUT',
        );
      },
    );

    it(
      'rejects invalid generated token material',
      async () => {
        const repository =
          new MemorySessionRepository();

        await expectDomainError(
          () =>
            issueTestSession(
              repository,
              {
                tokenMaterial:
                  'invalid!',
              },
            ),
          'INVALID_INPUT',
        );
      },
    );
  },
);

describe(
  'stored session creation',
  () => {
    it(
      'creates defensive Date copies',
      async () => {
        const repository =
          new MemorySessionRepository();

        const issued =
          await issueTestSession(
            repository,
          );

        const stored =
          createStoredSession({
            claims:
              issued.claims,
            token:
              issued.token,
          });

        assert.notEqual(
          stored.issuedAt,
          issued.claims.issuedAt,
        );

        assert.notEqual(
          stored.expiresAt,
          issued.claims.expiresAt,
        );

        assert.equal(
          stored.issuedAt.getTime(),
          issued.claims.issuedAt.getTime(),
        );

        assert.equal(
          stored.expiresAt.getTime(),
          issued.claims.expiresAt.getTime(),
        );
      },
    );

    it(
      'rejects expiresAt before issuedAt',
      () => {
        assert.throws(
          () =>
            createStoredSession({
              claims: {
                sessionId:
                  SESSION_ID,
                wallet:
                  WALLET,
                chainId:
                  ARBITRUM_SEPOLIA_CHAIN_ID,
                issuedAt:
                  NOW,
                expiresAt:
                  new Date(
                    NOW.getTime() - 1,
                  ),
                generation:
                  1,
              },
              token:
                buildSessionToken(
                  TOKEN_MATERIAL,
                ),
            }),
          DomainError,
        );
      },
    );
  },
);

describe(
  'session validation',
  () => {
    it(
      'validates an active session and returns claims',
      async () => {
        const repository =
          new MemorySessionRepository();

        const issued =
          await issueTestSession(
            repository,
          );

        const validated =
          await validateSession(
            {
              token:
                issued.token,
              expectedChainId:
                ARBITRUM_SEPOLIA_CHAIN_ID,
              now:
                new Date(
                  '2026-11-08T11:00:00.000Z',
                ),
            },
            {
              repository,
            },
          );

        assert.deepEqual(
          validated,
          issued.claims,
        );

        assert.equal(
          repository.touchCalls,
          1,
        );

        assert.equal(
          repository.get(
            SESSION_ID,
          )?.lastSeenAt.toISOString(),
          '2026-11-08T11:00:00.000Z',
        );
      },
    );

    it(
      'can validate without touching lastSeenAt',
      async () => {
        const repository =
          new MemorySessionRepository();

        const issued =
          await issueTestSession(
            repository,
          );

        await validateSession(
          {
            token:
              issued.token,
            expectedChainId:
              ARBITRUM_SEPOLIA_CHAIN_ID,
            now:
              new Date(
                '2026-11-08T11:00:00.000Z',
              ),
          },
          {
            repository,
            touchSession:
              false,
          },
        );

        assert.equal(
          repository.touchCalls,
          0,
        );

        assert.equal(
          repository.get(
            SESSION_ID,
          )?.lastSeenAt.toISOString(),
          NOW.toISOString(),
        );
      },
    );

    it(
      'rejects an unknown token',
      async () => {
        const repository =
          new MemorySessionRepository();

        await expectDomainError(
          () =>
            validateSession(
              {
                token:
                  buildSessionToken(
                    TOKEN_MATERIAL,
                  ),
                expectedChainId:
                  ARBITRUM_SEPOLIA_CHAIN_ID,
                now:
                  NOW,
              },
              {
                repository,
              },
            ),
          'UNAUTHENTICATED',
        );
      },
    );

    it(
      'rejects invalid token format',
      async () => {
        const repository =
          new MemorySessionRepository();

        await expectDomainError(
          () =>
            validateSession(
              {
                token:
                  'invalid-token',
                expectedChainId:
                  ARBITRUM_SEPOLIA_CHAIN_ID,
                now:
                  NOW,
              },
              {
                repository,
              },
            ),
          'UNAUTHENTICATED',
        );

        assert.equal(
          repository.findCalls,
          0,
        );
      },
    );

    it(
      'rejects validation on the wrong expected chain',
      async () => {
        const repository =
          new MemorySessionRepository();

        const issued =
          await issueTestSession(
            repository,
          );

        await expectDomainError(
          () =>
            validateSession(
              {
                token:
                  issued.token,
                expectedChainId:
                  1,
                now:
                  new Date(
                    '2026-11-08T11:00:00.000Z',
                  ),
              },
              {
                repository,
              },
            ),
          'WRONG_NETWORK',
        );
      },
    );

    it(
      'rejects session exactly at expiry',
      async () => {
        const repository =
          new MemorySessionRepository();

        const issued =
          await issueTestSession(
            repository,
          );

        await expectDomainError(
          () =>
            validateSession(
              {
                token:
                  issued.token,
                expectedChainId:
                  ARBITRUM_SEPOLIA_CHAIN_ID,
                now:
                  new Date(
                    issued.claims.expiresAt.getTime(),
                  ),
              },
              {
                repository,
              },
            ),
          'SESSION_EXPIRED',
        );

        assert.equal(
          repository.touchCalls,
          0,
        );
      },
    );

    it(
      'rejects session after expiry',
      async () => {
        const repository =
          new MemorySessionRepository();

        const issued =
          await issueTestSession(
            repository,
          );

        await expectDomainError(
          () =>
            validateSession(
              {
                token:
                  issued.token,
                expectedChainId:
                  ARBITRUM_SEPOLIA_CHAIN_ID,
                now:
                  new Date(
                    issued.claims.expiresAt.getTime() +
                      1,
                  ),
              },
              {
                repository,
              },
            ),
          'SESSION_EXPIRED',
        );
      },
    );

    it(
      'rejects a revoked session',
      async () => {
        const repository =
          new MemorySessionRepository();

        const issued =
          await issueTestSession(
            repository,
          );

        await revokeSession(
          {
            sessionId:
              issued.claims.sessionId,
            reason:
              'USER_LOGOUT',
            now:
              new Date(
                '2026-11-08T11:00:00.000Z',
              ),
          },
          repository,
        );

        await expectDomainError(
          () =>
            validateSession(
              {
                token:
                  issued.token,
                expectedChainId:
                  ARBITRUM_SEPOLIA_CHAIN_ID,
                now:
                  new Date(
                    '2026-11-08T11:01:00.000Z',
                  ),
              },
              {
                repository,
              },
            ),
          'SESSION_EXPIRED',
        );
      },
    );

    it(
      'rejects when lastSeen touch loses a revocation race',
      async () => {
        const repository =
          new MemorySessionRepository();

        const issued =
          await issueTestSession(
            repository,
          );

        repository.failTouch =
          true;

        await expectDomainError(
          () =>
            validateSession(
              {
                token:
                  issued.token,
                expectedChainId:
                  ARBITRUM_SEPOLIA_CHAIN_ID,
                now:
                  new Date(
                    '2026-11-08T11:00:00.000Z',
                  ),
              },
              {
                repository,
              },
            ),
          'SESSION_EXPIRED',
        );
      },
    );

    it(
      'returns defensive Date copies',
      async () => {
        const repository =
          new MemorySessionRepository();

        const issued =
          await issueTestSession(
            repository,
          );

        const validated =
          await validateSession(
            {
              token:
                issued.token,
              expectedChainId:
                ARBITRUM_SEPOLIA_CHAIN_ID,
              now:
                new Date(
                  '2026-11-08T11:00:00.000Z',
                ),
            },
            {
              repository,
            },
          );

        assert.notEqual(
          validated.issuedAt,
          issued.claims.issuedAt,
        );

        assert.notEqual(
          validated.expiresAt,
          issued.claims.expiresAt,
        );

        assert.equal(
          validated.issuedAt.getTime(),
          issued.claims.issuedAt.getTime(),
        );
      },
    );
  },
);

describe(
  'session revocation',
  () => {
    it(
      'revokes one active session',
      async () => {
        const repository =
          new MemorySessionRepository();

        const issued =
          await issueTestSession(
            repository,
          );

        const revoked =
          await revokeSession(
            {
              sessionId:
                issued.claims.sessionId,
              reason:
                'USER_LOGOUT',
              now:
                new Date(
                  '2026-11-08T11:00:00.000Z',
                ),
            },
            repository,
          );

        assert.equal(
          revoked,
          true,
        );

        const stored =
          repository.get(
            SESSION_ID,
          );

        assert.equal(
          stored?.status,
          'REVOKED',
        );

        assert.equal(
          stored?.revocationReason,
          'USER_LOGOUT',
        );

        assert.equal(
          stored?.revokedAt?.toISOString(),
          '2026-11-08T11:00:00.000Z',
        );
      },
    );

    it(
      'does not revoke an unknown session',
      async () => {
        const repository =
          new MemorySessionRepository();

        const revoked =
          await revokeSession(
            {
              sessionId:
                SESSION_ID,
              reason:
                'USER_LOGOUT',
              now:
                NOW,
            },
            repository,
          );

        assert.equal(
          revoked,
          false,
        );
      },
    );

    it(
      'revokes all active sessions for one wallet only',
      async () => {
        const repository =
          new MemorySessionRepository();

        await issueTestSession(
          repository,
          {
            sessionId:
              SESSION_ID,
            tokenMaterial:
              TOKEN_MATERIAL,
          },
        );

        await issueTestSession(
          repository,
          {
            sessionId:
              NEXT_SESSION_ID,
            tokenMaterial:
              NEXT_TOKEN_MATERIAL,
          },
        );

        await issueTestSession(
          repository,
          {
            wallet:
              OTHER_WALLET,
            sessionId:
              'session000000000000000000000003',
            tokenMaterial:
              'otherWalletTokenMaterial_abcdefghijklmnopqrstuvwxyz',
          },
        );

        const revokedCount =
          await revokeAllWalletSessions(
            {
              wallet:
                WALLET,
              reason:
                'SECURITY_EVENT',
              now:
                new Date(
                  '2026-11-08T11:00:00.000Z',
                ),
            },
            repository,
          );

        assert.equal(
          revokedCount,
          2,
        );

        const sessions =
          repository.all();

        const walletSessions =
          sessions.filter(
            session =>
              session.wallet.toLowerCase() ===
              WALLET.toLowerCase(),
          );

        assert.equal(
          walletSessions.every(
            session =>
              session.status ===
              'REVOKED',
          ),
          true,
        );

        const otherSession =
          sessions.find(
            session =>
              session.wallet.toLowerCase() ===
              OTHER_WALLET.toLowerCase(),
          );

        assert.equal(
          otherSession?.status,
          'ACTIVE',
        );
      },
    );
  },
);

describe(
  'session rotation',
  () => {
    it(
      'issues a new generation and revokes the old session',
      async () => {
        const repository =
          new MemorySessionRepository();

        const current =
          await issueTestSession(
            repository,
          );

        const rotated =
          await rotateSession(
            {
              currentSession:
                current.claims,
              now:
                new Date(
                  '2026-11-08T11:00:00.000Z',
                ),
            },
            {
              repository,
              generateSessionId:
                () =>
                  NEXT_SESSION_ID,
              generateTokenMaterial:
                () =>
                  NEXT_TOKEN_MATERIAL,
            },
          );

        assert.equal(
          rotated.claims.generation,
          2,
        );

        assert.equal(
          rotated.claims.sessionId,
          NEXT_SESSION_ID,
        );

        assert.equal(
          rotated.claims.wallet,
          current.claims.wallet,
        );

        assert.equal(
          repository.get(
            SESSION_ID,
          )?.status,
          'REVOKED',
        );

        assert.equal(
          repository.get(
            SESSION_ID,
          )?.revocationReason,
          'SESSION_ROTATED',
        );

        assert.equal(
          repository.get(
            NEXT_SESSION_ID,
          )?.status,
          'ACTIVE',
        );
      },
    );

    it(
      'rejects rotation of an expired session',
      async () => {
        const repository =
          new MemorySessionRepository();

        const current =
          await issueTestSession(
            repository,
            {
              ttlSeconds:
                MIN_SESSION_TTL_SECONDS,
            },
          );

        await expectDomainError(
          () =>
            rotateSession(
              {
                currentSession:
                  current.claims,
                now:
                  new Date(
                    current.claims.expiresAt.getTime(),
                  ),
              },
              {
                repository,
                generateSessionId:
                  () =>
                    NEXT_SESSION_ID,
                generateTokenMaterial:
                  () =>
                    NEXT_TOKEN_MATERIAL,
              },
            ),
          'SESSION_EXPIRED',
        );

        assert.equal(
          repository.get(
            NEXT_SESSION_ID,
          ),
          null,
        );
      },
    );

    it(
      'revokes the new session when the old session cannot be revoked',
      async () => {
        const repository =
          new MemorySessionRepository();

        const current =
          await issueTestSession(
            repository,
          );

        repository
          .failRevokeSessionIds
          .add(
            current.claims.sessionId,
          );

        await expectDomainError(
          () =>
            rotateSession(
              {
                currentSession:
                  current.claims,
                now:
                  new Date(
                    '2026-11-08T11:00:00.000Z',
                  ),
              },
              {
                repository,
                generateSessionId:
                  () =>
                    NEXT_SESSION_ID,
                generateTokenMaterial:
                  () =>
                    NEXT_TOKEN_MATERIAL,
              },
            ),
          'SESSION_EXPIRED',
        );

        const nextSession =
          repository.get(
            NEXT_SESSION_ID,
          );

        assert.equal(
          nextSession?.status,
          'REVOKED',
        );

        assert.equal(
          nextSession?.revocationReason,
          'SECURITY_EVENT',
        );
      },
    );

    it(
      'preserves wallet and chain during rotation',
      async () => {
        const repository =
          new MemorySessionRepository();

        const current =
          await issueTestSession(
            repository,
          );

        const rotated =
          await rotateSession(
            {
              currentSession:
                current.claims,
              now:
                new Date(
                  '2026-11-08T11:00:00.000Z',
                ),
              ttlSeconds:
                MIN_SESSION_TTL_SECONDS,
            },
            {
              repository,
              generateSessionId:
                () =>
                  NEXT_SESSION_ID,
              generateTokenMaterial:
                () =>
                  NEXT_TOKEN_MATERIAL,
            },
          );

        assert.equal(
          rotated.claims.wallet,
          current.claims.wallet,
        );

        assert.equal(
          rotated.claims.chainId,
          current.claims.chainId,
        );

        assert.equal(
          rotated.claims.expiresAt.getTime() -
            rotated.claims.issuedAt.getTime(),
          MIN_SESSION_TTL_SECONDS *
            1_000,
        );
      },
    );
  },
);
