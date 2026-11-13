// @file packages/auth/src/challenge.ts

/**
 * Canonical wallet-authentication challenge for PARALEL.
 *
 * Security properties:
 *
 * - nonce acak dan single-use;
 * - TTL maksimum lima menit;
 * - challenge terikat pada wallet, chain, domain, dan URI;
 * - hanya nonce hash dan message hash yang disimpan;
 * - signature diverifikasi terhadap message deterministik;
 * - challenge dikonsumsi secara atomik melalui ChallengeRepository;
 * - replay terhadap challenge yang sudah consumed ditolak.
 *
 * File ini tidak bergantung pada Next.js, database client, cookie framework,
 * React, Drizzle, atau Cloudflare Workers.
 */

import {
  randomBytes,
  randomUUID,
} from 'node:crypto';

import {
  getAddress,
  isAddress,
  keccak256,
  toBytes,
  verifyMessage,
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
  ChallengeRepository,
  CreateChallengeInput,
  StoredWalletAuthChallenge,
  VerifiedWalletIdentity,
  VerifyChallengeInput,
  WalletAuthChallenge,
} from './types';

export const AUTH_CHALLENGE_VERSION =
  '1' as const;

export const AUTH_CHALLENGE_HEADER =
  'PARALEL Wallet Authentication' as const;

export const DEFAULT_AUTH_STATEMENT =
  'Sign this message to authenticate with PARALEL. This request does not initiate a blockchain transaction or authorize asset movement.' as const;

export const DEFAULT_CHALLENGE_TTL_SECONDS =
  300 as const;

export const MAX_CHALLENGE_TTL_SECONDS =
  300 as const;

export const MIN_CHALLENGE_TTL_SECONDS =
  30 as const;

export const AUTH_NONCE_BYTES =
  32 as const;

export type CreateWalletChallengeDependencies =
  Readonly<{
    repository:
      ChallengeRepository;

    /**
     * Dapat diganti pada test agar hasil deterministik.
     */
    generateChallengeId?:
      () => string;

    /**
     * Dapat diganti pada test agar hasil deterministik.
     */
    generateNonce?:
      () => string;
  }>;

export type VerifyWalletChallengeDependencies =
  Readonly<{
    repository:
      ChallengeRepository;

    /**
     * Dapat diganti pada test.
     */
    verifySignature?:
      typeof verifyMessage;
  }>;

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

function normalizeDomain(
  domain: string,
): string {
  const normalized =
    domain.trim().toLowerCase();

  assertDomain(
    normalized.length > 0,
    'INVALID_INPUT',
    'domain cannot be empty.',
  );

  assertDomain(
    !normalized.includes('://'),
    'INVALID_INPUT',
    'domain must not include a URI scheme.',
    {
      details: {
        domain,
      },
    },
  );

  assertDomain(
    !normalized.includes('/') &&
      !normalized.includes('?') &&
      !normalized.includes('#'),
    'INVALID_INPUT',
    'domain must contain only the host and optional port.',
    {
      details: {
        domain,
      },
    },
  );

  return normalized;
}

function normalizeUri(
  uri: string,
): string {
  const normalized =
    uri.trim();

  let parsed: URL;

  try {
    parsed = new URL(normalized);
  } catch {
    throw new DomainError(
      'INVALID_INPUT',
      'uri must be a valid absolute URL.',
      {
        details: {
          uri,
        },
      },
    );
  }

  assertDomain(
    parsed.protocol === 'https:' ||
      parsed.protocol === 'http:',
    'INVALID_INPUT',
    'uri must use HTTP or HTTPS.',
    {
      details: {
        uri,
        protocol:
          parsed.protocol,
      },
    },
  );

  assertDomain(
    parsed.username === '' &&
      parsed.password === '',
    'INVALID_INPUT',
    'uri must not contain credentials.',
    {
      details: {
        uri,
      },
    },
  );

  parsed.hash = '';

  return parsed.toString();
}

function assertDomainMatchesUri(
  domain: string,
  uri: string,
): void {
  const parsed =
    new URL(uri);

  assertDomain(
    parsed.host.toLowerCase() ===
      domain.toLowerCase(),
    'INVALID_INPUT',
    'domain must match the URI host.',
    {
      details: {
        domain,
        uriHost:
          parsed.host,
      },
    },
  );
}

