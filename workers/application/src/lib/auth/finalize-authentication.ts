import type {
  StoredSession,
} from "@paralel/auth";
import type {
  Address,
} from "viem";

import type { Env } from "../../env";
import {
  createDatabaseClient,
} from "../database/client";

export interface FinalizeAuthenticationInput {
  challengeId: string;
  correlationId: string;
  wallet: Address;
  chainId: number;
  verifiedAt: Date;
  session: StoredSession;
}

interface FinalizationRow {
  challenge_id: string;
  session_id: string;
  audit_id: string;
}

export const finalizeAuthentication = async (
  env: Env,
  input: FinalizeAuthenticationInput,
): Promise<boolean> => {
  const sql =
    await createDatabaseClient(env);

  const wallet =
    input.wallet.toLowerCase();

  const rows = await sql`
    WITH consumed_challenge AS (
      UPDATE auth_challenges
      SET
        status = 'CONSUMED',
        consumed_at = ${input.verifiedAt}
      WHERE challenge_id =
        ${input.challengeId}
        AND wallet = ${wallet}
        AND chain_id = ${input.chainId}
        AND status = 'ACTIVE'
        AND expires_at >
          ${input.verifiedAt}
      RETURNING challenge_id
    ),
    inserted_session AS (
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
      SELECT
        ${input.session.sessionId},
        ${input.session.tokenHash.toLowerCase()},
        ${input.session.wallet.toLowerCase()},
        ${input.session.chainId},
        ${input.session.issuedAt},
        ${input.session.expiresAt},
        ${input.session.lastSeenAt},
        ${input.session.generation},
        ${input.session.status},
        ${input.session.revokedAt},
        ${input.session.revocationReason},
        ${input.session.createdAt},
        ${input.session.updatedAt}
      FROM consumed_challenge
      RETURNING session_id
    ),
    inserted_audit AS (
      INSERT INTO audit_log (
        correlation_id,
        session_id,
        actor_wallet,
        actor_roles,
        action,
        resource_type,
        resource_id,
        outcome,
        metadata,
        created_at
      )
      SELECT
        ${input.correlationId},
        inserted_session.session_id,
        ${wallet},
        ${JSON.stringify({
          scope:
            "AUTHENTICATED_WALLET",
        })}::jsonb,
        'AUTH_SESSION_ISSUED',
        'AUTH_SESSION',
        inserted_session.session_id,
        'SUCCEEDED',
        ${JSON.stringify({
          challengeId:
            input.challengeId,
          chainId:
            input.chainId,
          generation:
            input.session.generation,
        })}::jsonb,
        ${input.verifiedAt}
      FROM inserted_session
      RETURNING id
    )
    SELECT
      consumed_challenge.challenge_id,
      inserted_session.session_id,
      inserted_audit.id::text AS audit_id
    FROM consumed_challenge
    INNER JOIN inserted_session
      ON TRUE
    INNER JOIN inserted_audit
      ON TRUE
  `;

  const finalized =
    rows as FinalizationRow[];

  return finalized.length === 1;
};
