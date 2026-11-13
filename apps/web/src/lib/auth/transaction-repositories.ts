import type {
  TransactionSql,
} from 'postgres';

import type {
  AuthChallengeStatus,
  AuthSessionStatus,
  ChallengeRepository,
  SessionRepository,
  SessionRevocationReason,
  StoredSession,
  StoredWalletAuthChallenge,
} from '@paralel/auth';

import type {
  Address,
  Hex,
} from 'viem';

type ChallengeRow = {
  challenge_id: string;
  wallet: string;
  chain_id: number;
  domain: string;
  uri: string;
  statement: string;
  nonce_hash: string;
  message_hash: string;
  issued_at: Date;
  expires_at: Date;
  status: AuthChallengeStatus;
  consumed_at: Date | null;
  revoked_at: Date | null;
  created_at: Date;
};

type SessionRow = {
  session_id: string;
  token_hash: string;
  wallet: string;
  chain_id: number;
  issued_at: Date;
  expires_at: Date;
  last_seen_at: Date;
  generation: number;
  status: AuthSessionStatus;
  revoked_at: Date | null;
  revocation_reason:
    | SessionRevocationReason
    | null;
  created_at: Date;
  updated_at: Date;
};

function toChallenge(
  row: ChallengeRow,
): StoredWalletAuthChallenge {
  return Object.freeze({
    challengeId:
      row.challenge_id,
    wallet:
      row.wallet as Address,
    chainId:
      row.chain_id,
    domain:
      row.domain,
    uri:
      row.uri,
    statement:
      row.statement,
    nonceHash:
      row.nonce_hash as Hex,
    messageHash:
      row.message_hash as Hex,
    issuedAt:
      new Date(row.issued_at),
    expiresAt:
      new Date(row.expires_at),
    status:
      row.status,
    consumedAt:
      row.consumed_at
        ? new Date(
            row.consumed_at,
          )
        : null,
    revokedAt:
      row.revoked_at
        ? new Date(
            row.revoked_at,
          )
        : null,
    createdAt:
      new Date(row.created_at),
  });
}

function toSession(
  row: SessionRow,
): StoredSession {
  return Object.freeze({
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
      row.status,
    revokedAt:
      row.revoked_at
        ? new Date(
            row.revoked_at,
          )
        : null,
    revocationReason:
      row.revocation_reason,
    createdAt:
      new Date(row.created_at),
    updatedAt:
      new Date(row.updated_at),
  });
}

export function createTransactionChallengeRepository(
  transaction: TransactionSql,
): ChallengeRepository {
  return {
    async create(
      challenge,
    ): Promise<void> {
      await transaction`
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
      challengeId,
    ): Promise<
      StoredWalletAuthChallenge | null
    > {
      const rows =
        await transaction<
          ChallengeRow[]
        >`
          SELECT *
          FROM auth_challenges
          WHERE challenge_id =
            ${challengeId}
          LIMIT 1
        `;

      return rows[0]
        ? toChallenge(rows[0])
        : null;
    },

    async consume(
      input,
    ): Promise<boolean> {
      const rows =
        await transaction<
          ReadonlyArray<{
            challenge_id: string;
          }>
        >`
          UPDATE auth_challenges
          SET
            status = 'CONSUMED',
            consumed_at =
              ${input.consumedAt}
          WHERE challenge_id =
              ${input.challengeId}
            AND status = 'ACTIVE'
            AND consumed_at IS NULL
            AND revoked_at IS NULL
            AND expires_at >
              ${input.consumedAt}
          RETURNING challenge_id
        `;

      return rows.length === 1;
    },

    async revoke(
      input,
    ): Promise<boolean> {
      const rows =
        await transaction<
          ReadonlyArray<{
            challenge_id: string;
          }>
        >`
          UPDATE auth_challenges
          SET
            status = 'REVOKED',
            revoked_at =
              ${input.revokedAt}
          WHERE challenge_id =
              ${input.challengeId}
            AND status = 'ACTIVE'
            AND consumed_at IS NULL
            AND revoked_at IS NULL
          RETURNING challenge_id
        `;

      return rows.length === 1;
    },
  };
}

export function createTransactionSessionRepository(
  transaction: TransactionSql,
): SessionRepository {
  return {
    async create(
      session,
    ): Promise<void> {
      await transaction`
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
          ${session.tokenHash},
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
      tokenHash,
    ): Promise<StoredSession | null> {
      const rows =
        await transaction<
          SessionRow[]
        >`
          SELECT *
          FROM auth_sessions
          WHERE token_hash =
            ${tokenHash}
          LIMIT 1
        `;

      return rows[0]
        ? toSession(rows[0])
        : null;
    },

    async touch(
      input,
    ): Promise<boolean> {
      const rows =
        await transaction<
          ReadonlyArray<{
            session_id: string;
          }>
        >`
          UPDATE auth_sessions
          SET
            last_seen_at =
              ${input.lastSeenAt},
            updated_at =
              ${input.lastSeenAt}
          WHERE session_id =
              ${input.sessionId}
            AND status = 'ACTIVE'
          RETURNING session_id
        `;

      return rows.length === 1;
    },

    async revoke(
      input,
    ): Promise<boolean> {
      const rows =
        await transaction<
          ReadonlyArray<{
            session_id: string;
          }>
        >`
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
      const rows =
        await transaction<
          ReadonlyArray<{
            session_id: string;
          }>
        >`
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
  };
}