function normalizeStatement(
  statement:
    string | undefined,
): string {
  const normalized =
    statement?.trim() ||
    DEFAULT_AUTH_STATEMENT;

  assertDomain(
    normalized.length >= 10 &&
      normalized.length <= 500,
    'INVALID_INPUT',
    'statement must contain between 10 and 500 characters.',
    {
      details: {
        statementLength:
          normalized.length,
      },
    },
  );

  assertDomain(
    !normalized.includes('\r') &&
      !normalized.includes('\n'),
    'INVALID_INPUT',
    'statement must be a single line.',
  );

  return normalized;
}

function normalizeTtlSeconds(
  ttlSeconds:
    number | undefined,
): number {
  const normalized =
    ttlSeconds ??
    DEFAULT_CHALLENGE_TTL_SECONDS;

  assertDomain(
    Number.isSafeInteger(normalized),
    'INVALID_INPUT',
    'Challenge TTL must be an integer.',
    {
      details: {
        ttlSeconds:
          normalized,
      },
    },
  );

  assertDomain(
    normalized >=
      MIN_CHALLENGE_TTL_SECONDS &&
      normalized <=
        MAX_CHALLENGE_TTL_SECONDS,
    'INVALID_INPUT',
    `Challenge TTL must be between ${MIN_CHALLENGE_TTL_SECONDS} and ${MAX_CHALLENGE_TTL_SECONDS} seconds.`,
    {
      details: {
        ttlSeconds:
          normalized,
      },
    },
  );

  return normalized;
}

function assertValidChallengeId(
  challengeId: string,
): string {
  const normalized =
    challengeId.trim();

  assertDomain(
    normalized.length >= 16 &&
      normalized.length <= 128,
    'INVALID_INPUT',
    'challengeId must contain between 16 and 128 characters.',
  );

  assertDomain(
    /^[A-Za-z0-9_-]+$/.test(
      normalized,
    ),
    'INVALID_INPUT',
    'challengeId contains invalid characters.',
  );

  return normalized;
}

function assertValidNonce(
  nonce: string,
): string {
  const normalized =
    nonce.trim();

  assertDomain(
    /^[0-9a-f]{64}$/i.test(
      normalized,
    ),
    'INVALID_INPUT',
    'nonce must be a 32-byte hexadecimal value without 0x prefix.',
  );

  return normalized.toLowerCase();
}

function generateSecureNonce(): string {
  return randomBytes(
    AUTH_NONCE_BYTES,
  ).toString('hex');
}

function generateSecureChallengeId(): string {
  return randomUUID().replaceAll(
    '-',
    '',
  );
}

export function hashAuthValue(
  value: string,
): Hex {
  return keccak256(
    toBytes(value),
  );
}

/**
 * Membentuk message challenge secara deterministik.
 *
 * Jangan mengubah format tanpa menaikkan AUTH_CHALLENGE_VERSION.
 */
export function buildWalletAuthMessage(
  input: Readonly<{
    challengeId: string;
    wallet: Address;
    chainId: number;
    domain: string;
    uri: string;
    statement: string;
    nonce: string;
    issuedAt: Date;
    expiresAt: Date;
  }>,
): string {
  const challengeId =
    assertValidChallengeId(
      input.challengeId,
    );

  const wallet =
    normalizeWallet(
      input.wallet,
    );

  const chainId =
    normalizeChainId(
      input.chainId,
    );

  const domain =
    normalizeDomain(
      input.domain,
    );

  const uri =
    normalizeUri(
      input.uri,
    );

  assertDomainMatchesUri(
    domain,
    uri,
  );

  const statement =
    normalizeStatement(
      input.statement,
    );

  const nonce =
    assertValidNonce(
      input.nonce,
    );

  assertValidDate(
    input.issuedAt,
    'issuedAt',
  );

  assertValidDate(
    input.expiresAt,
    'expiresAt',
  );

  assertDomain(
    input.expiresAt.getTime() >
      input.issuedAt.getTime(),
    'INVALID_INPUT',
    'expiresAt must be later than issuedAt.',
  );

  return [
    AUTH_CHALLENGE_HEADER,
    '',
    statement,
    '',
    `Domain: ${domain}`,
    `URI: ${uri}`,
    `Version: ${AUTH_CHALLENGE_VERSION}`,
    `Chain ID: ${chainId}`,
    `Wallet: ${wallet}`,
    `Challenge ID: ${challengeId}`,
    `Nonce: ${nonce}`,
    `Issued At: ${input.issuedAt.toISOString()}`,
    `Expiration Time: ${input.expiresAt.toISOString()}`,
  ].join('\n');
}

