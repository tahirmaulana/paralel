import type {
  SessionClaims,
  WalletRoleFlags,
} from "@paralel/auth";
import {
  DomainError,
} from "@paralel/domain";
import type {
  Address,
  Hex,
} from "viem";

import type { Env } from "../../env";
import {
  createDatabaseClient,
} from "../database/client";
import type {
  GuarantorReviewProjection,
} from "./review-projection";
import {
  normalizeReviewIdempotencyKey,
  readExistingReviewIdempotency,
  resolveExistingReviewIdempotency,
  reviewIdempotencyExpiresAt,
  type GuarantorReviewRoute,
} from "./review-idempotency";
import {
  approvalAttestationPayload,
  hexToPostgresBytea,
  rejectionAttestationPayload,
} from "./review-values";

interface MutationRow {
  response_status: number;
  response_body: unknown;
}

export interface ReviewMutationResult {
  status: number;
  body: unknown;
  replayed: boolean;
}

interface SharedMutationInput {
  idempotencyKey: string;
  requestHash: string;
  correlationId: string;
  now: Date;
  session: SessionClaims;
  roles: WalletRoleFlags;
  projection: GuarantorReviewProjection;
  signature: Hex;
  nonce: bigint;
  expiry: bigint;
}

export interface ApprovalMutationInput
  extends SharedMutationInput {}

export interface RejectionMutationInput
  extends SharedMutationInput {
  reason: string;
}

const resolveExisting = async (
  env: Env,
  input: Readonly<{
    wallet: Address;
    routeKey:
      GuarantorReviewRoute;
    idempotencyKey: string;
    requestHash: string;
    now: Date;
  }>,
): Promise<
  ReviewMutationResult | null
> => {
  const existing =
    await readExistingReviewIdempotency(
      env,
      {
        wallet:
          input.wallet,
        routeKey:
          input.routeKey,
        idempotencyKey:
          input.idempotencyKey,
        requestHash:
          input.requestHash,
        now:
          input.now,
      },
    );

  if (!existing) {
    return null;
  }

  const replay =
    resolveExistingReviewIdempotency(
      existing,
      {
        requestHash:
          input.requestHash,
        now:
          input.now,
      },
    );

  return {
    status:
      replay.status,
    body:
      replay.body,
    replayed: true,
  };
};

const failConcurrentReview = (
  auctionId: string,
): never => {
  throw new DomainError(
    "AUCTION_STATE_CHANGED",
    "Guarantor review lost the concurrent state race.",
    {
      retryable: true,
      details: {
        auctionId,
      },
    },
  );
};

