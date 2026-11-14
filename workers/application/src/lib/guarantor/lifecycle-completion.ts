import type {
  SessionClaims,
  WalletRoleFlags,
} from "@paralel/auth";

import type { Env } from "../../env";
import {
  createDatabaseClient,
} from "../database/client";
import type {
  ExecuteGuarantorRelayResult,
} from "../relay/executor";
import type {
  GuarantorLifecycleOperation,
} from "./lifecycle-preflight";

export interface CompleteLifecycleInput {
  routeKey: string;
  idempotencyKey: string;
  requestHash: string;
  correlationId: string;
  session: SessionClaims;
  roles: WalletRoleFlags;
  operation:
    GuarantorLifecycleOperation;
  auctionId: string;
  auctionCode: string;
  currentRound: number;
  result:
    ExecuteGuarantorRelayResult;
  now: Date;
}

const actionForOperation = (
  operation:
    GuarantorLifecycleOperation,
):
  | "GUARANTOR_COLLECTED_RELAYED"
  | "GUARANTOR_WITHDRAWN_RELAYED" =>
  operation === "MARK_COLLECTED"
    ? "GUARANTOR_COLLECTED_RELAYED"
    : "GUARANTOR_WITHDRAWN_RELAYED";

export const completeGuarantorLifecycle =
  async (
    env: Env,
    input:
      CompleteLifecycleInput,
  ): Promise<void> => {
    if (input.result.replayed) {
      return;
    }

    const sql =
      await createDatabaseClient(env);

    const wallet =
      input.session.wallet
        .toLowerCase();

    const bodyJson =
      JSON.stringify(
        input.result.body,
      );

    const rolesJson =
      JSON.stringify(
        input.roles,
      );

    const action =
      actionForOperation(
        input.operation,
      );

    const expiresAt =
      new Date(
        input.now.getTime() +
          24 * 60 * 60 * 1_000,
      );

    await sql`
      WITH completed_idempotency AS (
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
          ${input.routeKey},
          ${input.idempotencyKey},
          ${input.requestHash},
          'COMPLETED',
          ${input.result.status},
          ${bodyJson}::jsonb,
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
        RETURNING id
      )
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
        ${action},
        'AUCTION',
        ${input.auctionId},
        'SUCCEEDED',
        jsonb_build_object(
          'auctionCode',
          ${input.auctionCode},
          'currentRound',
          ${input.currentRound},
          'operation',
          ${input.operation},
          'relayStatus',
          ${input.result.body.data.relayStatus},
          'txHash',
          ${input.result.body.data.txHash},
          'projectionPending',
          ${input.result.body.data.projectionPending},
          'intentId',
          ${input.result.body.data.intentId}
        ),
        ${input.now}
      FROM completed_idempotency
    `;
  };
