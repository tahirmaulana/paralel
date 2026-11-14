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
  DerivedNotarySigningMaterial,
  NotaryApprovalSnapshot,
} from "./approval-snapshot";

const ROUTE_KEY =
  "POST:/api/notary/approve/init";

const IDEMPOTENCY_TTL_MS =
  24 * 60 * 60 * 1_000;

interface ExistingRow {
  request_hash: string;
  status:
    | "PROCESSING"
    | "COMPLETED"
    | "FAILED";
  response_status: number | null;
  response_body: unknown;
  expires_at: string | Date;
}

interface StoredRow {
  response_status: number;
  response_body: unknown;
}

export interface InitializeNotaryApprovalInput {
  idempotencyKey: string;
  requestHash: string;
  correlationId: string;
  now: Date;
  session: SessionClaims;
  roles: WalletRoleFlags;
  snapshot:
    NotaryApprovalSnapshot;
  material:
    DerivedNotarySigningMaterial;
}

export interface InitializeNotaryApprovalResult {
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

const readExisting = async (
  env: Env,
  input: Readonly<{
    wallet: string;
    idempotencyKey: string;
  }>,
): Promise<ExistingRow | null> => {
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
        ${input.wallet}
      AND http_method = 'POST'
      AND route_key =
        ${ROUTE_KEY}
      AND idempotency_key =
        ${input.idempotencyKey}
    LIMIT 1
  `;

  return (
    rows[0] as
      | ExistingRow
      | undefined
  ) ?? null;
};

const replayExisting = (
  existing: ExistingRow,
  input: Readonly<{
    requestHash: string;
    now: Date;
  }>,
): InitializeNotaryApprovalResult => {
  if (
    existing.request_hash !==
      input.requestHash
  ) {
    throw new DomainError(
      "INVALID_INPUT",
      "Idempotency-Key was already used with a different request body.",
      {
        details: {
          field:
            "Idempotency-Key",
        },
      },
    );
  }

  if (
    new Date(
      existing.expires_at,
    ).getTime() <=
      input.now.getTime()
  ) {
    throw new DomainError(
      "INVALID_INPUT",
      "Idempotency-Key has expired and cannot be reused.",
      {
        details: {
          field:
            "Idempotency-Key",
        },
      },
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
    "An equivalent Notary approval initialization is already processing.",
    {
      retryable: true,
    },
  );
};

export const initializeNotaryApproval =
  async (
    env: Env,
    input:
      InitializeNotaryApprovalInput,
  ): Promise<
    InitializeNotaryApprovalResult
  > => {
    const idempotencyKey =
      normalizeIdempotencyKey(
        input.idempotencyKey,
      );

    const wallet =
      input.session.wallet
        .toLowerCase();

    const existing =
      await readExisting(
        env,
        {
          wallet,
          idempotencyKey,
        },
      );

    if (existing) {
      return replayExisting(
        existing,
        {
          requestHash:
            input.requestHash,
          now:
            input.now,
        },
      );
    }

    const body = {
      auctionKey:
        input.material.auctionKey,
      paramsHash:
        input.material.paramsHash,
      codeHash:
        input.material.codeHash,
      nonce:
        input.material
          .nonce
          .toString(),
      expiry:
        input.material
          .expiry
          .toString(),
      derivation:
        input.material.derivation,
    };

    const responseJson =
      JSON.stringify(body);

    const rolesJson =
      JSON.stringify(
        input.roles,
      );

    const expiresAt =
      new Date(
        input.now.getTime() +
          IDEMPOTENCY_TTL_MS,
      );

    const sql =
      await createDatabaseClient(env);

    const rows = await sql`
      WITH inserted_idempotency AS (
        INSERT INTO api_idempotency (
          actor_wallet,
          http_method,
          route_key,
          idempotency_key,
          request_hash,
          status,
          response_status,
          response_body,
          correlation_id,
          locked_at,
          completed_at,
          expires_at,
          created_at,
          updated_at
        )
        VALUES (
          ${wallet},
          'POST',
          ${ROUTE_KEY},
          ${idempotencyKey},
          ${input.requestHash},
          'COMPLETED',
          200,
          ${responseJson}::jsonb,
          ${input.correlationId},
          ${input.now},
          ${input.now},
          ${expiresAt},
          ${input.now},
          ${input.now}
        )
        ON CONFLICT (
          actor_wallet,
          http_method,
          route_key,
          idempotency_key
        )
        DO NOTHING
        RETURNING
          response_status,
          response_body
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
          ${rolesJson}::jsonb,
          'NOTARY_APPROVAL_INITIALIZED',
          'AUCTION',
          ${input.snapshot.auctionId},
          'SUCCEEDED',
          jsonb_build_object(
            'auctionId',
            ${input.snapshot.auctionId},
            'auctionCode',
            ${input.snapshot.auctionCode},
            'currentRound',
            ${input.snapshot.currentRound},
            'nonce',
            ${input.material.nonce.toString()},
            'expiry',
            ${input.material.expiry.toString()},
            'codeHash',
            ${input.material.codeHash},
            'paramsHash',
            ${input.material.paramsHash},
            'derivation',
            ${input.material.derivation}
          ),
          ${input.now}
        FROM inserted_idempotency
        RETURNING id
      )
      SELECT
        i.response_status,
        i.response_body
      FROM inserted_idempotency AS i
      INNER JOIN inserted_audit AS audit
        ON TRUE
    `;

    const row =
      rows[0] as
        | StoredRow
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
      await readExisting(
        env,
        {
          wallet,
          idempotencyKey,
        },
      );

    if (raced) {
      return replayExisting(
        raced,
        {
          requestHash:
            input.requestHash,
          now:
            input.now,
        },
      );
    }

    throw new DomainError(
      "RPC_UNAVAILABLE",
      "Notary approval initialization could not be persisted.",
      {
        retryable: true,
      },
    );
  };