export function createStoredChallenge(
  challenge:
    WalletAuthChallenge,
  now: Date = challenge.issuedAt,
): StoredWalletAuthChallenge {
  assertValidDate(
    now,
    'now',
  );

  return Object.freeze({
    challengeId:
      challenge.challengeId,
    wallet:
      challenge.wallet,
    chainId:
      challenge.chainId,
    domain:
      challenge.domain,
    uri:
      challenge.uri,
    statement:
      challenge.statement,
    nonceHash:
      hashAuthValue(
        challenge.nonce,
      ),
    messageHash:
      hashAuthValue(
        challenge.message,
      ),
    issuedAt:
      new Date(
        challenge.issuedAt.getTime(),
      ),
    expiresAt:
      new Date(
        challenge.expiresAt.getTime(),
      ),
    status:
      'ACTIVE',
    consumedAt:
      null,
    revokedAt:
      null,
    createdAt:
      new Date(now.getTime()),
  });
}

/**
 * Membuat dan menyimpan challenge baru.
 */
export async function issueWalletAuthChallenge(
  input: CreateChallengeInput,
  dependencies:
    CreateWalletChallengeDependencies,
): Promise<WalletAuthChallenge> {
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
    `Authentication requires chain ID ${ARBITRUM_SEPOLIA_CHAIN_ID}.`,
    {
      details: {
        expectedChainId:
          ARBITRUM_SEPOLIA_CHAIN_ID,
        receivedChainId:
          chainId,
      },
    },
  );

  const domain =
    normalizeDomain(
      input.domain,
    );

  const uri =
    normalizeUri(
      input.uri,
    );

  assertDomainMatchesUri(
    domain,
    uri,
  );

  const statement =
    normalizeStatement(
      input.statement,
    );

  const ttlSeconds =
    normalizeTtlSeconds(
      input.ttlSeconds,
    );

  const challengeId =
    assertValidChallengeId(
      dependencies.generateChallengeId?.() ??
        generateSecureChallengeId(),
    );

  const nonce =
    assertValidNonce(
      dependencies.generateNonce?.() ??
        generateSecureNonce(),
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

  const message =
    buildWalletAuthMessage({
      challengeId,
      wallet,
      chainId,
      domain,
      uri,
      statement,
      nonce,
      issuedAt,
      expiresAt,
    });

  const challenge =
    Object.freeze({
      challengeId,
      wallet,
      chainId,
      domain,
      uri,
      statement,
      nonce,
      issuedAt,
      expiresAt,
      message,
    }) satisfies WalletAuthChallenge;

  await dependencies.repository.create(
    createStoredChallenge(
      challenge,
      issuedAt,
    ),
  );

  return challenge;
}

function assertStoredChallengeUsable(
  stored:
    StoredWalletAuthChallenge,
  now: Date,
): void {
  if (
    stored.status === 'CONSUMED' ||
    stored.consumedAt !== null
  ) {
    throw new DomainError(
      'ALREADY_PROCESSED',
      'Authentication challenge has already been consumed.',
      {
        details: {
          challengeId:
            stored.challengeId,
        },
      },
    );
  }

  if (
    stored.status === 'REVOKED' ||
    stored.revokedAt !== null
  ) {
    throw new DomainError(
      'UNAUTHENTICATED',
      'Authentication challenge has been revoked.',
      {
        details: {
          challengeId:
            stored.challengeId,
        },
      },
    );
  }

  if (
    stored.status === 'EXPIRED' ||
    now.getTime() >=
      stored.expiresAt.getTime()
  ) {
    throw new DomainError(
      'SIGNATURE_EXPIRED',
      'Authentication challenge has expired.',
      {
        details: {
          challengeId:
            stored.challengeId,
          expiresAt:
            stored.expiresAt.toISOString(),
        },
      },
    );
  }

  assertDomain(
    stored.status === 'ACTIVE',
    'UNAUTHENTICATED',
    'Authentication challenge is not active.',
    {
      details: {
        challengeId:
          stored.challengeId,
        status:
          stored.status,
      },
    },
  );
}

