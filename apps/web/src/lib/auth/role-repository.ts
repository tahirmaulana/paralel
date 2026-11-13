import {
  eq,
  sql,
} from 'drizzle-orm';

import {
  getAddress,
  type Address,
} from 'viem';

import type {
  PartnerRoleRecord,
  RoleRepository,
  UserAdminRoleRecord,
  UserRoleRecord,
} from '@paralel/auth';

import type {
  KycStatus,
  PartnerLifecycleStatus,
  PartnerType,
} from '@paralel/domain';

import {
  db,
} from '@db/index';

import {
  kycProfiles,
  partners,
  userAdmins,
  users,
} from '@db/schema';

import {
  isConfiguredUserAdminWallet,
} from './user-admin-wallet';

function normalizeWallet(
  wallet: string,
): Address {
  return getAddress(wallet);
}

function normalizeKycStatus(
  status: string | null,
): KycStatus {
  if (status === 'VERIFIED') {
    return 'VERIFIED';
  }

  if (status === 'UNVERIFIED') {
    return 'PENDING';
  }

  if (status === null) {
    return 'NONE';
  }

  throw new Error(
    `Unsupported database KYC status: `,
  );
}

function normalizePartnerType(
  type: string,
): PartnerType {
  if (
    type === 'NOTARY' ||
    type === 'GUARANTOR'
  ) {
    return type;
  }

  throw new Error(
    `Unsupported database partner type: ${type}`,
  );
}

function deriveLifecycleStatus(
  active: boolean,
): PartnerLifecycleStatus {
  return active
    ? 'ACTIVE'
    : 'INACTIVE';
}

export class DrizzleRoleRepository
implements RoleRepository {
  async findUserByWallet(
    wallet: Address,
  ): Promise<UserRoleRecord | null> {
    const rows =
      await db
        .select({
          userId:
            users.id,
          wallet:
            users.wallet,
          kycStatus:
            kycProfiles.status,
        })
        .from(users)
        .leftJoin(
          kycProfiles,
          eq(
            kycProfiles.userId,
            users.id,
          ),
        )
        .where(
          sql`LOWER(${users.wallet}) = ${wallet.toLowerCase()}`,
        )
        .limit(1);

    const row = rows[0];

    if (!row) {
      return null;
    }

    return Object.freeze({
      userId:
        row.userId,
      wallet:
        normalizeWallet(
          row.wallet,
        ),
      kycStatus:
        normalizeKycStatus(
          row.kycStatus,
        ),
    });
  }

  async findUserAdminByWallet(
    wallet: Address,
  ): Promise<
    UserAdminRoleRecord | null
  > {
    if (
      isConfiguredUserAdminWallet(
        wallet,
      )
    ) {
      return Object.freeze({
        wallet:
          normalizeWallet(wallet),
        active:
          true,
      });
    }

    const rows =
      await db
        .select({
          wallet:
            userAdmins.wallet,
          active:
            userAdmins.active,
        })
        .from(userAdmins)
        .where(
          sql`LOWER(${userAdmins.wallet}) = ${wallet.toLowerCase()}`,
        )
        .limit(1);

    const row = rows[0];

    if (!row) {
      return null;
    }

    return Object.freeze({
      wallet:
        normalizeWallet(
          row.wallet,
        ),
      active:
        row.active,
    });
  }

  async findPartnerByWallet(
    wallet: Address,
  ): Promise<
    PartnerRoleRecord | null
  > {
    const rows =
      await db
        .select({
          partnerId:
            partners.id,
          wallet:
            users.wallet,
          type:
            partners.type,
          active:
            partners.active,
        })
        .from(partners)
        .innerJoin(
          users,
          eq(
            users.id,
            partners.userId,
          ),
        )
        .where(
          sql`LOWER(${users.wallet}) = ${wallet.toLowerCase()}`,
        )
        .limit(1);

    const row = rows[0];

    if (!row) {
      return null;
    }

    return Object.freeze({
      partnerId:
        row.partnerId,
      wallet:
        normalizeWallet(
          row.wallet,
        ),
      type:
        normalizePartnerType(
          row.type,
        ),
      lifecycleStatus:
        deriveLifecycleStatus(
          row.active,
        ),
      dbActive:
        row.active,
    });
  }
}

export const roleRepository =
  new DrizzleRoleRepository();
