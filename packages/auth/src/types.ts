// @file packages/auth/src/types.ts

/**
 * Canonical authentication and role-resolution types for PARALEL.
 *
 * File ini hanya mendefinisikan kontrak data dan repository ports.
 * Implementasi database, cookie, HTTP, dan RPC berada di layer lain.
 */

import type {
  Address,
  Hex,
} from 'viem';

import type {
  KycStatus,
  PartnerLifecycleStatus,
  PartnerSyncStatus,
  PartnerType,
} from '@paralel/domain';

export const WORKSPACE_NAMES = [
  'USER',
  'GUARANTOR',
  'NOTARY',
  'USER_ADMIN',
  'PLATFORM_ADMIN',
] as const;

export type WorkspaceName =
  (typeof WORKSPACE_NAMES)[number];

export const AUTH_CHALLENGE_STATUSES = [
  'ACTIVE',
  'CONSUMED',
  'EXPIRED',
  'REVOKED',
] as const;

export type AuthChallengeStatus =
  (typeof AUTH_CHALLENGE_STATUSES)[number];

export const AUTH_SESSION_STATUSES = [
  'ACTIVE',
  'EXPIRED',
  'REVOKED',
] as const;

export type AuthSessionStatus =
  (typeof AUTH_SESSION_STATUSES)[number];

export const SESSION_REVOCATION_REASONS = [
  'USER_LOGOUT',
  'SESSION_ROTATED',
  'WALLET_CHANGED',
  'ROLE_CHANGED',
  'ADMIN_REVOKED',
  'SECURITY_EVENT',
] as const;

export type SessionRevocationReason =
  (typeof SESSION_REVOCATION_REASONS)[number];

export type WalletRoleFlags = Readonly<{
  user: true;
  guarantor: boolean;
  notary: boolean;
  userAdmin: boolean;
  platformAdmin: boolean;
}>;

export type AuthenticatedUserContext =
  Readonly<{
    userId: string | null;
    kycStatus: KycStatus;
  }>;

export type AuthenticatedPartnerContext =
  Readonly<{
    partnerId: string;
    wallet: Address;
    type: PartnerType;
    lifecycleStatus:
      PartnerLifecycleStatus;
    dbActive: boolean;
    onchainActive: boolean;
    syncStatus: PartnerSyncStatus;
  }>;

export type WalletContext = Readonly<{
  wallet: Address;
  chainId: number;
  authenticated: boolean;

  user: AuthenticatedUserContext;

  roles: WalletRoleFlags;

  partnerContext:
    | AuthenticatedPartnerContext
    | null;

  availableWorkspaces:
    readonly WorkspaceName[];

  defaultWorkspace:
    WorkspaceName;
}>;

/**
 * Challenge payload yang ditandatangani wallet.
 *
 * Value `message` harus dibentuk secara deterministik oleh challenge.ts.
 */
export type WalletAuthChallenge =
  Readonly<{
    challengeId: string;
    wallet: Address;
    chainId: number;

    domain: string;
    uri: string;
    statement: string;

    nonce: string;

    issuedAt: Date;
    expiresAt: Date;

    message: string;
  }>;

export type StoredWalletAuthChallenge =
  Readonly<{
    challengeId: string;
    wallet: Address;
    chainId: number;

    domain: string;
    uri: string;
    statement: string;

    nonceHash: Hex;
    messageHash: Hex;

    issuedAt: Date;
    expiresAt: Date;

    status:
      AuthChallengeStatus;

    consumedAt:
      | Date
      | null;

    revokedAt:
      | Date
      | null;

    createdAt: Date;
  }>;

export type CreateChallengeInput =
  Readonly<{
    wallet: Address;
    chainId: number;

    domain: string;
    uri: string;

    statement?: string;

    now: Date;

    /**
     * Default ditentukan challenge.ts.
     * Tidak boleh melebihi batas canonical.
     */
    ttlSeconds?: number;
  }>;

export type VerifyChallengeInput =
  Readonly<{
    challengeId: string;
    wallet: Address;
    chainId: number;

    message: string;
    signature: Hex;

    domain: string;
    uri: string;

    now: Date;
  }>;

