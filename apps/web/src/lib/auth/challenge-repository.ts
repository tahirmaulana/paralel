import {
  and,
  eq,
} from 'drizzle-orm';

import type {
  AuthChallengeStatus,
  ChallengeRepository,
  StoredWalletAuthChallenge,
} from '@paralel/auth';

import type {
  Address,
  Hex,
} from 'viem';

import {
  db,
} from '@db/index';

import {
  authChallenges,
} from '@db/schema';

type AuthChallengeRow =
  typeof authChallenges.$inferSelect;

function toStoredChallenge(
  row: AuthChallengeRow,
): StoredWalletAuthChallenge {
  return Object.freeze({
    challengeId:
      row.challengeId,

    wallet:
      row.wallet as Address,

    chainId:
      row.chainId,

    domain:
      row.domain,

    uri:
      row.uri,

    statement:
      row.statement,

    nonceHash:
      row.nonceHash as Hex,

    messageHash:
      row.messageHash as Hex,

    issuedAt:
      new Date(row.issuedAt),

    expiresAt:
      new Date(row.expiresAt),

    status:
      row.status as
        AuthChallengeStatus,

    consumedAt:
      row.consumedAt
        ? new Date(
            row.consumedAt,
          )
        : null,

    revokedAt:
      row.revokedAt
        ? new Date(
            row.revokedAt,
          )
        : null,

    createdAt:
      new Date(row.createdAt),
  });
}

export class DrizzleChallengeRepository
implements ChallengeRepository {
  async create(
    challenge:
      StoredWalletAuthChallenge,
  ): Promise<void> {
    await db
      .insert(authChallenges)
      .values({
        challengeId:
          challenge.challengeId,

        wallet:
          challenge.wallet
            .toLowerCase(),

        chainId:
          challenge.chainId,

        domain:
          challenge.domain,

        uri:
          challenge.uri,

        statement:
          challenge.statement,

        nonceHash:
          challenge.nonceHash
            .toLowerCase(),

        messageHash:
          challenge.messageHash
            .toLowerCase(),

        issuedAt:
          challenge.issuedAt,

        expiresAt:
          challenge.expiresAt,

        status:
          challenge.status,

        consumedAt:
          challenge.consumedAt,

        revokedAt:
          challenge.revokedAt,

        createdAt:
          challenge.createdAt,
      });
  }

  async findById(
    challengeId: string,
  ): Promise<
    StoredWalletAuthChallenge | null
  > {
    const rows =
      await db
        .select()
        .from(authChallenges)
        .where(
          eq(
            authChallenges
              .challengeId,
            challengeId,
          ),
        )
        .limit(1);

    const row =
      rows[0];

    return row
      ? toStoredChallenge(row)
      : null;
  }

  async consume(
    input: Readonly<{
      challengeId: string;
      consumedAt: Date;
    }>,
  ): Promise<boolean> {
    const rows =
      await db
        .update(authChallenges)
        .set({
          status:
            'CONSUMED',

          consumedAt:
            input.consumedAt,
        })
        .where(
          and(
            eq(
              authChallenges
                .challengeId,
              input.challengeId,
            ),
            eq(
              authChallenges.status,
              'ACTIVE',
            ),
          ),
        )
        .returning({
          challengeId:
            authChallenges
              .challengeId,
        });

    return rows.length === 1;
  }

  async revoke(
    input: Readonly<{
      challengeId: string;
      revokedAt: Date;
    }>,
  ): Promise<boolean> {
    const rows =
      await db
        .update(authChallenges)
        .set({
          status:
            'REVOKED',

          revokedAt:
            input.revokedAt,
        })
        .where(
          and(
            eq(
              authChallenges
                .challengeId,
              input.challengeId,
            ),
            eq(
              authChallenges.status,
              'ACTIVE',
            ),
          ),
        )
        .returning({
          challengeId:
            authChallenges
              .challengeId,
        });

    return rows.length === 1;
  }
}

export const challengeRepository =
  new DrizzleChallengeRepository();