/**
 * Memverifikasi challenge dan mengonsumsi nonce melalui conditional repository
 * update. Hanya satu request yang boleh memenangkan consume race.
 */
export async function verifyWalletAuthChallenge(
  input: VerifyChallengeInput,
  dependencies:
    VerifyWalletChallengeDependencies,
): Promise<VerifiedWalletIdentity> {
  assertValidDate(
    input.now,
    'now',
  );

  const challengeId =
    assertValidChallengeId(
      input.challengeId,
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
    `Authentication requires chain ID ${ARBITRUM_SEPOLIA_CHAIN_ID}.`,
    {
      details: {
        expectedChainId:
          ARBITRUM_SEPOLIA_CHAIN_ID,
        receivedChainId:
          chainId,
      },
    },
  );

  const domain =
    normalizeDomain(
      input.domain,
    );

  const uri =
    normalizeUri(
      input.uri,
    );

  assertDomainMatchesUri(
    domain,
    uri,
  );

  const stored =
    await dependencies.repository.findById(
      challengeId,
    );

  if (!stored) {
    throw new DomainError(
      'UNAUTHENTICATED',
      'Authentication challenge was not found.',
      {
        details: {
          challengeId,
        },
      },
    );
  }

  assertStoredChallengeUsable(
    stored,
    input.now,
  );

  assertDomain(
    stored.wallet.toLowerCase() ===
      wallet.toLowerCase(),
    'UNAUTHENTICATED',
    'Authentication challenge belongs to a different wallet.',
  );

  assertDomain(
    stored.chainId === chainId,
    'WRONG_NETWORK',
    'Authentication challenge belongs to a different chain.',
    {
      details: {
        expectedChainId:
          stored.chainId,
        receivedChainId:
          chainId,
      },
    },
  );

  assertDomain(
    stored.domain === domain,
    'UNAUTHENTICATED',
    'Authentication challenge belongs to a different domain.',
  );

  assertDomain(
    stored.uri === uri,
    'UNAUTHENTICATED',
    'Authentication challenge belongs to a different URI.',
  );

  const messageHash =
    hashAuthValue(
      input.message,
    );

  assertDomain(
    messageHash.toLowerCase() ===
      stored.messageHash.toLowerCase(),
    'UNAUTHENTICATED',
    'Authentication challenge message has been modified.',
  );

  const verifySignature =
    dependencies.verifySignature ??
    verifyMessage;

  let signatureValid: boolean;

  try {
    signatureValid =
      await verifySignature({
        address:
          wallet,
        message:
          input.message,
        signature:
          input.signature,
      });
  } catch (error: unknown) {
    throw new DomainError(
      'INVALID_SIGNATURE',
      'Authentication signature is invalid.',
      {
        cause:
          error,
      },
    );
  }

  assertDomain(
    signatureValid,
    'INVALID_SIGNATURE',
    'Authentication signature is invalid.',
  );

  /**
   * Repository consume harus berupa conditional update:
   *
   * WHERE challenge_id = ?
   *   AND status = 'ACTIVE'
   *   AND consumed_at IS NULL
   *   AND expires_at > consumedAt
   *
   * Jika dua request berlomba, hanya satu menghasilkan true.
   */
  const consumed =
    await dependencies.repository.consume({
      challengeId:
        stored.challengeId,
      consumedAt:
        new Date(
          input.now.getTime(),
        ),
    });

  if (!consumed) {
    throw new DomainError(
      'ALREADY_PROCESSED',
      'Authentication challenge was already consumed or is no longer active.',
      {
        details: {
          challengeId:
            stored.challengeId,
        },
      },
    );
  }

  return Object.freeze({
    challengeId:
      stored.challengeId,
    wallet,
    chainId,
    verifiedAt:
      new Date(
        input.now.getTime(),
      ),
  });
}

export async function revokeWalletAuthChallenge(
  input: Readonly<{
    challengeId: string;
    now: Date;
  }>,
  repository:
    ChallengeRepository,
): Promise<boolean> {
  const challengeId =
    assertValidChallengeId(
      input.challengeId,
    );

  assertValidDate(
    input.now,
    'now',
  );

  return repository.revoke({
    challengeId,
    revokedAt:
      new Date(
        input.now.getTime(),
      ),
  });
}
