import type {
  SessionClaims,
  WalletRoleFlags,
} from "@paralel/auth";
import {
  DomainError,
} from "@paralel/domain";

import type { Env } from "../../env";
import {
  createDatabaseClient,
} from "../database/client";
import type {
  KycSubmissionInput,
} from "./kyc-security";

const IDEMPOTENCY_TTL_MS =
  24 * 60 * 60 * 1_000;

const ROUTE_KEY =
  "POST:/api/user/kyc";

interface ExistingIdempotencyRow {
  request_hash: string;
  status:
    | "PROCESSING"
    | "COMPLETED"
    | "FAILED";
  response_status: number | null;
  response_body: unknown;
  expires_at: string | Date;
}

interface MutationRow {
  user_id: string;
  submission_type:
    | "INITIAL"
    | "RESUBMISSION";
  response_status: number;
  response_body: {
    data: {
      ok: true;
      userId: string;
      kycStatus: "UNVERIFIED";
      submissionType:
        | "INITIAL"
        | "RESUBMISSION";
    };
  };
}

export interface SubmitKycInput {
  idempotencyKey: string;
  requestHash: string;
  correlationId: string;
  receivedAt: Date;
  session: SessionClaims;
  roles: WalletRoleFlags;
  submission: KycSubmissionInput;
}

export interface SubmitKycResult {
  status: number;
  body: unknown;
  replayed: boolean;
}

const normalizeIdempotencyKey = (
  value: string,
): string => {
  const normalized =
    value.trim();

  if (
    normalized.length < 8 ||
    normalized.length > 200
  ) {
    throw new DomainError(
      "INVALID_INPUT",
      "Idempotency-Key must contain between 8 and 200 characters.",
      {
        details: {
          field:
            "Idempotency-Key",
        },
      },
    );
  }

  return normalized;
};

const readExistingIdempotency =
  async (
    env: Env,
    wallet: string,
    key: string,
  ): Promise<
    ExistingIdempotencyRow | null
  > => {
    const sql =
      await createDatabaseClient(env);

    const rows = await sql`
      SELECT
        request_hash,
        status,
        response_status,
        response_body,
        expires_at
      FROM api_idempotency
      WHERE actor_wallet =
          ${wallet}
        AND http_method = 'POST'
        AND route_key =
          ${ROUTE_KEY}
        AND idempotency_key =
          ${key}
      LIMIT 1
    `;

    return (
      rows[0] as
        | ExistingIdempotencyRow
        | undefined
    ) ?? null;
  };

const resolveExisting = (
  existing:
    ExistingIdempotencyRow,
  requestHash: string,
  now: Date,
): SubmitKycResult => {
  if (
    existing.request_hash !==
      requestHash
  ) {
    throw new DomainError(
      "INVALID_INPUT",
      "Idempotency-Key was already used with a different request body.",
    );
  }

  if (
    new Date(
      existing.expires_at,
    ).getTime() <=
      now.getTime()
  ) {
    throw new DomainError(
      "INVALID_INPUT",
      "Idempotency-Key has expired and cannot be reused.",
    );
  }

  if (
    existing.status ===
      "COMPLETED" &&
    existing.response_status !==
      null &&
    existing.response_body !==
      null
  ) {
    return {
      status:
        existing.response_status,
      body:
        existing.response_body,
      replayed: true,
    };
  }

  throw new DomainError(
    "ALREADY_PROCESSED",
    "An equivalent request is already processing.",
    {
      retryable: true,
    },
  );
};

