// @file packages/auth/src/policies.ts

/**
 * Canonical authentication-boundary policies for PARALEL.
 *
 * File ini menangani:
 *
 * - trusted HTTP origin validation;
 * - session-wallet binding;
 * - session-chain binding;
 * - authenticated WalletContext requirement;
 * - workspace authorization;
 * - conversion WalletContext menjadi AuthorizationActor domain.
 *
 * File ini tidak membaca cookie, request body, database, atau blockchain.
 * HTTP adapter bertanggung jawab mengambil header dan session token, lalu
 * meneruskan fakta terverifikasi ke policy ini.
 */

import {
  getAddress,
  isAddress,
  type Address,
} from 'viem';

import {
  ARBITRUM_SEPOLIA_CHAIN_ID,
} from '@paralel/contracts';

import {
  assertDomain,
  type AuthorizationActor,
} from '@paralel/domain';

import {
  assertWorkspaceAvailable,
} from './role-resolver';

import type {
  SessionClaims,
  WalletContext,
  WorkspaceName,
} from './types';

export const MUTATING_HTTP_METHODS = [
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
] as const;

export type MutatingHttpMethod =
  (typeof MUTATING_HTTP_METHODS)[number];

export type RequestOriginPolicyInput =
  Readonly<{
    method: string;

    /**
     * Nilai header Origin.
     */
    origin:
      | string
      | null
      | undefined;

    /**
     * Origin canonical aplikasi, misalnya:
     *
     * http://localhost:3000
     * https://app.paralel.example
     */
    expectedOrigin: string;
  }>;

