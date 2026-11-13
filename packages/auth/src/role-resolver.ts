// @file packages/auth/src/role-resolver.ts

/**
 * Canonical wallet role resolver for PARALEL.
 *
 * Resolver menggabungkan:
 *
 * - authenticated wallet identity;
 * - user dan KYC record dari database;
 * - User Admin registry dari database;
 * - partner record dari database;
 * - contract owner;
 * - on-chain partner registry.
 *
 * File ini tidak bergantung pada Next.js, React, Drizzle, database client,
 * RPC client, atau Cloudflare Workers.
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
  DomainError,
  assertDomain,
  type KycStatus,
  type PartnerLifecycleStatus,
  type PartnerSyncStatus,
} from '@paralel/domain';

import type {
  AuthenticatedPartnerContext,
  OnchainRoleReader,
  ResolveWalletContextInput,
  RoleRepository,
  WalletContext,
  WalletRoleFlags,
  WorkspaceName,
} from './types';

export type ResolveWalletContextDependencies =
  Readonly<{
    roleRepository:
      RoleRepository;

    onchainRoleReader:
      OnchainRoleReader;
  }>;

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

function sameWallet(
  left: Address,
  right: Address,
): boolean {
  return (
    left.toLowerCase() ===
    right.toLowerCase()
  );
}

function normalizeKycStatus(
  value:
    KycStatus | undefined,
): KycStatus {
  return value ?? 'NONE';
}

function derivePartnerSyncStatus(
  input: Readonly<{
    databasePartner:
      Awaited<
        ReturnType<
          RoleRepository['findPartnerByWallet']
        >
      >;

    onchainPartner:
      Awaited<
        ReturnType<
          OnchainRoleReader['readRoleState']
        >
      >['partner'];
  }>,
): PartnerSyncStatus {
  const databasePartner =
    input.databasePartner;

  const onchainPartner =
    input.onchainPartner;

  if (
    !databasePartner &&
    !onchainPartner
  ) {
    return 'SYNCED';
  }

  if (
    databasePartner &&
    !onchainPartner
  ) {
    return databasePartner.dbActive
      ? 'PENDING'
      : 'SYNCED';
  }

  if (
    !databasePartner &&
    onchainPartner
  ) {
    return 'DRIFTED';
  }

  if (
    !databasePartner ||
    !onchainPartner
  ) {
    return 'DRIFTED';
  }

  if (
    databasePartner.type !==
    onchainPartner.type
  ) {
    return 'DRIFTED';
  }

  if (
    databasePartner.dbActive !==
    onchainPartner.active
  ) {
    return 'DRIFTED';
  }

  return 'SYNCED';
}

function derivePartnerLifecycleStatus(
  input: Readonly<{
    databaseLifecycle:
      PartnerLifecycleStatus;
    databaseActive: boolean;
    onchainActive: boolean;
    syncStatus:
      PartnerSyncStatus;
  }>,
): PartnerLifecycleStatus {
  if (
    input.databaseLifecycle ===
    'SUSPENDING'
  ) {
    return 'SUSPENDING';
  }

  if (
    input.databaseLifecycle ===
      'INACTIVE' ||
    (
      !input.databaseActive &&
      !input.onchainActive
    )
  ) {
    return 'INACTIVE';
  }

  if (
    input.syncStatus === 'DRIFTED'
  ) {
    return input.databaseLifecycle;
  }

  return 'ACTIVE';
}

function buildPartnerContext(
  input: Readonly<{
    wallet: Address;

    databasePartner:
      Awaited<
        ReturnType<
          RoleRepository['findPartnerByWallet']
        >
      >;

    onchainPartner:
      Awaited<
        ReturnType<
          OnchainRoleReader['readRoleState']
        >
      >['partner'];
  }>,
): AuthenticatedPartnerContext | null {
  const databasePartner =
    input.databasePartner;

  if (!databasePartner) {
    return null;
  }

  const onchainPartner =
    input.onchainPartner;

  const syncStatus =
    derivePartnerSyncStatus({
      databasePartner,
      onchainPartner,
    });

  const onchainActive =
    onchainPartner?.active ??
    false;

  const lifecycleStatus =
    derivePartnerLifecycleStatus({
      databaseLifecycle:
        databasePartner.lifecycleStatus,
      databaseActive:
        databasePartner.dbActive,
      onchainActive,
      syncStatus,
    });

  return Object.freeze({
    partnerId:
      databasePartner.partnerId,
    wallet:
      input.wallet,
    type:
      databasePartner.type,
    lifecycleStatus,
    dbActive:
      databasePartner.dbActive,
    onchainActive,
    syncStatus,
  });
}

function isUsablePartnerContext(
  partner:
    AuthenticatedPartnerContext | null,
): boolean {
  if (!partner) {
    return false;
  }

  return (
    partner.lifecycleStatus !==
      'INACTIVE' &&
    partner.dbActive &&
    partner.onchainActive &&
    partner.syncStatus ===
      'SYNCED'
  );
}

function elevatedRoleEntries(
  roles: WalletRoleFlags,
): readonly Readonly<{
  role: 'GUARANTOR' | 'NOTARY' | 'USER_ADMIN' | 'PLATFORM_ADMIN';
  enabled: boolean;
}>[] {
  return [
    { role: 'GUARANTOR', enabled: roles.guarantor },
    { role: 'NOTARY', enabled: roles.notary },
    { role: 'USER_ADMIN', enabled: roles.userAdmin },
    { role: 'PLATFORM_ADMIN', enabled: roles.platformAdmin },
  ];
}

function assertSingleElevatedRole(
  roles: WalletRoleFlags,
): void {
  const activeRoles = elevatedRoleEntries(roles)
    .filter((entry) => entry.enabled)
    .map((entry) => entry.role);

  assertDomain(
    activeRoles.length <= 1,
    'ROLE_FORBIDDEN',
    'A wallet may hold only one staff or partner role.',
    {
      details: {
        roles: activeRoles,
      },
    },
  );
}

/**
 * Every authenticated wallet resolves to exactly one interface. Public users
 * use USER; staff and partner wallets resolve only to their assigned role.
 */