export const approveGuarantorReview =
  async (
    env: Env,
    input:
      ApprovalMutationInput,
  ): Promise<ReviewMutationResult> => {
    const routeKey:
      GuarantorReviewRoute =
        "POST:/api/guarantor/approve";

    const idempotencyKey =
      normalizeReviewIdempotencyKey(
        input.idempotencyKey,
      );

    const existing =
      await resolveExisting(
        env,
        {
          wallet:
            input.session.wallet,
          routeKey,
          idempotencyKey,
          requestHash:
            input.requestHash,
          now:
            input.now,
        },
      );

    if (existing) {
      return existing;
    }

    const sql =
      await createDatabaseClient(env);

    const wallet =
      input.session.wallet
        .toLowerCase();

    const expiresAt =
      reviewIdempotencyExpiresAt(
        input.now,
      );

    const payload =
      approvalAttestationPayload({
        auctionCode:
          input.projection.auctionCode,
        specHash:
          input.projection.specHash,
        nonce:
          input.nonce,
        expiry:
          input.expiry,
      });

    const payloadJson =
      JSON.stringify(payload);

    const signatureBytea =
      hexToPostgresBytea(
        input.signature,
      );

    const actorRoles =
      JSON.stringify(
        input.roles,
      );

    const rows = await sql`
      WITH eligible AS (
        SELECT
          a.id AS auction_id,
          a.auction_code,
          a.current_round,
          u.id AS guarantor_user_id
        FROM auctions AS a
        INNER JOIN partners AS p
          ON p.id = a.guarantor_id
         AND p.type = 'GUARANTOR'
         AND p.active = TRUE
        INNER JOIN users AS u
          ON u.id = p.user_id
        WHERE a.id =
            ${input.projection.auctionId}
          AND a.status = 'PENDING'
          AND LOWER(u.wallet) =
            ${wallet}
          AND a.current_round = 1
          AND (
            SELECT COUNT(*)
            FROM auction_assets AS aa
            WHERE aa.auction_id = a.id
              AND aa.spec_hash IS NOT NULL
          ) = 1
          AND (
            SELECT COUNT(*)
            FROM auction_files AS af
            WHERE af.auction_id = a.id
              AND af.kind = 'PHOTO'
              AND af.position BETWEEN 1 AND 5
          ) = 5
          AND (
            SELECT COUNT(
              DISTINCT af.position
            )
            FROM auction_files AS af
            WHERE af.auction_id = a.id
              AND af.kind = 'PHOTO'
              AND af.position BETWEEN 1 AND 5
          ) = 5
          AND (
            SELECT COUNT(*)
            FROM auction_files AS af
            WHERE af.auction_id = a.id
              AND af.kind =
                'DOCUMENT_SCAN'
              AND af.position IS NULL
          ) = 1
          AND (
            SELECT COUNT(*)
            FROM auction_files AS af
            WHERE af.auction_id = a.id
          ) = 6
          AND (
            SELECT COUNT(*)
            FROM auction_rounds AS ar
            WHERE ar.auction_id = a.id
              AND ar.round_no = 1
          ) = 1
          AND NOT EXISTS (
            SELECT 1
            FROM auction_rounds AS ar
            WHERE ar.auction_id = a.id
              AND ar.round_no <> 1
          )
          AND NOT EXISTS (
            SELECT 1
            FROM attestations AS att
            WHERE att.auction_id = a.id
              AND att.type IN (
                'GUARANTOR_APPROVED',
                'GUARANTOR_REJECTED'
              )
          )
        FOR UPDATE OF a
      ),
      claimed AS (
        INSERT INTO api_idempotency (
          actor_wallet,
          http_method,
          route_key,
          idempotency_key,
          request_hash,
          status,
          correlation_id,
          locked_at,
          expires_at,
          created_at,
          updated_at
        )
        SELECT
          ${wallet},
          'POST',
          ${routeKey},
          ${idempotencyKey},
          ${input.requestHash},
          'PROCESSING',
          ${input.correlationId},
          ${input.now},
          ${expiresAt},
          ${input.now},
          ${input.now}
        FROM eligible
        ON CONFLICT (
          actor_wallet,
          http_method,
          route_key,
          idempotency_key
        )
        DO NOTHING
        RETURNING id
      ),
      inserted_attestation AS (
        INSERT INTO attestations (
          auction_id,
          round_no,
          type,
          signer_wallet,
          payload,
          signature,
          submitted_tx_hash,
          created_at
        )
        SELECT
          e.auction_id,
          NULL,
          'GUARANTOR_APPROVED',
          ${wallet},
          ${payloadJson}::jsonb,
          ${signatureBytea}::bytea,
          NULL,
          ${input.now}
        FROM eligible AS e
        INNER JOIN claimed AS c
          ON TRUE
        ON CONFLICT DO NOTHING
        RETURNING auction_id
      ),
      touched_auction AS (
        UPDATE auctions AS a
        SET updated_at =
          ${input.now}
        FROM inserted_attestation AS att
        WHERE a.id =
          att.auction_id
          AND a.status = 'PENDING'
        RETURNING
          a.id,
          a.auction_code,
          a.status,
          a.current_round
      ),
      response_value AS (
        SELECT
          a.id AS auction_id,
          a.auction_code,
          a.current_round,
          200 AS response_status,
          jsonb_build_object(
            'data',
            jsonb_build_object(
              'ok',
              TRUE,
              'auctionId',
              a.id,
              'auctionCode',
              a.auction_code,
              'status',
              a.status,
              'attestationType',
              'GUARANTOR_APPROVED'
            )
          ) AS response_body
        FROM touched_auction AS a
      ),
      completed AS (
        UPDATE api_idempotency AS i
        SET
          status = 'COMPLETED',
          response_status =
            r.response_status,
          response_body =
            r.response_body,
          completed_at =
            ${input.now},
          updated_at =
            ${input.now}
        FROM response_value AS r
        WHERE i.id IN (
          SELECT id
          FROM claimed
        )
        RETURNING
          r.auction_id,
          r.auction_code,
          r.current_round,
          r.response_status,
          r.response_body
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
          ${input.session.sessionId},
          ${wallet},
          ${actorRoles}::jsonb,
          'GUARANTOR_AUCTION_APPROVED',
          'AUCTION',
          c.auction_id::text,
          'SUCCEEDED',
          jsonb_build_object(
            'auctionCode',
            c.auction_code,
            'currentRound',
            c.current_round,
            'attestationType',
            'GUARANTOR_APPROVED',
            'signerWallet',
            ${wallet},
            'specHash',
            ${input.projection.specHash}
          ),
          ${input.now}
        FROM completed AS c
        RETURNING id
      )
      SELECT
        c.response_status,
        c.response_body
      FROM completed AS c
      INNER JOIN inserted_audit AS audit
        ON TRUE
    `;

    const row =
      rows[0] as
        | MutationRow
        | undefined;

    if (row) {
      return {
        status:
          row.response_status,
        body:
          row.response_body,
        replayed: false,
      };
    }

    const raced =
      await resolveExisting(
        env,
        {
          wallet:
            input.session.wallet,
          routeKey,
          idempotencyKey,
          requestHash:
            input.requestHash,
          now:
            input.now,
        },
      );

    if (raced) {
      return raced;
    }

    return failConcurrentReview(
      input.projection.auctionId,
    );
  };

