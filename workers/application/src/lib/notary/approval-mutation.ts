import type {
  SessionClaims,
  WalletRoleFlags,
} from "@paralel/auth";
import {
  DomainError,
} from "@paralel/domain";
import type {
  Hex,
} from "viem";

import type { Env } from "../../env";
import {
  createDatabaseClient,
} from "../database/client";
import type {
  NotaryApprovalPreflight,
} from "./approval-preflight";
import {
  createNotaryApprovalPayload,
  notaryHexToBytea,
} from "./approval-values";

const ROUTE_KEY =
  "POST:/api/notary/approve";

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

interface MutationRow {
  response_status: number;
  response_body: unknown;
}

export interface ApproveNotaryInput {
  idempotencyKey: string;
  requestHash: string;
  correlationId: string;
  now: Date;
  session: SessionClaims;
  roles: WalletRoleFlags;
  preflight:
    NotaryApprovalPreflight;
  signature: Hex;
}

export interface ApproveNotaryResult {
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
): ApproveNotaryResult => {
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
    "An equivalent Notary approval is already processing.",
    {
      retryable: true,
    },
  );
};

export const approveNotary =
  async (
    env: Env,
    input:
      ApproveNotaryInput,
  ): Promise<
    ApproveNotaryResult
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

    const snapshot =
      input.preflight.snapshot;

    const material =
      input.preflight.material;

    const payload =
      createNotaryApprovalPayload(
        material,
      );

    const payloadJson =
      JSON.stringify(payload);

    const signatureBytea =
      notaryHexToBytea(
        input.signature,
      );

    const codeHashBytea =
      notaryHexToBytea(
        material.codeHash,
      );

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
      WITH eligible AS (
        SELECT
          a.id AS auction_id,
          a.auction_code,
          a.current_round,
          notary.id
            AS notary_partner_id
        FROM auctions AS a
        INNER JOIN partners AS notary
          ON notary.type =
            'NOTARY'
         AND notary.active = TRUE
        INNER JOIN users AS notary_user
          ON notary_user.id =
            notary.user_id
         AND LOWER(
           notary_user.wallet
         ) = ${wallet}
        WHERE a.id =
            ${snapshot.auctionId}
          AND a.status =
            'PENDING'
          AND a.notary_id
            IS NULL
          AND a.current_round =
            ${snapshot.currentRound}
          AND EXISTS (
            SELECT 1
            FROM attestations AS att
            WHERE att.auction_id =
              a.id
              AND att.type =
                'GUARANTOR_APPROVED'
          )
          AND NOT EXISTS (
            SELECT 1
            FROM attestations AS att
            WHERE att.auction_id =
              a.id
              AND att.type =
                'NOTARY_APPROVED'
          )
          AND NOT EXISTS (
            SELECT 1
            FROM confirmation_codes AS code
            WHERE code.auction_id =
              a.id
          )
          AND (
            SELECT COUNT(*)
            FROM auction_assets AS aa
            WHERE aa.auction_id =
              a.id
              AND aa.spec_hash
                IS NOT NULL
          ) = 1
          AND (
            SELECT COUNT(*)
            FROM auction_files AS af
            WHERE af.auction_id =
              a.id
              AND af.kind =
                'PHOTO'
              AND af.position
                BETWEEN 1 AND 5
          ) = 5
          AND (
            SELECT COUNT(
              DISTINCT af.position
            )
            FROM auction_files AS af
            WHERE af.auction_id =
              a.id
              AND af.kind =
                'PHOTO'
              AND af.position
                BETWEEN 1 AND 5
          ) = 5
          AND (
            SELECT COUNT(*)
            FROM auction_files AS af
            WHERE af.auction_id =
              a.id
              AND af.kind =
                'DOCUMENT_SCAN'
              AND af.position
                IS NULL
          ) = 1
          AND (
            SELECT COUNT(*)
            FROM auction_files AS af
            WHERE af.auction_id =
              a.id
          ) = 6
          AND (
            SELECT COUNT(*)
            FROM auction_rounds AS ar
            WHERE ar.auction_id =
              a.id
              AND ar.round_no =
                a.current_round
          ) = 1
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
          ${ROUTE_KEY},
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
      assigned AS (
        UPDATE auctions AS a
        SET
          notary_id =
            e.notary_partner_id,
          updated_at =
            ${input.now}
        FROM eligible AS e
        INNER JOIN claimed AS claim
          ON TRUE
        WHERE a.id =
            e.auction_id
          AND a.status =
            'PENDING'
          AND a.notary_id
            IS NULL
        RETURNING
          a.id,
          a.auction_code,
          a.current_round,
          e.notary_partner_id
      ),
      attested AS (
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
          assigned.id,
          assigned.current_round,
          'NOTARY_APPROVED',
          ${wallet},
          ${payloadJson}::jsonb,
          ${signatureBytea}::bytea,
          NULL,
          ${input.now}
        FROM assigned
        RETURNING auction_id
      ),
      coded AS (
        INSERT INTO confirmation_codes (
          auction_id,
          code_hash,
          issued_by_notary,
          signature,
          emailed_at,
          used_at,
          created_at
        )
        SELECT
          assigned.id,
          ${codeHashBytea}::bytea,
          assigned.notary_partner_id,
          ${signatureBytea}::bytea,
          NULL,
          NULL,
          ${input.now}
        FROM assigned
        INNER JOIN attested
          ON attested.auction_id =
            assigned.id
        ON CONFLICT (
          auction_id
        )
        DO NOTHING
        RETURNING auction_id
      ),
      response_value AS (
        SELECT
          assigned.id
            AS auction_id,
          assigned.auction_code,
          assigned.current_round,
          assigned.notary_partner_id,
          200 AS response_status,
          jsonb_build_object(
            'ok',
            TRUE,
            'auctionId',
            assigned.id,
            'auctionCode',
            assigned.auction_code,
            'currentRound',
            assigned.current_round,
            'notaryWallet',
            ${wallet},
            'codeHash',
            ${material.codeHash}
          ) AS response_body
        FROM assigned
        INNER JOIN coded
          ON coded.auction_id =
            assigned.id
      ),
      completed AS (
        UPDATE api_idempotency AS idem
        SET
          status =
            'COMPLETED',
          response_status =
            response.response_status,
          response_body =
            response.response_body,
          completed_at =
            ${input.now},
          updated_at =
            ${input.now}
        FROM response_value AS response
        WHERE idem.id IN (
          SELECT id
          FROM claimed
        )
        RETURNING
          response.auction_id,
          response.auction_code,
          response.current_round,
          response.notary_partner_id,
          response.response_status,
          response.response_body
      ),
      audited AS (
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
          'NOTARY_AUCTION_APPROVED',
          'AUCTION',
          completed.auction_id
            ::text,
          'SUCCEEDED',
          jsonb_build_object(
            'auctionId',
            completed.auction_id,
            'auctionCode',
            completed.auction_code,
            'currentRound',
            completed.current_round,
            'notaryPartnerId',
            completed.notary_partner_id,
            'nonce',
            ${material.nonce.toString()},
            'expiry',
            ${material.expiry.toString()},
            'codeHash',
            ${material.codeHash},
            'derivation',
            ${material.derivation}
          ),
          ${input.now}
        FROM completed
        RETURNING id
      )
      SELECT
        completed.response_status,
        completed.response_body
      FROM completed
      INNER JOIN audited
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
      "AUCTION_STATE_CHANGED",
      "Another Notary already completed this approval.",
      {
        details: {
          auctionId:
            snapshot.auctionId,
        },
      },
    );
  };