export function deriveAvailableWorkspaces(
  roles: WalletRoleFlags,
): readonly WorkspaceName[] {
  assertSingleElevatedRole(roles);
  const role = elevatedRoleEntries(roles)
    .find((entry) => entry.enabled)?.role;

  return Object.freeze(
    [role ?? 'USER'],
  );
}

/**
 * The role resolver enforces one elevated role, so the sole available
 * workspace is also the default destination.
 */
export function deriveDefaultWorkspace(
  roles: WalletRoleFlags,
): WorkspaceName {
  return deriveAvailableWorkspaces(roles)[0]!;
}

export function hasWorkspace(
  context: WalletContext,
  workspace: WorkspaceName,
): boolean {
  return context.availableWorkspaces.includes(
    workspace,
  );
}

export function assertWorkspaceAvailable(
  context: WalletContext,
  workspace: WorkspaceName,
): void {
  assertDomain(
    hasWorkspace(
      context,
      workspace,
    ),
    'ROLE_FORBIDDEN',
    `Workspace ${workspace} is not available for this wallet.`,
    {
      details: {
        wallet:
          context.wallet,
        workspace,
        availableWorkspaces:
          context.availableWorkspaces,
      },
    },
  );
}

/**
 * Resolves one canonical WalletContext.
 *
 * Role repository reads dilakukan paralel. Contract role state dibaca satu
 * kali agar owner dan partner registry berasal dari block/read context yang
 * sama pada adapter implementation.
 */
