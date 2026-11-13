import {
  and,
  eq,
} from 'drizzle-orm';

import type {
  AuthSessionStatus,
  SessionRepository,
  SessionRevocationReason,
  StoredSession,
} from '@paralel/auth';

import type {
  Address,
  Hex,
} from 'viem';

import {
  db,
} from '@db/index';

import {
  authSessions,
} from '@db/schema';

type AuthSessionRow =
  typeof authSessions.$inferSelect;

function toStoredSession(
  row: AuthSessionRow,
): StoredSession {
  return Object.freeze({
    sessionId:
      row.sessionId,
    tokenHash:
      row.tokenHash as Hex,
    wallet:
      row.wallet as Address,
    chainId:
      row.chainId,
    issuedAt:
      new Date(row.issuedAt),
    expiresAt:
      new Date(row.expiresAt),
    lastSeenAt:
      new Date(row.lastSeenAt),
    generation:
      row.generation,
    status:
      row.status as AuthSessionStatus,
    revokedAt:
      row.revokedAt
        ? new Date(row.revokedAt)
        : null,
    revocationReason:
      row.revocationReason
        ? row.revocationReason as
            SessionRevocationReason
        : null,
    createdAt:
      new Date(row.createdAt),
    updatedAt:
      new Date(row.updatedAt),
  });
}

export class DrizzleSessionRepository
implements SessionRepository {
  async create(
    session: StoredSession,
  ): Promise<void> {
    await db
      .insert(authSessions)
      .values({
        sessionId:
          session.sessionId,
        tokenHash:
          session.tokenHash,
        wallet:
          session.wallet.toLowerCase(),
        chainId:
          session.chainId,
        issuedAt:
          session.issuedAt,
        expiresAt:
          session.expiresAt,
        lastSeenAt:
          session.lastSeenAt,
        generation:
          session.generation,
        status:
          session.status,
        revokedAt:
          session.revokedAt,
        revocationReason:
          session.revocationReason,
        createdAt:
          session.createdAt,
        updatedAt:
          session.updatedAt,
      });
  }

  async findByTokenHash(
    tokenHash: Hex,
  ): Promise<StoredSession | null> {
    const rows =
      await db
        .select()
        .from(authSessions)
        .where(
          eq(
            authSessions.tokenHash,
            tokenHash,
          ),
        )
        .limit(1);

    const row = rows[0];

    return row
      ? toStoredSession(row)
      : null;
  }

  async touch(
    input: Readonly<{
      sessionId: string;
      lastSeenAt: Date;
    }>,
  ): Promise<boolean> {
    const rows =
      await db
        .update(authSessions)
        .set({
          lastSeenAt:
            input.lastSeenAt,
          updatedAt:
            input.lastSeenAt,
        })
        .where(
          and(
            eq(
              authSessions.sessionId,
              input.sessionId,
            ),
            eq(
              authSessions.status,
              'ACTIVE',
            ),
          ),
        )
        .returning({
          sessionId:
            authSessions.sessionId,
        });

    return rows.length === 1;
  }

  async revoke(
    input: Readonly<{
      sessionId: string;
      revokedAt: Date;
      reason:
        SessionRevocationReason;
    }>,
  ): Promise<boolean> {
    const rows =
      await db
        .update(authSessions)
        .set({
          status:
            'REVOKED',
          revokedAt:
            input.revokedAt,
          revocationReason:
            input.reason,
          updatedAt:
            input.revokedAt,
        })
        .where(
          and(
            eq(
              authSessions.sessionId,
              input.sessionId,
            ),
            eq(
              authSessions.status,
              'ACTIVE',
            ),
          ),
        )
        .returning({
          sessionId:
            authSessions.sessionId,
        });

    return rows.length === 1;
  }

  async revokeAllForWallet(
    input: Readonly<{
      wallet: Address;
      revokedAt: Date;
      reason:
        SessionRevocationReason;
    }>,
  ): Promise<number> {
    const rows =
      await db
        .update(authSessions)
        .set({
          status:
            'REVOKED',
          revokedAt:
            input.revokedAt,
          revocationReason:
            input.reason,
          updatedAt:
            input.revokedAt,
        })
        .where(
          and(
            eq(
              authSessions.wallet,
              input.wallet.toLowerCase(),
            ),
            eq(
              authSessions.status,
              'ACTIVE',
            ),
          ),
        )
        .returning({
          sessionId:
            authSessions.sessionId,
        });

    return rows.length;
  }
}

export const sessionRepository =
  new DrizzleSessionRepository();
