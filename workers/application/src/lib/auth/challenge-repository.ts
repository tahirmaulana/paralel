import type {
  AuthChallengeStatus,
  ChallengeRepository,
  StoredWalletAuthChallenge,
} from "@paralel/auth";
import type {
  Address,
  Hex,
} from "viem";

import type { Env } from "../../env";
import {
  createDatabaseClient,
} from "../database/client";

interface ChallengeRow {
  challenge_id: string;
  wallet: string;
  chain_id: number;
  domain: string;
  uri: string;
  statement: string;
  nonce_hash: string;
  message_hash: string;
  issued_at: string | Date;
  expires_at: string | Date;
  status: string;
  consumed_at: string | Date | null;
  revoked_at: string | Date | null;
  created_at: string | Date;
}

const toStoredChallenge = (
  row: ChallengeRow,
): StoredWalletAuthChallenge =>
  Object.freeze({
    challengeId: row.challenge_id,
    wallet: row.wallet as Address,
    chainId: row.chain_id,
    domain: row.domain,
    uri: row.uri,
    statement: row.statement,
    nonceHash: row.nonce_hash as Hex,
    messageHash: row.message_hash as Hex,
    issuedAt: new Date(row.issued_at),
    expiresAt: new Date(row.expires_at),
    status:
      row.status as AuthChallengeStatus,
    consumedAt:
      row.consumed_at === null
        ? null
        : new Date(row.consumed_at),
    revokedAt:
      row.revoked_at === null
        ? null
        : new Date(row.revoked_at),
    createdAt:
      new Date(row.created_at),
  });

export const createChallengeRepository = (
  env: Env,
): ChallengeRepository => ({
  async create(
    challenge: StoredWalletAuthChallenge,
  ): Promise<void> {
    const sql =
      await createDatabaseClient(env);

    await sql`
      INSERT INTO auth_challenges (
        challenge_id,
        wallet,
        chain_id,
        domain,
        uri,
        statement,
        nonce_hash,
        message_hash,
        issued_at,
        expires_at,
        status,
        consumed_at,
        revoked_at,
        created_at
      )
      VALUES (
        ${challenge.challengeId},
        ${challenge.wallet.toLowerCase()},
        ${challenge.chainId},
        ${challenge.domain},
        ${challenge.uri},
        ${challenge.statement},
        ${challenge.nonceHash.toLowerCase()},
        ${challenge.messageHash.toLowerCase()},
        ${challenge.issuedAt},
        ${challenge.expiresAt},
        ${challenge.status},
        ${challenge.consumedAt},
        ${challenge.revokedAt},
        ${challenge.createdAt}
      )
    `;
  },

  async findById(
    challengeId: string,
  ): Promise<
    StoredWalletAuthChallenge | null
  > {
    const sql =
      await createDatabaseClient(env);

    const rows = await sql`
      SELECT
        challenge_id,
        wallet,
        chain_id,
        domain,
        uri,
        statement,
        nonce_hash,
        message_hash,
        issued_at,
        expires_at,
        status,
        consumed_at,
        revoked_at,
        created_at
      FROM auth_challenges
      WHERE challenge_id = ${challengeId}
      LIMIT 1
    `;

    const row =
      rows[0] as ChallengeRow | undefined;

    return row
      ? toStoredChallenge(row)
      : null;
  },

  async consume(input): Promise<boolean> {
    const sql =
      await createDatabaseClient(env);

    const rows = await sql`
      UPDATE auth_challenges
      SET
        status = 'CONSUMED',
        consumed_at = ${input.consumedAt}
      WHERE challenge_id =
        ${input.challengeId}
        AND status = 'ACTIVE'
      RETURNING challenge_id
    `;

    return rows.length === 1;
  },

  async revoke(input): Promise<boolean> {
    const sql =
      await createDatabaseClient(env);

    const rows = await sql`
      UPDATE auth_challenges
      SET
        status = 'REVOKED',
        revoked_at = ${input.revokedAt}
      WHERE challenge_id =
        ${input.challengeId}
        AND status = 'ACTIVE'
      RETURNING challenge_id
    `;

    return rows.length === 1;
  },
});
