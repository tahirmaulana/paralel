import type { Env } from "../../env";
import {
  createDatabaseClient,
} from "../database/client";

export type UserAdminKycFilter =
  | "UNVERIFIED"
  | "VERIFIED"
  | "NONE";

export interface UserAdminListFilter {
  kycStatus?:
    UserAdminKycFilter;
  search?: string;
}

interface StatsRow {
  total_users: number;
  kyc_pending: number;
  kyc_verified: number;
  kyc_none: number;
}

interface UserRow {
  user_id: string;
  wallet: string;
  user_type: string;
  email: string | null;
  preferred_language: string;
  kyc_status: string | null;
  full_name: string | null;
  admin_comment: string | null;
  created_at: string | Date;
}

const iso = (
  value: string | Date,
): string =>
  new Date(value).toISOString();

export const readUserAdminStats =
  async (
    env: Env,
  ): Promise<Readonly<{
    totalUsers: number;
    kycPending: number;
    kycVerified: number;
    kycNone: number;
  }>> => {
    const sql =
      await createDatabaseClient(env);

    const rows = await sql`
      SELECT
        (
          SELECT COUNT(*)::integer
          FROM users AS u
          WHERE u.user_type =
            'PUBLIC'
        ) AS total_users,

        (
          SELECT COUNT(*)::integer
          FROM kyc_profiles AS k
          INNER JOIN users AS u
            ON u.id = k.user_id
          WHERE u.user_type =
              'PUBLIC'
            AND k.status =
              'UNVERIFIED'
        ) AS kyc_pending,

        (
          SELECT COUNT(*)::integer
          FROM kyc_profiles AS k
          INNER JOIN users AS u
            ON u.id = k.user_id
          WHERE u.user_type =
              'PUBLIC'
            AND k.status =
              'VERIFIED'
        ) AS kyc_verified,

        (
          SELECT COUNT(*)::integer
          FROM users AS u
          WHERE u.user_type =
              'PUBLIC'
            AND NOT EXISTS (
              SELECT 1
              FROM kyc_profiles AS k
              WHERE k.user_id =
                u.id
            )
        ) AS kyc_none
    `;

    const row =
      rows[0] as
        | StatsRow
        | undefined;

    if (!row) {
      throw new Error(
        "User Admin statistics query returned no row.",
      );
    }

    return Object.freeze({
      totalUsers:
        row.total_users,
      kycPending:
        row.kyc_pending,
      kycVerified:
        row.kyc_verified,
      kycNone:
        row.kyc_none,
    });
  };

export const readUserAdminUsers =
  async (
    env: Env,
    filters:
      UserAdminListFilter,
  ) => {
    const sql =
      await createDatabaseClient(env);

    const kycStatus =
      filters.kycStatus ??
      null;

    const search =
      filters.search
        ?.trim()
        .toLowerCase() ??
      null;

    const searchPattern =
      search === null
        ? null
        : `%${search}%`;

    const rows = await sql`
      SELECT
        u.id AS user_id,
        u.wallet,
        u.user_type,
        u.email,
        u.preferred_language,
        k.status AS kyc_status,
        k.full_name,
        k.admin_comment,
        u.created_at
      FROM users AS u
      LEFT JOIN kyc_profiles AS k
        ON k.user_id = u.id
      WHERE u.user_type =
          'PUBLIC'

        AND (
          ${kycStatus}::text
            IS NULL

          OR (
            ${kycStatus}::text =
              'NONE'
            AND k.user_id
              IS NULL
          )

          OR (
            ${kycStatus}::text IN (
              'UNVERIFIED',
              'VERIFIED'
            )
            AND k.status =
              ${kycStatus}
          )
        )

        AND (
          ${searchPattern}::text
            IS NULL

          OR LOWER(u.wallet)
            LIKE
              ${searchPattern}

          OR LOWER(
            COALESCE(
              u.email,
              ''
            )
          ) LIKE
              ${searchPattern}

          OR LOWER(
            COALESCE(
              k.full_name,
              ''
            )
          ) LIKE
              ${searchPattern}
        )
      ORDER BY
        u.created_at DESC
    `;

    return Object.freeze(
      (rows as UserRow[])
        .map((row) => ({
          userId:
            row.user_id,
          wallet:
            row.wallet,
          userType:
            row.user_type,
          email:
            row.email,
          preferredLanguage:
            row.preferred_language,
          kycStatus:
            row.kyc_status,
          fullName:
            row.full_name,
          adminComment:
            row.admin_comment,
          createdAt:
            iso(row.created_at),
        })),
    );
  };