export type SessionBindingInput =
  Readonly<{
    session: SessionClaims;

    /**
     * Wallet yang telah diperoleh dari sumber tepercaya.
     *
     * Jangan mengisi field ini langsung dari request body.
     */
    expectedWallet: Address;

    expectedChainId: number;

    now: Date;
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
    isAddress(
      wallet,
      {
        strict: false,
      },
    ),
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

function normalizeHttpMethod(
  method: string,
): string {
  const normalized =
    method.trim().toUpperCase();

  assertDomain(
    /^[A-Z]+$/.test(normalized),
    'INVALID_INPUT',
    'HTTP method is invalid.',
    {
      details: {
        method,
      },
    },
  );

  return normalized;
}

/**
 * Normalizes an HTTP origin to:
 *
 * scheme://host[:port]
 *
 * Paths, query strings, fragments, and credentials are not allowed.
 */
export function normalizeHttpOrigin(
  value: string,
): string {
  const normalized =
    value.trim();

  let parsed: URL;

  try {
    parsed =
      new URL(normalized);
  } catch {
    throw new Error(
      'Origin must be a valid absolute HTTP or HTTPS origin.',
    );
  }

  assertDomain(
    parsed.protocol === 'http:' ||
      parsed.protocol === 'https:',
    'INVALID_INPUT',
    'Origin must use HTTP or HTTPS.',
    {
      details: {
        origin:
          value,
        protocol:
          parsed.protocol,
      },
    },
  );

  assertDomain(
    parsed.username === '' &&
      parsed.password === '',
    'INVALID_INPUT',
    'Origin must not contain credentials.',
  );

  assertDomain(
    parsed.pathname === '/' &&
      parsed.search === '' &&
      parsed.hash === '',
    'INVALID_INPUT',
    'Origin must not contain a path, query string, or fragment.',
    {
      details: {
        origin:
          value,
      },
    },
  );

  return parsed.origin.toLowerCase();
}

export function isMutatingHttpMethod(
  method: string,
): method is MutatingHttpMethod {
  const normalized =
    method.trim().toUpperCase();

  return (
    MUTATING_HTTP_METHODS as readonly string[]
  ).includes(normalized);
}

/**
 * Requires a matching Origin header for mutation requests.
 *
 * Read-only requests do not require Origin here. Their session and resource
 * authorization remain mandatory at the API layer.
 */
export function assertTrustedRequestOrigin(
  input: RequestOriginPolicyInput,
): void {
  const method =
    normalizeHttpMethod(
      input.method,
    );

  if (
    !isMutatingHttpMethod(method)
  ) {
    return;
  }

  assertDomain(
    typeof input.origin ===
      'string' &&
      input.origin.trim().length >
        0,
    'UNAUTHENTICATED',
    'Origin header is required for mutating requests.',
  );

  const expectedOrigin =
    normalizeHttpOrigin(
      input.expectedOrigin,
    );

  let receivedOrigin: string;

  try {
    receivedOrigin =
      normalizeHttpOrigin(
        input.origin,
      );
  } catch {
    assertDomain(
      false,
      'UNAUTHENTICATED',
      'Request origin is invalid.',
    );

    return;
  }

  assertDomain(
    receivedOrigin ===
      expectedOrigin,
    'UNAUTHENTICATED',
    'Request origin is not trusted.',
    {
      details: {
        expectedOrigin,
        receivedOrigin,
      },
    },
  );
}

/**
 * Ensures session identity still matches the expected wallet, chain, and time.
 *
 * The expected wallet must be obtained from a trusted server resource or
 * resolved WalletContext, never accepted as authority from body/query input.
 */
export function assertSessionBinding(
  input: SessionBindingInput,
): void {
  assertValidDate(
    input.now,
    'now',
  );

  const expectedWallet =
    normalizeWallet(
      input.expectedWallet,
    );

  const expectedChainId =
    normalizeChainId(
      input.expectedChainId,
    );

  assertDomain(
    expectedChainId ===
      ARBITRUM_SEPOLIA_CHAIN_ID,
    'WRONG_NETWORK',
    `Session binding requires chain ID ${ARBITRUM_SEPOLIA_CHAIN_ID}.`,
    {
      details: {
        expectedChainId:
          ARBITRUM_SEPOLIA_CHAIN_ID,
        receivedChainId:
          expectedChainId,
      },
    },
  );

  assertDomain(
    input.session.expiresAt.getTime() >
      input.now.getTime(),
    'SESSION_EXPIRED',
    'The wallet session has expired.',
    {
      details: {
        sessionId:
          input.session.sessionId,
        expiresAt:
          input.session.expiresAt.toISOString(),
      },
    },
  );

  assertDomain(
    input.session.wallet.toLowerCase() ===
      expectedWallet.toLowerCase(),
    'RESOURCE_FORBIDDEN',
    'Session wallet does not match the expected wallet.',
    {
      details: {
        sessionWallet:
          input.session.wallet,
        expectedWallet,
      },
    },
  );

  assertDomain(
    input.session.chainId ===
      expectedChainId,
    'WRONG_NETWORK',
    'Session belongs to a different chain.',
    {
      details: {
        sessionChainId:
          input.session.chainId,
        expectedChainId,
      },
    },
  );
}

export function assertAuthenticatedWalletContext(
  context: WalletContext,
): void {
  assertDomain(
    context.authenticated,
    'UNAUTHENTICATED',
    'Authenticated wallet context is required.',
  );

  assertDomain(
    context.chainId ===
      ARBITRUM_SEPOLIA_CHAIN_ID,
    'WRONG_NETWORK',
    `Wallet context requires chain ID ${ARBITRUM_SEPOLIA_CHAIN_ID}.`,
    {
      details: {
        expectedChainId:
          ARBITRUM_SEPOLIA_CHAIN_ID,
        receivedChainId:
          context.chainId,
      },
    },
  );
}

export function assertAuthenticatedWorkspace(
  context: WalletContext,
  workspace: WorkspaceName,
): void {
  assertAuthenticatedWalletContext(
    context,
  );

  assertWorkspaceAvailable(
    context,
    workspace,
  );
}

/**
 * Converts authenticated role resolution into the pure domain actor consumed
 * by @paralel/domain authorization policies.
 */
export function walletContextToAuthorizationActor(
  context: WalletContext,
): AuthorizationActor {
  assertAuthenticatedWalletContext(
    context,
  );

  return Object.freeze({
    wallet:
      context.wallet,
    authenticated:
      true,
    chainId:
      context.chainId,
    expectedChainId:
      ARBITRUM_SEPOLIA_CHAIN_ID,

    userId:
      context.user.userId,
    kycStatus:
      context.user.kycStatus,

    roles:
      context.roles,

    partner:
      context.partnerContext
        ? Object.freeze({
            partnerId:
              context.partnerContext
                .partnerId,
            type:
              context.partnerContext
                .type,
            lifecycleStatus:
              context.partnerContext
                .lifecycleStatus,
            dbActive:
              context.partnerContext
                .dbActive,
            onchainActive:
              context.partnerContext
                .onchainActive,
            syncStatus:
              context.partnerContext
                .syncStatus,
          })
        : null,
  });
}

/**
 * Full request authorization boundary for an authenticated workspace.
 */
export function assertAuthenticatedRequest(
  input: Readonly<{
    method: string;
    origin:
      | string
      | null
      | undefined;
    expectedOrigin: string;

    session: SessionClaims;
    context: WalletContext;
    workspace: WorkspaceName;
    now: Date;
  }>,
): AuthorizationActor {
  assertTrustedRequestOrigin({
    method:
      input.method,
    origin:
      input.origin,
    expectedOrigin:
      input.expectedOrigin,
  });

  assertAuthenticatedWorkspace(
    input.context,
    input.workspace,
  );

  assertSessionBinding({
    session:
      input.session,
    expectedWallet:
      input.context.wallet,
    expectedChainId:
      input.context.chainId,
    now:
      input.now,
  });

  return walletContextToAuthorizationActor(
    input.context,
  );
}
