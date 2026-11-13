import type {
  PartnerRoleRecord,
  RoleRepository,
  UserAdminRoleRecord,
  UserRoleRecord,
} from "@paralel/auth";
import type {
  KycStatus,
  PartnerLifecycleStatus,
  PartnerType,
} from "@paralel/domain";
import {
  getAddress,
  type Address,
} from "viem";

import type { Env } from "../../env";
import {
  createDatabaseClient,
} from "../database/client";

interface UserRow {
  user_id: string;
  wallet: string;
  kyc_status: string | null;
}

interface UserAdminRow {
  wallet: string;
  active: boolean;
}

interface PartnerRow {
  partner_id: string;
  wallet: string;
  type: string;
  active: boolean;
}

const normalizeKycStatus = (
  status: string | null,
): KycStatus => {
  if (status === "VERIFIED") {
    return "VERIFIED";
  }

  if (status === "UNVERIFIED") {
    return "PENDING";
  }

  if (status === null) {
    return "NONE";
  }

  throw new Error(
    `Unsupported database KYC status: ${status}`,
  );
};

const normalizePartnerType = (
  type: string,
): PartnerType => {
  if (
    type === "NOTARY" ||
    type === "GUARANTOR"
  ) {
    return type;
  }

  throw new Error(
    `Unsupported database partner type: ${type}`,
  );
};

export const createRoleRepository = (
  env: Env,
): RoleRepository => ({
  async findUserByWallet(
    wallet: Address,
  ): Promise<UserRoleRecord | null> {
    const sql =
      await createDatabaseClient(env);

    const rows = await sql`
      SELECT
        u.id AS user_id,
        u.wallet,
        k.status AS kyc_status
      FROM users AS u
      LEFT JOIN kyc_profiles AS k
        ON k.user_id = u.id
      WHERE LOWER(u.wallet) =
        ${wallet.toLowerCase()}
      LIMIT 1
    `;

    const row =
      rows[0] as UserRow | undefined;

    if (!row) {
      return null;
    }

    return Object.freeze({
      userId: row.user_id,
      wallet:
        getAddress(row.wallet),
      kycStatus:
        normalizeKycStatus(
          row.kyc_status,
        ),
    });
  },

  async findUserAdminByWallet(
    wallet: Address,
  ): Promise<UserAdminRoleRecord | null> {
    const sql =
      await createDatabaseClient(env);

    const rows = await sql`
      SELECT
        wallet,
        active
      FROM user_admins
      WHERE LOWER(wallet) =
        ${wallet.toLowerCase()}
      LIMIT 1
    `;

    const row =
      rows[0] as
        | UserAdminRow
        | undefined;

    if (!row) {
      return null;
    }

    return Object.freeze({
      wallet:
        getAddress(row.wallet),
      active:
        row.active,
    });
  },

  async findPartnerByWallet(
    wallet: Address,
  ): Promise<PartnerRoleRecord | null> {
    const sql =
      await createDatabaseClient(env);

    const rows = await sql`
      SELECT
        p.id AS partner_id,
        u.wallet,
        p.type,
        p.active
      FROM partners AS p
      INNER JOIN users AS u
        ON u.id = p.user_id
      WHERE LOWER(u.wallet) =
        ${wallet.toLowerCase()}
      LIMIT 1
    `;

    const row =
      rows[0] as PartnerRow | undefined;

    if (!row) {
      return null;
    }

    const lifecycleStatus:
      PartnerLifecycleStatus =
        row.active
          ? "ACTIVE"
          : "INACTIVE";

    return Object.freeze({
      partnerId:
        row.partner_id,
      wallet:
        getAddress(row.wallet),
      type:
        normalizePartnerType(
          row.type,
        ),
      lifecycleStatus,
      dbActive:
        row.active,
    });
  },
});