export const rejectGuarantorReview =
  async (
    env: Env,
    input:
      RejectionMutationInput,
  ): Promise<ReviewMutationResult> => {
    const routeKey:
      GuarantorReviewRoute =
        "POST:/api/guarantor/reject";

    const idempotencyKey =
      normalizeReviewIdempotencyKey(
        input.idempotencyKey,
      );

    const existing =
      await resolveExisting(
        env,
        {
          wallet:
            input.session.wallet,
          routeKey,
          idempotencyKey,
          requestHash:
            input.requestHash,
          now:
            input.now,
        },
      );

    if (existing) {
      return existing;
    }

    const sql =
      await createDatabaseClient(env);

    const wallet =
      input.session.wallet
        .toLowerCase();

    const expiresAt =
      reviewIdempotencyExpiresAt(
        input.now,
      );

    const payload =
      rejectionAttestationPayload({
        auctionCode:
          input.projection.auctionCode,
        reason:
          input.reason,
        nonce:
          input.nonce,
        expiry:
          input.expiry,
      });

    const payloadJson =
      JSON.stringify(payload);

    const signatureBytea =
      hexToPostgresBytea(
        input.signature,
      );

    const actorRoles =
      JSON.stringify(
        input.roles,
      );

    const rows = await sql`
      WITH eligible AS (
        SELECT
          a.id AS auction_id,
          a.auction_code,
          a.current_round,
          u.id AS guarantor_user_id
        FROM auctions AS a
        INNER JOIN partners AS p
          ON p.id = a.guarantor_id
         AND p.type = 'GUARANTOR'
         AND p.active = TRUE
        INNER JOIN users AS u
          ON u.id = p.user_id
        WHERE a.id =
            ${input.projection.auctionId}
          AND a.status = 'PENDING'
          AND LOWER(u.wallet) =
            ${wallet}
          AND a.current_round = 1
          AND (
            SELECT COUNT(*)
            FROM auction_assets AS aa
            WHERE aa.auction_id = a.id
              AND aa.spec_hash IS NOT NULL
          ) = 1
          AND (
            SELECT COUNT(*)
            FROM auction_files AS af
            WHERE af.auction_id = a.id
              AND af.kind = 'PHOTO'
              AND af.position BETWEEN 1 AND 5
          ) = 5
          AND (
            SELECT COUNT(
              DISTINCT af.position
            )
            FROM auction_files AS af
            WHERE af.auction_id = a.id
              AND af.kind = 'PHOTO'
              AND af.position BETWEEN 1 AND 5
          ) = 5
          AND (
            SELECT COUNT(*)
            FROM auction_files AS af
            WHERE af.auction_id = a.id
              AND af.kind =
                'DOCUMENT_SCAN'
              AND af.position IS NULL
          ) = 1
          AND (
            SELECT COUNT(*)
            FROM auction_files AS af
            WHERE af.auction_id = a.id
          ) = 6
          AND (
            SELECT COUNT(*)
            FROM auction_rounds AS ar
            WHERE ar.auction_id = a.id
              AND ar.round_no = 1
          ) = 1
          AND NOT EXISTS (
            SELECT 1
            FROM auction_rounds AS ar
            WHERE ar.auction_id = a.id
              AND ar.round_no <> 1
          )
          AND NOT EXISTS (
            SELECT 1
            FROM attestations AS att
            WHERE att.auction_id = a.id
              AND att.type IN (
                'GUARANTOR_APPROVED',
                'GUARANTOR_REJECTED'
              )
          )
        FOR UPDATE OF a
      ),
      claimed AS (
        INSERT INTO api_idempotency (
          actor_wallet,
          http_method,
          route_key,
          idempotency_key,
          request_hash,
          status,
          correlation_id,
          locked_at,
          expires_at,
          created_at,
          updated_at
        )
        SELECT
          ${wallet},
          'POST',
          ${routeKey},
          ${idempotencyKey},
          ${input.requestHash},
          'PROCESSING',
          ${input.correlationId},
          ${input.now},
          ${expiresAt},
          ${input.now},
          ${input.now}
        FROM eligible
        ON CONFLICT (
          actor_wallet,
          http_method,
          route_key,
          idempotency_key
        )
        DO NOTHING
        RETURNING id
      ),
      transitioned AS (
        UPDATE auctions AS a
        SET
          status = 'REJECTED',
          updated_at =
            ${input.now}
        FROM eligible AS e
        INNER JOIN claimed AS c
          ON TRUE
        WHERE a.id =
          e.auction_id
          AND a.status = 'PENDING'
        RETURNING
          a.id,
          a.auction_code,
          a.current_round,
          e.guarantor_user_id
      ),
      inserted_attestation AS (
        INSERT INTO attestations (
          auction_id,
          round_no,
          type,
          signer_wallet,
          payload,
          signature,
          submitted_tx_hash,
          created_at
        )
        SELECT
          t.id,
          NULL,
          'GUARANTOR_REJECTED',
          ${wallet},
          ${payloadJson}::jsonb,
          ${signatureBytea}::bytea,
          NULL,
          ${input.now}
        FROM transitioned AS t
        RETURNING auction_id
      ),
      inserted_status_log AS (
        INSERT INTO status_log (
          auction_id,
          round_no,
          from_status,
          to_status,
          actor_user_id,
          reason,
          tx_hash,
          created_at
        )
        SELECT
          t.id,
          t.current_round,
          'PENDING',
          'REJECTED',
          t.guarantor_user_id,
          ${input.reason},
          NULL,
          ${input.now}
        FROM transitioned AS t
        INNER JOIN inserted_attestation AS att
          ON att.auction_id = t.id
        RETURNING auction_id
      ),
      response_value AS (
        SELECT
          t.id AS auction_id,
          t.auction_code,
          t.current_round,
          200 AS response_status,
          jsonb_build_object(
            'data',
            jsonb_build_object(
              'ok',
              TRUE,
              'auctionId',
              t.id,
              'auctionCode',
              t.auction_code,
              'status',
              'REJECTED',
              'attestationType',
              'GUARANTOR_REJECTED'
            )
          ) AS response_body
        FROM transitioned AS t
        INNER JOIN inserted_status_log AS log
          ON log.auction_id = t.id
      ),
      completed AS (
        UPDATE api_idempotency AS i
        SET
          status = 'COMPLETED',
          response_status =
            r.response_status,
          response_body =
            r.response_body,
          completed_at =
            ${input.now},
          updated_at =
            ${input.now}
        FROM response_value AS r
        WHERE i.id IN (
          SELECT id
          FROM claimed
        )
        RETURNING
          r.auction_id,
          r.auction_code,
          r.current_round,
          r.response_status,
          r.response_body
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
          ${input.session.sessionId},
          ${wallet},
          ${actorRoles}::jsonb,
          'GUARANTOR_AUCTION_REJECTED',
          'AUCTION',
          c.auction_id::text,
          'SUCCEEDED',
          jsonb_build_object(
            'auctionCode',
            c.auction_code,
            'currentRound',
            c.current_round,
            'attestationType',
            'GUARANTOR_REJECTED',
            'signerWallet',
            ${wallet},
            'reasonHash',
            ${payload.reasonHash}
          ),
          ${input.now}
        FROM completed AS c
        RETURNING id
      )
      SELECT
        c.response_status,
        c.response_body
      FROM completed AS c
      INNER JOIN inserted_audit AS audit
        ON TRUE
    `;

    const row =
      rows[0] as
        | MutationRow
        | undefined;

    if (row) {
      return {
        status:
          row.response_status,
        body:
          row.response_body,
        replayed: false,
      };
    }

    const raced =
      await resolveExisting(
        env,
        {
          wallet:
            input.session.wallet,
          routeKey,
          idempotencyKey,
          requestHash:
            input.requestHash,
          now:
            input.now,
        },
      );

    if (raced) {
      return raced;
    }

    return failConcurrentReview(
      input.projection.auctionId,
    );
  };