export const submitKyc = async (
  env: Env,
  input: SubmitKycInput,
): Promise<SubmitKycResult> => {
  const key =
    normalizeIdempotencyKey(
      input.idempotencyKey,
    );

  const wallet =
    input.session.wallet
      .toLowerCase();

  const existing =
    await readExistingIdempotency(
      env,
      wallet,
      key,
    );

  if (existing) {
    return resolveExisting(
      existing,
      input.requestHash,
      input.receivedAt,
    );
  }

  const sql =
    await createDatabaseClient(env);

  const expiresAt =
    new Date(
      input.receivedAt.getTime() +
        IDEMPOTENCY_TTL_MS,
    );

  const actorRoles =
    JSON.stringify(input.roles);

  const auditMetadata =
    JSON.stringify({
      submissionType:
        "DATABASE_LOCKED_DECISION",
    });

  const rows = await sql`
    WITH existing_user AS (
      SELECT
        u.id
      FROM users AS u
      WHERE u.wallet = ${wallet}
      LIMIT 1
    ),
    current_kyc AS (
      SELECT
        k.status
      FROM kyc_profiles AS k
      INNER JOIN existing_user AS u
        ON u.id = k.user_id
      LIMIT 1
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
        ${ROUTE_KEY},
        ${key},
        ${input.requestHash},
        'PROCESSING',
        ${input.correlationId},
        ${input.receivedAt},
        ${expiresAt},
        ${input.receivedAt},
        ${input.receivedAt}
      WHERE NOT EXISTS (
        SELECT 1
        FROM current_kyc
        WHERE status = 'VERIFIED'
      )
      ON CONFLICT (
        actor_wallet,
        http_method,
        route_key,
        idempotency_key
      )
      DO NOTHING
      RETURNING id
    ),
    resolved_user AS (
      INSERT INTO users (
        wallet,
        user_type,
        preferred_language,
        created_at,
        updated_at
      )
      SELECT
        ${wallet},
        'PUBLIC',
        'EN',
        ${input.receivedAt},
        ${input.receivedAt}
      FROM claimed
      ON CONFLICT (wallet)
      DO UPDATE SET
        updated_at =
          users.updated_at
      RETURNING id
    ),
    prior_kyc AS (
      SELECT
        k.status
      FROM kyc_profiles AS k
      INNER JOIN resolved_user AS u
        ON u.id = k.user_id
      LIMIT 1
    ),
    upserted_kyc AS (
      INSERT INTO kyc_profiles (
        user_id,
        full_name,
        nik,
        address,
        ktp_photo,
        admin_comment,
        face_verified,
        id_extracted_by_ai,
        status,
        verified_at,
        created_at,
        updated_at
      )
      SELECT
        u.id,
        ${input.submission.fullName},
        ${input.submission.nik},
        ${input.submission.address},
        ${input.submission.ktpPhoto},
        NULL,
        FALSE,
        FALSE,
        'UNVERIFIED',
        NULL,
        ${input.receivedAt},
        ${input.receivedAt}
      FROM resolved_user AS u
      ON CONFLICT (user_id)
      DO UPDATE SET
        full_name =
          EXCLUDED.full_name,
        nik =
          EXCLUDED.nik,
        address =
          EXCLUDED.address,
        ktp_photo =
          EXCLUDED.ktp_photo,
        admin_comment =
          NULL,
        face_verified =
          FALSE,
        id_extracted_by_ai =
          FALSE,
        status =
          'UNVERIFIED',
        verified_at =
          NULL,
        updated_at =
          EXCLUDED.updated_at
      WHERE
        kyc_profiles.status =
          'UNVERIFIED'
      RETURNING
        user_id
    ),
    mutation_result AS (
      SELECT
        k.user_id,
        CASE
          WHEN EXISTS (
            SELECT 1
            FROM prior_kyc
          )
          THEN 'RESUBMISSION'
          ELSE 'INITIAL'
        END AS submission_type
      FROM upserted_kyc AS k
    ),
    response_value AS (
      SELECT
        m.user_id,
        m.submission_type,
        200 AS response_status,
        jsonb_build_object(
          'data',
          jsonb_build_object(
            'ok',
            TRUE,
            'userId',
            m.user_id,
            'kycStatus',
            'UNVERIFIED',
            'submissionType',
            m.submission_type
          )
        ) AS response_body
      FROM mutation_result AS m
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
          ${input.receivedAt},
        updated_at =
          ${input.receivedAt}
      FROM response_value AS r
      WHERE i.id IN (
        SELECT id
        FROM claimed
      )
      RETURNING
        r.user_id,
        r.submission_type,
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
        'USER_KYC_SUBMITTED',
        'KYC_PROFILE',
        c.user_id::text,
        'SUCCEEDED',
        jsonb_build_object(
          'submissionType',
          c.submission_type,
          'boundary',
          ${auditMetadata}::jsonb
        ),
        ${input.receivedAt}
      FROM completed AS c
      RETURNING id
    )
    SELECT
      c.user_id,
      c.submission_type,
      c.response_status,
      c.response_body
    FROM completed AS c
    INNER JOIN inserted_audit AS a
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

  const afterConflict =
    await readExistingIdempotency(
      env,
      wallet,
      key,
    );

  if (afterConflict) {
    return resolveExisting(
      afterConflict,
      input.requestHash,
      input.receivedAt,
    );
  }

  throw new DomainError(
    "ALREADY_PROCESSED",
    "KYC is already verified and cannot be resubmitted.",
  );
};