export async function resolveWalletContext(
  input: ResolveWalletContextInput,
  dependencies:
    ResolveWalletContextDependencies,
): Promise<WalletContext> {
  const wallet =
    normalizeWallet(
      input.wallet,
    );

  const chainId =
    normalizeChainId(
      input.chainId,
    );

  assertDomain(
    input.authenticated,
    'UNAUTHENTICATED',
    'Authenticated wallet session is required.',
  );

  assertDomain(
    chainId ===
      ARBITRUM_SEPOLIA_CHAIN_ID,
    'WRONG_NETWORK',
    `Wallet context requires chain ID ${ARBITRUM_SEPOLIA_CHAIN_ID}.`,
    {
      details: {
        expectedChainId:
          ARBITRUM_SEPOLIA_CHAIN_ID,
        receivedChainId:
          chainId,
      },
    },
  );

  const [
    userRecord,
    userAdminRecord,
    databasePartner,
    onchainState,
  ] = await Promise.all([
    dependencies.roleRepository
      .findUserByWallet(wallet),

    dependencies.roleRepository
      .findUserAdminByWallet(
        wallet,
      ),

    dependencies.roleRepository
      .findPartnerByWallet(
        wallet,
      ),

    dependencies.onchainRoleReader
      .readRoleState(wallet),
  ]);

  assertDomain(
    isAddress(
      onchainState.owner,
      {
        strict: false,
      },
    ),
    'RPC_UNAVAILABLE',
    'Contract owner read returned an invalid address.',
  );

  const platformAdmin =
    sameWallet(
      wallet,
      onchainState.owner,
    );

  const userAdmin =
    userAdminRecord?.active ===
    true;

  const partnerContext =
    buildPartnerContext({
      wallet,
      databasePartner,
      onchainPartner:
        onchainState.partner,
    });

  const partnerUsable =
    isUsablePartnerContext(
      partnerContext,
    );

  const guarantor =
    partnerUsable &&
    partnerContext?.type ===
      'GUARANTOR';

  const notary =
    partnerUsable &&
    partnerContext?.type ===
      'NOTARY';

  const roles =
    Object.freeze({
      user:
        true,
      guarantor:
        Boolean(guarantor),
      notary:
        Boolean(notary),
      userAdmin,
      platformAdmin,
    }) satisfies WalletRoleFlags;

  const availableWorkspaces =
    deriveAvailableWorkspaces(
      roles,
    );

  const defaultWorkspace =
    deriveDefaultWorkspace(
      roles,
    );

  return Object.freeze({
    wallet,
    chainId,
    authenticated:
      true,

    user: Object.freeze({
      userId:
        userRecord?.userId ??
        null,
      kycStatus:
        normalizeKycStatus(
          userRecord?.kycStatus,
        ),
    }),

    roles,

    partnerContext,

    availableWorkspaces,

    defaultWorkspace,
  });
}

/**
 * Resolves a disconnected/unauthenticated local UI context without reading
 * database or chain.
 *
 * Server authorization must use resolveWalletContext(), not this helper.
 */
export function createUnauthenticatedWalletContext(
  input: Readonly<{
    wallet: Address;
    chainId: number;
  }>,
): WalletContext {
  const wallet =
    normalizeWallet(
      input.wallet,
    );

  const chainId =
    normalizeChainId(
      input.chainId,
    );

  const roles =
    Object.freeze({
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
    }) satisfies WalletRoleFlags;

  return Object.freeze({
    wallet,
    chainId,
    authenticated:
      false,

    user:
      Object.freeze({
        userId:
          null,
        kycStatus:
          'NONE',
      }),

    roles,

    partnerContext:
      null,

    availableWorkspaces:
      Object.freeze([
        'USER',
      ] as WorkspaceName[]),

    defaultWorkspace:
      'USER',
  });
}

/**
 * Explicit drift assertion untuk privileged partner operations.
 */
export function assertPartnerRegistrySynchronized(
  context: WalletContext,
): void {
  const partner =
    context.partnerContext;

  if (!partner) {
    throw new DomainError(
      'ROLE_FORBIDDEN',
      'Wallet does not have a partner context.',
      {
        details: {
          wallet:
            context.wallet,
        },
      },
    );
  }

  assertDomain(
    partner.syncStatus ===
      'SYNCED',
    'PARTNER_REGISTRY_DRIFT',
    'Partner database and on-chain registry are not synchronized.',
    {
      details: {
        partnerId:
          partner.partnerId,
        type:
          partner.type,
        dbActive:
          partner.dbActive,
        onchainActive:
          partner.onchainActive,
        syncStatus:
          partner.syncStatus,
      },
    },
  );
}