export type VerifiedWalletIdentity =
  Readonly<{
    challengeId: string;
    wallet: Address;
    chainId: number;
    verifiedAt: Date;
  }>;

export type SessionClaims =
  Readonly<{
    sessionId: string;
    wallet: Address;
    chainId: number;

    issuedAt: Date;
    expiresAt: Date;

    /**
     * Meningkat ketika session dirotasi.
     */
    generation: number;
  }>;

export type StoredSession =
  Readonly<{
    sessionId: string;

    /**
     * Hanya hash token yang disimpan.
     */
    tokenHash: Hex;

    wallet: Address;
    chainId: number;

    issuedAt: Date;
    expiresAt: Date;

    lastSeenAt: Date;

    generation: number;
    status: AuthSessionStatus;

    revokedAt:
      | Date
      | null;

    revocationReason:
      | SessionRevocationReason
      | null;

    createdAt: Date;
    updatedAt: Date;
  }>;

export type IssuedSession =
  Readonly<{
    token: string;
    claims: SessionClaims;
  }>;

export type CreateSessionInput =
  Readonly<{
    wallet: Address;
    chainId: number;
    now: Date;
    ttlSeconds?: number;
  }>;

export type ValidateSessionInput =
  Readonly<{
    token: string;
    expectedChainId: number;
    now: Date;
  }>;

export type SessionCookieOptions =
  Readonly<{
    name: string;
    path: '/';
    httpOnly: true;
    secure: true;
    sameSite:
      | 'lax'
      | 'strict';
    maxAgeSeconds: number;
  }>;

export type UserRoleRecord =
  Readonly<{
    userId: string;
    wallet: Address;
    kycStatus: KycStatus;
  }>;

export type UserAdminRoleRecord =
  Readonly<{
    wallet: Address;
    active: boolean;
  }>;

export type PartnerRoleRecord =
  Readonly<{
    partnerId: string;
    wallet: Address;
    type: PartnerType;
    lifecycleStatus:
      PartnerLifecycleStatus;
    dbActive: boolean;
  }>;

export type OnchainRoleState =
  Readonly<{
    owner: Address;

    partner:
      | Readonly<{
          type: PartnerType;
          category: number;
          active: boolean;
        }>
      | null;
  }>;

export interface ChallengeRepository {
  create(
    challenge:
      StoredWalletAuthChallenge,
  ): Promise<void>;

  findById(
    challengeId: string,
  ): Promise<
    StoredWalletAuthChallenge | null
  >;

  consume(
    input: Readonly<{
      challengeId: string;
      consumedAt: Date;
    }>,
  ): Promise<boolean>;

  revoke(
    input: Readonly<{
      challengeId: string;
      revokedAt: Date;
    }>,
  ): Promise<boolean>;
}

export interface SessionRepository {
  create(
    session: StoredSession,
  ): Promise<void>;

  findByTokenHash(
    tokenHash: Hex,
  ): Promise<
    StoredSession | null
  >;

  touch(
    input: Readonly<{
      sessionId: string;
      lastSeenAt: Date;
    }>,
  ): Promise<boolean>;

  revoke(
    input: Readonly<{
      sessionId: string;
      revokedAt: Date;
      reason:
        SessionRevocationReason;
    }>,
  ): Promise<boolean>;

  revokeAllForWallet(
    input: Readonly<{
      wallet: Address;
      revokedAt: Date;
      reason:
        SessionRevocationReason;
    }>,
  ): Promise<number>;
}

/**
 * Database-facing role source.
 */
export interface RoleRepository {
  findUserByWallet(
    wallet: Address,
  ): Promise<UserRoleRecord | null>;

  findUserAdminByWallet(
    wallet: Address,
  ): Promise<
    UserAdminRoleRecord | null
  >;

  findPartnerByWallet(
    wallet: Address,
  ): Promise<
    PartnerRoleRecord | null
  >;
}

/**
 * Contract-facing role source.
 *
 * Implementasinya menggunakan packages/contracts,
 * bukan ABI/address lokal.
 */
export interface OnchainRoleReader {
  readRoleState(
    wallet: Address,
  ): Promise<OnchainRoleState>;
}

export type ResolveWalletContextInput =
  Readonly<{
    wallet: Address;
    chainId: number;
    authenticated: boolean;
  }>;
