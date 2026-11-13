// @file packages/auth/src/session.ts

/**
 * Canonical authenticated-session lifecycle for PARALEL.
 *
 * Security properties:
 *
 * - session token dibuat dari cryptographically secure random bytes;
 * - plaintext token hanya diberikan kepada client;
 * - repository hanya menyimpan token hash;
 * - session terikat pada wallet dan chain ID;
 * - session mempunyai expiry dan revocation state;
 * - session dapat dirotasi;
 * - logout dan security revocation didukung;
 * - session tepat pada expiresAt sudah dianggap expired;
 * - cookie selalu HttpOnly, Secure, dan SameSite.
 *
 * File ini tidak bergantung pada Next.js, React, Drizzle, database client,
 * cookie framework, atau Cloudflare Workers.
 */

import {
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from 'node:crypto';

import {
  getAddress,
  isAddress,
  keccak256,
  toBytes,
  type Address,
  type Hex,
} from 'viem';

import {
  ARBITRUM_SEPOLIA_CHAIN_ID,
} from '@paralel/contracts';

import {
  DomainError,
  assertDomain,
} from '@paralel/domain';

import type {
  CreateSessionInput,
  IssuedSession,
  SessionClaims,
  SessionCookieOptions,
  SessionRepository,
  SessionRevocationReason,
  StoredSession,
  ValidateSessionInput,
} from './types';

export const DEFAULT_SESSION_TTL_SECONDS =
  8 * 60 * 60;

export const MIN_SESSION_TTL_SECONDS =
  5 * 60;

export const MAX_SESSION_TTL_SECONDS =
  24 * 60 * 60;

export const SESSION_TOKEN_BYTES =
  32 as const;

export const SESSION_COOKIE_NAME =
  'paralel_session' as const;

export const SESSION_TOKEN_PREFIX =
  'ps_v1_' as const;

export type IssueSessionDependencies =
  Readonly<{
    repository:
      SessionRepository;

    /**
     * Dapat diganti pada test agar hasil deterministik.
     */
    generateSessionId?:
      () => string;

    /**
     * Menghasilkan raw random token material tanpa prefix.
     * Dapat diganti pada test.
     */
    generateTokenMaterial?:
      () => string;
  }>;

export type ValidateSessionDependencies =
  Readonly<{
    repository:
      SessionRepository;

    /**
     * Default true.
     *
     * Jika true, successful validation memperbarui lastSeenAt.
     */
    touchSession?: boolean;
  }>;

export type RotateSessionDependencies =
  IssueSessionDependencies;

function assertValidDate(
  value: Date,
  field: string,
): void {
  assertDomain(
    value instanceof Date &&
      !Number.isNaN(value.getTime()),
    'INVALID_INPUT',
    `${field} must be a valid Date.`,
    {
      details: {
        field,
      },
    },
  );
}

function normalizeWallet(
  wallet: Address,
): Address {
  assertDomain(
    isAddress(wallet),
    'INVALID_INPUT',
    'wallet must be a valid address.',
    {
      details: {
        wallet,
      },
    },
  );

  return getAddress(wallet);
}

function normalizeChainId(
  chainId: number,
): number {
  assertDomain(
    Number.isSafeInteger(chainId) &&
      chainId > 0,
    'INVALID_INPUT',
    'chainId must be a positive integer.',
    {
      details: {
        chainId,
      },
    },
  );

  return chainId;
}

function normalizeTtlSeconds(
  ttlSeconds:
    number | undefined,
): number {
  const normalized =
    ttlSeconds ??
    DEFAULT_SESSION_TTL_SECONDS;

  assertDomain(
    Number.isSafeInteger(normalized),
    'INVALID_INPUT',
    'Session TTL must be an integer.',
    {
      details: {
        ttlSeconds:
          normalized,
      },
    },
  );

  assertDomain(
    normalized >=
      MIN_SESSION_TTL_SECONDS &&
      normalized <=
        MAX_SESSION_TTL_SECONDS,
    'INVALID_INPUT',
    `Session TTL must be between ${MIN_SESSION_TTL_SECONDS} and ${MAX_SESSION_TTL_SECONDS} seconds.`,
    {
      details: {
        ttlSeconds:
          normalized,
      },
    },
  );

  return normalized;
}

function normalizeSessionId(
  sessionId: string,
): string {
  const normalized =
    sessionId.trim();

  assertDomain(
    normalized.length >= 16 &&
      normalized.length <= 128,
    'INVALID_INPUT',
    'sessionId must contain between 16 and 128 characters.',
  );

  assertDomain(
    /^[A-Za-z0-9_-]+$/.test(
      normalized,
    ),
    'INVALID_INPUT',
    'sessionId contains invalid characters.',
  );

  return normalized;
}

function generateSecureSessionId(): string {
  return randomUUID().replaceAll(
    '-',
    '',
  );
}

function generateSecureTokenMaterial(): string {
  return randomBytes(
    SESSION_TOKEN_BYTES,
  ).toString('base64url');
}

function normalizeTokenMaterial(
  value: string,
): string {
  const normalized =
    value.trim();

  assertDomain(
    normalized.length >= 32 &&
      normalized.length <= 256,
    'INVALID_INPUT',
    'Session token material must contain between 32 and 256 characters.',
  );

  assertDomain(
    /^[A-Za-z0-9_-]+$/.test(
      normalized,
    ),
    'INVALID_INPUT',
    'Session token material contains invalid characters.',
  );

  return normalized;
}

export function buildSessionToken(
  tokenMaterial: string,
): string {
  return `${SESSION_TOKEN_PREFIX}${normalizeTokenMaterial(
    tokenMaterial,
  )}`;
}

export function isSessionTokenFormatValid(
  token: unknown,
): token is string {
  if (
    typeof token !== 'string' ||
    !token.startsWith(
      SESSION_TOKEN_PREFIX,
    )
  ) {
    return false;
  }

  const tokenMaterial =
    token.slice(
      SESSION_TOKEN_PREFIX.length,
    );

  return (
    tokenMaterial.length >= 32 &&
    tokenMaterial.length <= 256 &&
    /^[A-Za-z0-9_-]+$/.test(
      tokenMaterial,
    )
  );
}

export function hashSessionToken(
  token: string,
): Hex {
  assertDomain(
    isSessionTokenFormatValid(token),
    'UNAUTHENTICATED',
    'Session token format is invalid.',
  );

  return keccak256(
    toBytes(token),
  );
}

/**
 * Constant-time comparison untuk hash token.
 */
export function sessionTokenHashesEqual(
  left: Hex,
  right: Hex,
): boolean {
  const leftBytes =
    Buffer.from(
      left.slice(2),
      'hex',
    );

  const rightBytes =
    Buffer.from(
      right.slice(2),
      'hex',
    );

  if (
    leftBytes.length !==
    rightBytes.length
  ) {
    return false;
  }

  return timingSafeEqual(
    leftBytes,
    rightBytes,
  );
}

export function getSessionCookieOptions(
  ttlSeconds:
    number =
      DEFAULT_SESSION_TTL_SECONDS,
  sameSite:
    'lax' | 'strict' =
      'lax',
): SessionCookieOptions {
  const normalizedTtl =
    normalizeTtlSeconds(
      ttlSeconds,
    );

  return Object.freeze({
    name:
      SESSION_COOKIE_NAME,
    path:
      '/',
    httpOnly:
      true,
    secure:
      true,
    sameSite,
    maxAgeSeconds:
      normalizedTtl,
  });
}

export function createStoredSession(
  input: Readonly<{
    claims: SessionClaims;
    token: string;
    createdAt?: Date;
  }>,
): StoredSession {
  assertValidDate(
    input.claims.issuedAt,
    'issuedAt',
  );

  assertValidDate(
    input.claims.expiresAt,
    'expiresAt',
  );

  assertDomain(
    input.claims.expiresAt.getTime() >
      input.claims.issuedAt.getTime(),
    'INVALID_INPUT',
    'Session expiresAt must be later than issuedAt.',
  );

  assertDomain(
    Number.isSafeInteger(
      input.claims.generation,
    ) &&
      input.claims.generation >= 1,
    'INVALID_INPUT',
    'Session generation must be a positive integer.',
  );

  const createdAt =
    input.createdAt ??
    input.claims.issuedAt;

  assertValidDate(
    createdAt,
    'createdAt',
  );

  return Object.freeze({
    sessionId:
      normalizeSessionId(
        input.claims.sessionId,
      ),
    tokenHash:
      hashSessionToken(
        input.token,
      ),
    wallet:
      normalizeWallet(
        input.claims.wallet,
      ),
    chainId:
      normalizeChainId(
        input.claims.chainId,
      ),
    issuedAt:
      new Date(
        input.claims.issuedAt.getTime(),
      ),
    expiresAt:
      new Date(
        input.claims.expiresAt.getTime(),
      ),
    lastSeenAt:
      new Date(
        input.claims.issuedAt.getTime(),
      ),
    generation:
      input.claims.generation,
    status:
      'ACTIVE',
    revokedAt:
      null,
    revocationReason:
      null,
    createdAt:
      new Date(
        createdAt.getTime(),
      ),
    updatedAt:
      new Date(
        createdAt.getTime(),
      ),
  });
}

/**
 * Membuat session baru.
 */
export async function issueSession(
  input: CreateSessionInput,
  dependencies:
    IssueSessionDependencies,
  generation = 1,
): Promise<IssuedSession> {
  assertValidDate(
    input.now,
    'now',
  );

  const wallet =
    normalizeWallet(
      input.wallet,
    );

  const chainId =
    normalizeChainId(
      input.chainId,
    );

  assertDomain(
    chainId ===
      ARBITRUM_SEPOLIA_CHAIN_ID,
    'WRONG_NETWORK',
    `Session requires chain ID ${ARBITRUM_SEPOLIA_CHAIN_ID}.`,
    {
      details: {
        expectedChainId:
          ARBITRUM_SEPOLIA_CHAIN_ID,
        receivedChainId:
          chainId,
      },
    },
  );

  assertDomain(
    Number.isSafeInteger(
      generation,
    ) &&
      generation >= 1,
    'INVALID_INPUT',
    'Session generation must be a positive integer.',
    {
      details: {
        generation,
      },
    },
  );

  const ttlSeconds =
    normalizeTtlSeconds(
      input.ttlSeconds,
    );

  const sessionId =
    normalizeSessionId(
      dependencies.generateSessionId?.() ??
        generateSecureSessionId(),
    );

  const tokenMaterial =
    normalizeTokenMaterial(
      dependencies.generateTokenMaterial?.() ??
        generateSecureTokenMaterial(),
    );

  const token =
    buildSessionToken(
      tokenMaterial,
    );

  const issuedAt =
    new Date(
      input.now.getTime(),
    );

  const expiresAt =
    new Date(
      issuedAt.getTime() +
        ttlSeconds * 1_000,
    );

  const claims =
    Object.freeze({
      sessionId,
      wallet,
      chainId,
      issuedAt,
      expiresAt,
      generation,
    }) satisfies SessionClaims;

  await dependencies.repository.create(
    createStoredSession({
      claims,
      token,
      createdAt:
        issuedAt,
    }),
  );

  return Object.freeze({
    token,
    claims,
  });
}

function assertStoredSessionUsable(
  session: StoredSession,
  now: Date,
): void {
  if (
    session.status === 'REVOKED' ||
    session.revokedAt !== null
  ) {
    throw new DomainError(
      'SESSION_EXPIRED',
      'The wallet session has been revoked.',
      {
        details: {
          sessionId:
            session.sessionId,
          revocationReason:
            session.revocationReason,
        },
      },
    );
  }

  if (
    session.status === 'EXPIRED' ||
    now.getTime() >=
      session.expiresAt.getTime()
  ) {
    throw new DomainError(
      'SESSION_EXPIRED',
      'The wallet session has expired.',
      {
        details: {
          sessionId:
            session.sessionId,
          expiresAt:
            session.expiresAt.toISOString(),
        },
      },
    );
  }

  assertDomain(
    session.status === 'ACTIVE',
    'SESSION_EXPIRED',
    'The wallet session is not active.',
    {
      details: {
        sessionId:
          session.sessionId,
        status:
          session.status,
      },
    },
  );
}

/**
 * Memvalidasi plaintext session token terhadap hash yang disimpan.
 */
export async function validateSession(
  input: ValidateSessionInput,
  dependencies:
    ValidateSessionDependencies,
): Promise<SessionClaims> {
  assertValidDate(
    input.now,
    'now',
  );

  const expectedChainId =
    normalizeChainId(
      input.expectedChainId,
    );

  assertDomain(
    expectedChainId ===
      ARBITRUM_SEPOLIA_CHAIN_ID,
    'WRONG_NETWORK',
    `Session validation requires chain ID ${ARBITRUM_SEPOLIA_CHAIN_ID}.`,
    {
      details: {
        expectedChainId:
          ARBITRUM_SEPOLIA_CHAIN_ID,
        receivedChainId:
          expectedChainId,
      },
    },
  );

  const tokenHash =
    hashSessionToken(
      input.token,
    );

  const stored =
    await dependencies.repository.findByTokenHash(
      tokenHash,
    );

  if (!stored) {
    throw new DomainError(
      'UNAUTHENTICATED',
      'Session token was not found.',
    );
  }

  assertDomain(
    sessionTokenHashesEqual(
      tokenHash,
      stored.tokenHash,
    ),
    'UNAUTHENTICATED',
    'Session token does not match the stored session.',
  );

  assertStoredSessionUsable(
    stored,
    input.now,
  );

  assertDomain(
    stored.chainId ===
      expectedChainId,
    'WRONG_NETWORK',
    'Session belongs to a different chain.',
    {
      details: {
        sessionChainId:
          stored.chainId,
        expectedChainId,
      },
    },
  );

  if (
    dependencies.touchSession ??
    true
  ) {
    const touched =
      await dependencies.repository.touch({
        sessionId:
          stored.sessionId,
        lastSeenAt:
          new Date(
            input.now.getTime(),
          ),
      });

    if (!touched) {
      throw new DomainError(
        'SESSION_EXPIRED',
        'Session could not be refreshed because it is no longer active.',
        {
          details: {
            sessionId:
              stored.sessionId,
          },
        },
      );
    }
  }

  return Object.freeze({
    sessionId:
      stored.sessionId,
    wallet:
      stored.wallet,
    chainId:
      stored.chainId,
    issuedAt:
      new Date(
        stored.issuedAt.getTime(),
      ),
    expiresAt:
      new Date(
        stored.expiresAt.getTime(),
      ),
    generation:
      stored.generation,
  });
}

export async function revokeSession(
  input: Readonly<{
    sessionId: string;
    reason:
      SessionRevocationReason;
    now: Date;
  }>,
  repository:
    SessionRepository,
): Promise<boolean> {
  const sessionId =
    normalizeSessionId(
      input.sessionId,
    );

  assertValidDate(
    input.now,
    'now',
  );

  return repository.revoke({
    sessionId,
    revokedAt:
      new Date(
        input.now.getTime(),
      ),
    reason:
      input.reason,
  });
}

export async function revokeAllWalletSessions(
  input: Readonly<{
    wallet: Address;
    reason:
      SessionRevocationReason;
    now: Date;
  }>,
  repository:
    SessionRepository,
): Promise<number> {
  const wallet =
    normalizeWallet(
      input.wallet,
    );

  assertValidDate(
    input.now,
    'now',
  );

  return repository.revokeAllForWallet({
    wallet,
    revokedAt:
      new Date(
        input.now.getTime(),
      ),
    reason:
      input.reason,
  });
}

/**
 * Merotasi session dengan urutan:
 *
 * 1. issue session baru;
 * 2. revoke session lama;
 * 3. jika revoke session lama gagal, revoke session baru dan throw.
 *
 * Database adapter sebaiknya melakukan operasi ini dalam satu transaction.
 */
export async function rotateSession(
  input: Readonly<{
    currentSession:
      SessionClaims;
    now: Date;
    ttlSeconds?: number;
  }>,
  dependencies:
    RotateSessionDependencies,
): Promise<IssuedSession> {
  assertValidDate(
    input.now,
    'now',
  );

  assertDomain(
    input.currentSession.expiresAt.getTime() >
      input.now.getTime(),
    'SESSION_EXPIRED',
    'Cannot rotate an expired session.',
  );

  const nextSession =
    await issueSession(
      {
        wallet:
          input.currentSession.wallet,
        chainId:
          input.currentSession.chainId,
        now:
          input.now,
        ttlSeconds:
          input.ttlSeconds,
      },
      dependencies,
      input.currentSession.generation +
        1,
    );

  const oldRevoked =
    await dependencies.repository.revoke({
      sessionId:
        input.currentSession.sessionId,
      revokedAt:
        new Date(
          input.now.getTime(),
        ),
      reason:
        'SESSION_ROTATED',
    });

  if (!oldRevoked) {
    await dependencies.repository.revoke({
      sessionId:
        nextSession.claims.sessionId,
      revokedAt:
        new Date(
          input.now.getTime(),
        ),
      reason:
        'SECURITY_EVENT',
    });

    throw new DomainError(
      'SESSION_EXPIRED',
      'Session rotation failed because the current session is no longer active.',
      {
        details: {
          currentSessionId:
            input.currentSession.sessionId,
          nextSessionId:
            nextSession.claims.sessionId,
        },
      },
    );
  }

  return nextSession;
}
