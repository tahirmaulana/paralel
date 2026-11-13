import type {
  TransactionSql,
} from 'postgres';

type TransactionJsonValue =
  Parameters<
    TransactionSql['json']
  >[0];

export type AuditOutcome =
  | 'SUCCEEDED'
  | 'REJECTED'
  | 'FAILED';

export type AuditInput =
  Readonly<{
    correlationId: string;
    sessionId: string;
    actorWallet: string;
    actorRoles:
      TransactionJsonValue;
    action: string;
    resourceType: string;
    resourceId:
      | string
      | null;
    outcome: AuditOutcome;
    metadata:
      TransactionJsonValue;
    createdAt: Date;
  }>;

export async function writeAuditLog(
  transaction: TransactionSql,
  input: AuditInput,
): Promise<string> {
  const rows =
    await transaction<
      ReadonlyArray<{
        id: string;
      }>
    >`
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
      VALUES (
        ${input.correlationId},
        ${input.sessionId},
        ${input.actorWallet.toLowerCase()},
        ${transaction.json(
          input.actorRoles,
        )},
        ${input.action},
        ${input.resourceType},
        ${input.resourceId},
        ${input.outcome},
        ${transaction.json(
          input.metadata,
        )},
        ${input.createdAt}
      )
      RETURNING id
    `;

  const row =
    rows[0];

  if (!row) {
    throw new Error(
      'Audit log insert returned no record.',
    );
  }

  return row.id;
}
