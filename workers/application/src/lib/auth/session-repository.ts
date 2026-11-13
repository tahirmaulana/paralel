import type {
  AuthSessionStatus,
  SessionRepository,
  SessionRevocationReason,
  StoredSession,
} from "@paralel/auth";
import type {
  Address,
  Hex,
} from "viem";

import type { Env } from "../../env";
import {
  createDatabaseClient,
} from "../database/client";

interface SessionRow {
  session_id: string;
  token_hash: string;
  wallet: string;
  chain_id: number;
  issued_at: string | Date;
  expires_at: string | Date;
  last_seen_at: string | Date;
  generation: number;
  status: string;
  revoked_at: string | Date | null;
  revocation_reason: string | null;
  created_at: string | Date;
  updated_at: string | Date;
}

const toStoredSession = (
  row: SessionRow,
): StoredSession =>
  Object.freeze({
    sessionId:
      row.session_id,
    tokenHash:
      row.token_hash as Hex,
    wallet:
      row.wallet as Address,
    chainId:
      row.chain_id,
    issuedAt:
      new Date(row.issued_at),
    expiresAt:
      new Date(row.expires_at),
    lastSeenAt:
      new Date(row.last_seen_at),
    generation:
      row.generation,
    status:
      row.status as AuthSessionStatus,
    revokedAt:
      row.revoked_at === null
        ? null
        : new Date(row.revoked_at),
    revocationReason:
      row.revocation_reason === null
        ? null
        : row.revocation_reason as
            SessionRevocationReason,
    createdAt:
      new Date(row.created_at),
    updatedAt:
      new Date(row.updated_at),
  });

export const createSessionRepository = (
  env: Env,
): SessionRepository => ({
  async create(
    session: StoredSession,
  ): Promise<void> {
    const sql =
      await createDatabaseClient(env);

    await sql`
      INSERT INTO auth_sessions (
        session_id,
        token_hash,
        wallet,
        chain_id,
        issued_at,
        expires_at,
        last_seen_at,
        generation,
        status,
        revoked_at,
        revocation_reason,
        created_at,
        updated_at
      )
      VALUES (
        ${session.sessionId},
        ${session.tokenHash.toLowerCase()},
        ${session.wallet.toLowerCase()},
        ${session.chainId},
        ${session.issuedAt},
        ${session.expiresAt},
        ${session.lastSeenAt},
        ${session.generation},
        ${session.status},
        ${session.revokedAt},
        ${session.revocationReason},
        ${session.createdAt},
        ${session.updatedAt}
      )
    `;
  },

  async findByTokenHash(
    tokenHash: Hex,
  ): Promise<StoredSession | null> {
    const sql =
      await createDatabaseClient(env);

    const rows = await sql`
      SELECT
        session_id,
        token_hash,
        wallet,
        chain_id,
        issued_at,
        expires_at,
        last_seen_at,
        generation,
        status,
        revoked_at,
        revocation_reason,
        created_at,
        updated_at
      FROM auth_sessions
      WHERE token_hash =
        ${tokenHash.toLowerCase()}
      LIMIT 1
    `;

    const row =
      rows[0] as SessionRow | undefined;

    return row
      ? toStoredSession(row)
      : null;
  },

  async touch(input): Promise<boolean> {
    const sql =
      await createDatabaseClient(env);

    const rows = await sql`
      UPDATE auth_sessions
      SET
        last_seen_at =
          ${input.lastSeenAt},
        updated_at =
          ${input.lastSeenAt}
      WHERE session_id =
        ${input.sessionId}
        AND status = 'ACTIVE'
        AND expires_at >
          ${input.lastSeenAt}
      RETURNING session_id
    `;

    return rows.length === 1;
  },

  async revoke(input): Promise<boolean> {
    const sql =
      await createDatabaseClient(env);

    const rows = await sql`
      UPDATE auth_sessions
      SET
        status = 'REVOKED',
        revoked_at =
          ${input.revokedAt},
        revocation_reason =
          ${input.reason},
        updated_at =
          ${input.revokedAt}
      WHERE session_id =
        ${input.sessionId}
        AND status = 'ACTIVE'
      RETURNING session_id
    `;

    return rows.length === 1;
  },

  async revokeAllForWallet(
    input,
  ): Promise<number> {
    const sql =
      await createDatabaseClient(env);

    const rows = await sql`
      UPDATE auth_sessions
      SET
        status = 'REVOKED',
        revoked_at =
          ${input.revokedAt},
        revocation_reason =
          ${input.reason},
        updated_at =
          ${input.revokedAt}
      WHERE wallet =
        ${input.wallet.toLowerCase()}
        AND status = 'ACTIVE'
      RETURNING session_id
    `;

    return rows.length;
  },
});
