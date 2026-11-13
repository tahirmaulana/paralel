// @file workers/indexer/src/process.ts
import {
  and,
  eq,
  inArray,
  sql,
} from 'drizzle-orm';
import {
  ParalelAuctionAbi,
  ParalelAuctionV3Abi,
  getParalelDeployment,
  ContractWithdrawalKind,
} from '@paralel/contracts';
import {
  isAddress,
  keccak256,
  toBytes,
} from 'viem';
import {
  chainEvents,
  auctions,
  auctionRounds,
  bids,
  bidderStakes,
  feeConfig,
  payouts,
  withdrawals,
} from '../../../packages/db/src/schema';


import {
  groupCanonicalTransactions,
  type CanonicalChainEvent,
  type CanonicalTransactionGroup,
} from './event-ordering';

import {
  attributeFeeCredits,
} from './fee-attribution';

import type {
  IndexerDatabase,
} from './database';

import {
  canProjectAuctionRegistered,
  parseAuctionRegisteredProjection,
} from './auction-registered';

import {
  parseGuarantorLifecycleProjection,
} from './guarantor-lifecycle';

import {
  parsePlatformFeeWithdrawalProjection,
  parseRoundScheduledProjection,
  parseRefundWithdrawalProjection,
  parseSettledProjection,
} from './relay-projection';

type Db = any;

const auctionAbi =
  getParalelDeployment().contractVersion === 'v3'
    ? ParalelAuctionV3Abi
    : ParalelAuctionAbi;

async function buildAuctionMap(db: Db): Promise<Map<string, string>> {
  const rows = await db.select({ id: auctions.id, auctionCode: auctions.auctionCode }).from(auctions);
  const map = new Map<string, string>();
  for (const r of rows) {
    map.set(keccak256(toBytes(r.auctionCode)), r.id);
  }
  return map;
}

type AuctionRegisteredProjectionResult =
  Readonly<{
    projected:
      boolean;
  }>;

async function projectAuctionRegistered(
  db: Db,
  input:
    Readonly<{
      eventId: number;
      auctionId: string;
      feeConfigId: string;
      eventName: string;
      args: unknown;
      txHash: string;
      blockTs: Date;
    }>,
): Promise<void> {
  const projection =
    parseAuctionRegisteredProjection({
      eventName:
        input.eventName,
      args:
        input.args,
      txHash:
        input.txHash,
      blockTs:
        input.blockTs,
    });

  /*
   * One PostgreSQL statement owns the complete projection:
   *
   * - validates auction and relay lifecycle;
   * - validates event tx hash against the persisted signed transaction;
   * - recovers PREPARED when chain evidence proves broadcast;
   * - promotes relay intent to CONFIRMED;
   * - projects auction to SCHEDULED;
   * - writes the transition log;
   * - marks the chain event processed.
   *
   * Any failed predicate leaves every target unchanged.
   */
  const result =
    await db.execute(
      sql`
        WITH current_state AS (
          SELECT
            a.id
              AS auction_id,
            a.current_round,
            a.status
              AS auction_status,
            ri.id
              AS relay_intent_id,
            ri.status
              AS relay_status,
            ri.tx_hash,
            lower(
              ri.payload
                ->> 'derivedTxHash'
            ) AS derived_tx_hash
          FROM auctions a
          JOIN relay_intents ri
            ON ri.resource_id =
              a.id
            AND ri.operation =
              'REGISTER_AUCTION'
          WHERE
            a.id =
              ${input.auctionId}
          FOR UPDATE OF a, ri
        ),
        eligible AS (
          SELECT *
          FROM current_state
          WHERE
            auction_status IN (
              'REGISTERING',
              'SCHEDULED'
            )
            AND relay_status IN (
              'PREPARED',
              'SUBMITTED',
              'CONFIRMED'
            )
            AND derived_tx_hash =
              lower(
                ${projection.txHash}
              )
            AND (
              tx_hash IS NULL
              OR lower(tx_hash) =
                lower(
                  ${projection.txHash}
                )
            )
        ),
        relay_projection AS (
          UPDATE relay_intents ri
          SET
            status =
              'CONFIRMED',
            tx_hash =
              lower(
                ${projection.txHash}
              ),
            submitted_at =
              COALESCE(
                ri.submitted_at,
                GREATEST(
                  ${projection.blockTs},
                  ri.prepared_at
                )
              ),
            confirmed_at =
              COALESCE(
                ri.confirmed_at,
                GREATEST(
                  ${projection.blockTs},
                  COALESCE(
                    ri.submitted_at,
                    ri.prepared_at
                  ),
                  ri.prepared_at
                )
              ),
            last_error_code =
              NULL,
            last_error_message =
              NULL,
            updated_at =
              GREATEST(
                ${projection.blockTs},
                ri.updated_at,
                COALESCE(
                  ri.submitted_at,
                  ri.prepared_at
                ),
                ri.prepared_at
              )
          FROM eligible e
          WHERE
            ri.id =
              e.relay_intent_id
          RETURNING
            ri.id
        ),
        auction_projection AS (
          UPDATE auctions a
          SET
            status =
              'SCHEDULED',
            fee_config_id =
              ${input.feeConfigId},
            onchain_tx_hash =
              lower(
                ${projection.txHash}
              ),
            onchain_registered_at =
              COALESCE(
                a.onchain_registered_at,
                ${projection.blockTs}
              ),
            updated_at =
              ${projection.blockTs}
          FROM eligible e
          WHERE
            a.id =
              e.auction_id
          RETURNING
            a.id,
            e.current_round,
            e.auction_status
        ),
        transition_log AS (
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
            ap.id,
            ap.current_round,
            'REGISTERING',
            'SCHEDULED',
            NULL,
            'AuctionRegistered projection',
            lower(
              ${projection.txHash}
            ),
            ${projection.blockTs}
          FROM auction_projection ap
          WHERE
            ap.auction_status =
              'REGISTERING'
          RETURNING id
        ),
        processed_event AS (
          UPDATE chain_events ce
          SET
            processed =
              true,
            processing_error =
              NULL
          WHERE
            ce.id =
              ${input.eventId}
            AND EXISTS (
              SELECT 1
              FROM relay_projection
            )
            AND EXISTS (
              SELECT 1
              FROM auction_projection
            )
          RETURNING
            ce.id
        )
        SELECT
          EXISTS (
            SELECT 1
            FROM processed_event
          ) AS projected
      `,
    );

  const row =
    (
      'rows' in result &&
      Array.isArray(
        result.rows,
      )
        ? result.rows[0]
        : result[0]
    ) as
      AuctionRegisteredProjectionResult
      | undefined;

  if (
    !row ||
    row.projected !== true
  ) {
    throw new Error(
      'AuctionRegistered projection failed its durable state or tx-hash boundary.',
    );
  }
}

type GuarantorLifecycleProjectionResult =
  Readonly<{
    projected:
      boolean;
  }>;

async function projectCollected(
  db: Db,
  input:
    Readonly<{
      eventId: number;
      auctionId: string;
      eventName: string;
      args: unknown;
      txHash: string;
      blockTs: Date;
    }>,
): Promise<void> {
  const projection =
    parseGuarantorLifecycleProjection({
      eventName:
        input.eventName,
      args:
        input.args,
      txHash:
        input.txHash,
      blockTs:
        input.blockTs,
    });

  if (
    projection.operation !==
      'MARK_COLLECTED' ||
    projection.attestationType !==
      'GUARANTOR_COLLECTED' ||
    projection.targetStatus !==
      'CLAIM_PERIOD'
  ) {
    throw new Error(
      'Collected event produced an invalid lifecycle projection.',
    );
  }

  /*
   * One PostgreSQL statement owns the complete chain projection:
   *
   * - locks the exact MARK_COLLECTED durable relay;
   * - validates round and exact signed transaction hash;
   * - recovers PREPARED when chain evidence proves broadcast;
   * - inserts the chain-backed Guarantor attestation once;
   * - confirms the relay intent;
   * - advances COLLECTION to CLAIM_PERIOD;
   * - marks the event processed.
   *
   * Any failed predicate leaves every target unchanged.
   */
  const result =
    await db.execute(
      sql`
        WITH current_state AS (
          SELECT
            a.id
              AS auction_id,
            a.status
              AS auction_status,
            a.current_round,
            ri.id
              AS relay_intent_id,
            ri.status
              AS relay_status,
            ri.tx_hash,
            lower(
              ri.payload
                ->> 'derivedTxHash'
            ) AS derived_tx_hash,
            lower(
              ri.payload
                -> 'markCollected'
                ->> 'guarantor'
            ) AS signer_wallet,
            ri.payload
              -> 'markCollected'
              ->> 'signature'
              AS signature_hex,
            ri.payload
              -> 'markCollected'
              ->> 'roundNo'
              AS payload_round_no,
            ri.payload
              -> 'markCollected'
              AS attestation_payload
          FROM auctions a
          JOIN relay_intents ri
            ON ri.resource_id =
              a.id
            AND ri.resource_type =
              'AUCTION'
            AND ri.operation =
              'MARK_COLLECTED'
          WHERE
            a.id =
              ${input.auctionId}
          FOR UPDATE OF a, ri
        ),
        eligible AS (
          SELECT *
          FROM current_state
          WHERE
            auction_status IN (
              'COLLECTION',
              'CLAIM_PERIOD'
            )
            AND current_round =
              ${projection.roundNo}
            AND payload_round_no =
              ${projection.roundNo.toString()}
            AND relay_status IN (
              'PREPARED',
              'SUBMITTED',
              'CONFIRMED'
            )
            AND derived_tx_hash =
              lower(
                ${projection.txHash}
              )
            AND (
              tx_hash IS NULL
              OR lower(tx_hash) =
                lower(
                  ${projection.txHash}
                )
            )
            AND signer_wallet ~
              '^0x[0-9a-f]{40}$'
            AND signature_hex ~
              '^0x[0-9a-fA-F]{130}$'
        ),
        relay_projection AS (
          UPDATE relay_intents ri
          SET
            status =
              'CONFIRMED',
            tx_hash =
              lower(
                ${projection.txHash}
              ),
            submitted_at =
              COALESCE(
                ri.submitted_at,
                GREATEST(
                  ${projection.blockTs},
                  ri.prepared_at
                )
              ),
            confirmed_at =
              COALESCE(
                ri.confirmed_at,
                GREATEST(
                  ${projection.blockTs},
                  COALESCE(
                    ri.submitted_at,
                    ri.prepared_at
                  ),
                  ri.prepared_at
                )
              ),
            last_error_code =
              NULL,
            last_error_message =
              NULL,
            updated_at =
              GREATEST(
                ${projection.blockTs},
                ri.updated_at,
                COALESCE(
                  ri.submitted_at,
                  ri.prepared_at
                ),
                ri.prepared_at
              )
          FROM eligible e
          WHERE
            ri.id =
              e.relay_intent_id
          RETURNING
            ri.id
        ),
        attestation_projection AS (
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
            e.current_round,
            'GUARANTOR_COLLECTED',
            e.signer_wallet,
            e.attestation_payload,
            decode(
              substring(
                e.signature_hex
                FROM 3
              ),
              'hex'
            ),
            lower(
              ${projection.txHash}
            ),
            ${projection.blockTs}
          FROM eligible e
          WHERE NOT EXISTS (
            SELECT 1
            FROM attestations existing
            WHERE
              existing.auction_id =
                e.auction_id
              AND existing.round_no =
                e.current_round
              AND existing.type =
                'GUARANTOR_COLLECTED'
          )
          RETURNING id
        ),
        existing_attestation AS (
          SELECT
            existing.id
          FROM attestations existing
          JOIN eligible e
            ON existing.auction_id =
              e.auction_id
            AND existing.round_no =
              e.current_round
            AND existing.type =
              'GUARANTOR_COLLECTED'
            AND lower(
              existing.submitted_tx_hash
            ) =
              lower(
                ${projection.txHash}
              )
        ),
        auction_projection AS (
          UPDATE auctions a
          SET
            status =
              'CLAIM_PERIOD',
            updated_at =
              ${projection.blockTs}
          FROM eligible e
          WHERE
            a.id =
              e.auction_id
          RETURNING
            a.id
        ),
        processed_event AS (
          UPDATE chain_events ce
          SET
            processed =
              true,
            processing_error =
              NULL
          WHERE
            ce.id =
              ${input.eventId}
            AND EXISTS (
              SELECT 1
              FROM relay_projection
            )
            AND EXISTS (
              SELECT 1
              FROM auction_projection
            )
            AND (
              EXISTS (
                SELECT 1
                FROM attestation_projection
              )
              OR EXISTS (
                SELECT 1
                FROM existing_attestation
              )
            )
          RETURNING
            ce.id
        )
        SELECT
          EXISTS (
            SELECT 1
            FROM processed_event
          ) AS projected
      `,
    );

  const row =
    (
      'rows' in result &&
      Array.isArray(
        result.rows,
      )
        ? result.rows[0]
        : result[0]
    ) as
      GuarantorLifecycleProjectionResult
      | undefined;

  if (
    !row ||
    row.projected !== true
  ) {
    throw new Error(
      'Collected projection failed its durable relay, round, or tx-hash boundary.',
    );
  }
}

async function projectWithdrawn(
  db: Db,
  input:
    Readonly<{
      eventId: number;
      auctionId: string;
      eventName: string;
      args: unknown;
      txHash: string;
      blockTs: Date;
    }>,
): Promise<void> {
  const projection =
    parseGuarantorLifecycleProjection({
      eventName:
        input.eventName,
      args:
        input.args,
      txHash:
        input.txHash,
      blockTs:
        input.blockTs,
    });

  if (
    projection.operation !==
      'MARK_WITHDRAWN' ||
    projection.attestationType !==
      'GUARANTOR_WITHDRAWN' ||
    projection.targetStatus !==
      'WITHDRAWN'
  ) {
    throw new Error(
      'WithdrawnItem event produced an invalid lifecycle projection.',
    );
  }

  /*
   * One PostgreSQL statement owns the complete chain projection:
   *
   * - locks the exact MARK_WITHDRAWN durable relay;
   * - validates round and exact signed transaction hash;
   * - recovers PREPARED when chain evidence proves broadcast;
   * - inserts the chain-backed Guarantor attestation once;
   * - confirms the relay intent;
   * - advances PASSED_IN to WITHDRAWN;
   * - marks the event processed.
   *
   * Any failed predicate leaves every target unchanged.
   */
  const result =
    await db.execute(
      sql`
        WITH current_state AS (
          SELECT
            a.id
              AS auction_id,
            a.status
              AS auction_status,
            a.current_round,
            ri.id
              AS relay_intent_id,
            ri.status
              AS relay_status,
            ri.tx_hash,
            lower(
              ri.payload
                ->> 'derivedTxHash'
            ) AS derived_tx_hash,
            lower(
              ri.payload
                -> 'markWithdrawn'
                ->> 'guarantor'
            ) AS signer_wallet,
            ri.payload
              -> 'markWithdrawn'
              ->> 'signature'
              AS signature_hex,
            ri.payload
              -> 'markWithdrawn'
              ->> 'roundNo'
              AS payload_round_no,
            ri.payload
              -> 'markWithdrawn'
              AS attestation_payload
          FROM auctions a
          JOIN relay_intents ri
            ON ri.resource_id =
              a.id
            AND ri.resource_type =
              'AUCTION'
            AND ri.operation =
              'MARK_WITHDRAWN'
          WHERE
            a.id =
              ${input.auctionId}
          FOR UPDATE OF a, ri
        ),
        eligible AS (
          SELECT *
          FROM current_state
          WHERE
            auction_status IN (
              'PASSED_IN',
              'WITHDRAWN'
            )
            AND current_round =
              ${projection.roundNo}
            AND payload_round_no =
              ${projection.roundNo.toString()}
            AND relay_status IN (
              'PREPARED',
              'SUBMITTED',
              'CONFIRMED'
            )
            AND derived_tx_hash =
              lower(
                ${projection.txHash}
              )
            AND (
              tx_hash IS NULL
              OR lower(tx_hash) =
                lower(
                  ${projection.txHash}
                )
            )
            AND signer_wallet ~
              '^0x[0-9a-f]{40}$'
            AND signature_hex ~
              '^0x[0-9a-fA-F]{130}$'
        ),
        relay_projection AS (
          UPDATE relay_intents ri
          SET
            status =
              'CONFIRMED',
            tx_hash =
              lower(
                ${projection.txHash}
              ),
            submitted_at =
              COALESCE(
                ri.submitted_at,
                GREATEST(
                  ${projection.blockTs},
                  ri.prepared_at
                )
              ),
            confirmed_at =
              COALESCE(
                ri.confirmed_at,
                GREATEST(
                  ${projection.blockTs},
                  COALESCE(
                    ri.submitted_at,
                    ri.prepared_at
                  ),
                  ri.prepared_at
                )
              ),
            last_error_code =
              NULL,
            last_error_message =
              NULL,
            updated_at =
              GREATEST(
                ${projection.blockTs},
                ri.updated_at,
                COALESCE(
                  ri.submitted_at,
                  ri.prepared_at
                ),
                ri.prepared_at
              )
          FROM eligible e
          WHERE
            ri.id =
              e.relay_intent_id
          RETURNING
            ri.id
        ),
        attestation_projection AS (
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
            e.current_round,
            'GUARANTOR_WITHDRAWN',
            e.signer_wallet,
            e.attestation_payload,
            decode(
              substring(
                e.signature_hex
                FROM 3
              ),
              'hex'
            ),
            lower(
              ${projection.txHash}
            ),
            ${projection.blockTs}
          FROM eligible e
          WHERE NOT EXISTS (
            SELECT 1
            FROM attestations existing
            WHERE
              existing.auction_id =
                e.auction_id
              AND existing.round_no =
                e.current_round
              AND existing.type =
                'GUARANTOR_WITHDRAWN'
          )
          RETURNING id
        ),
        existing_attestation AS (
          SELECT
            existing.id
          FROM attestations existing
          JOIN eligible e
            ON existing.auction_id =
              e.auction_id
            AND existing.round_no =
              e.current_round
            AND existing.type =
              'GUARANTOR_WITHDRAWN'
            AND lower(
              existing.submitted_tx_hash
            ) =
              lower(
                ${projection.txHash}
              )
        ),
        auction_projection AS (
          UPDATE auctions a
          SET
            status =
              'WITHDRAWN',
            updated_at =
              ${projection.blockTs}
          FROM eligible e
          WHERE
            a.id =
              e.auction_id
          RETURNING
            a.id
        ),
        processed_event AS (
          UPDATE chain_events ce
          SET
            processed =
              true,
            processing_error =
              NULL
          WHERE
            ce.id =
              ${input.eventId}
            AND EXISTS (
              SELECT 1
              FROM relay_projection
            )
            AND EXISTS (
              SELECT 1
              FROM auction_projection
            )
            AND (
              EXISTS (
                SELECT 1
                FROM attestation_projection
              )
              OR EXISTS (
                SELECT 1
                FROM existing_attestation
              )
            )
          RETURNING
            ce.id
        )
        SELECT
          EXISTS (
            SELECT 1
            FROM processed_event
          ) AS projected
      `,
    );

  const row =
    (
      'rows' in result &&
      Array.isArray(
        result.rows,
      )
        ? result.rows[0]
        : result[0]
    ) as
      GuarantorLifecycleProjectionResult
      | undefined;

  if (
    !row ||
    row.projected !== true
  ) {
    throw new Error(
      'WithdrawnItem projection failed its durable relay, round, or tx-hash boundary.',
    );
  }
}

type RelayProjectionResult =
  Readonly<{
    projected: boolean;
  }>;

async function projectReusedRound(
  db: Db,
  input: Readonly<{
    eventId: number;
    auctionId: string;
    eventName: string;
    args: unknown;
    txHash: string;
    blockTs: Date;
  }>,
): Promise<void> {
  const projection = parseRoundScheduledProjection({
    eventName: input.eventName,
    args: input.args,
    txHash: input.txHash,
    blockTs: input.blockTs,
  });

  if (projection.roundNo < 2) {
    throw new Error('Reused round projection must follow round one.');
  }

  const result = await db.execute(sql`
    WITH current_state AS (
      SELECT
        a.id AS auction_id,
        a.current_round,
        a.status AS auction_status,
        ri.id AS relay_intent_id,
        ri.status AS relay_status,
        ri.tx_hash,
        ri.payload,
        lower(ri.payload ->> 'derivedTxHash') AS derived_tx_hash
      FROM auctions a
      JOIN relay_intents ri
        ON ri.resource_id = a.id
        AND ri.resource_type = 'AUCTION'
        AND ri.operation = 'REUSE_ROUND'
      WHERE a.id = ${input.auctionId}
      FOR UPDATE OF a, ri
    ),
    eligible AS (
      SELECT *
      FROM current_state
      WHERE
        (
          (
            auction_status = 'PASSED_IN'
            AND current_round = ${projection.roundNo - 1}
          )
          OR (
            auction_status = 'SCHEDULED'
            AND current_round = ${projection.roundNo}
          )
        )
        AND relay_status IN ('PREPARED', 'SUBMITTED', 'CONFIRMED')
        AND derived_tx_hash = lower(${projection.txHash})
        AND (tx_hash IS NULL OR lower(tx_hash) = lower(${projection.txHash}))
        AND lower(payload -> 'reuseRound' ->> 'auctionKey') = lower(${projection.auctionKey})
        AND payload -> 'reuseRound' ->> 'expectedRoundNo' = ${projection.roundNo.toString()}
        AND payload -> 'reuseRound' ->> 'startingBid' = ${projection.startingBid.toString()}
        AND payload -> 'reuseRound' ->> 'bidIncrement' = ${projection.bidIncrement.toString()}
        AND payload -> 'reuseRound' ->> 'openAt' = ${projection.openAt.toString()}
        AND payload -> 'reuseRound' ->> 'durationHours' = ${projection.durationHours.toString()}
    ),
    round_insert AS (
      INSERT INTO auction_rounds (
        auction_id,
        round_no,
        starting_bid,
        bid_increment,
        open_at,
        close_at,
        duration_hours,
        scheduled_at
      )
      SELECT
        e.auction_id,
        ${projection.roundNo},
        ${projection.startingBid},
        ${projection.bidIncrement},
        to_timestamp(${projection.openAt.toString()}::double precision),
        to_timestamp(${projection.closeAt.toString()}::double precision),
        ${projection.durationHours},
        ${projection.blockTs}
      FROM eligible e
      WHERE e.auction_status = 'PASSED_IN'
      ON CONFLICT (auction_id, round_no) DO NOTHING
      RETURNING auction_id
    ),
    matching_round AS (
      SELECT ar.auction_id
      FROM auction_rounds ar
      JOIN eligible e
        ON e.auction_id = ar.auction_id
      WHERE
        ar.round_no = ${projection.roundNo}
        AND ar.starting_bid = ${projection.startingBid}
        AND ar.bid_increment = ${projection.bidIncrement}
        AND ar.open_at = to_timestamp(${projection.openAt.toString()}::double precision)
        AND ar.close_at = to_timestamp(${projection.closeAt.toString()}::double precision)
        AND ar.duration_hours = ${projection.durationHours}
    ),
    round_projection AS (
      SELECT auction_id FROM round_insert
      UNION
      SELECT auction_id FROM matching_round
    ),
    relay_projection AS (
      UPDATE relay_intents ri
      SET
        status = 'CONFIRMED',
        tx_hash = lower(${projection.txHash}),
        submitted_at =
              COALESCE(
                ri.submitted_at,
                GREATEST(
                  ${projection.blockTs},
                  ri.prepared_at
                )
              ),
            confirmed_at =
              COALESCE(
                ri.confirmed_at,
                GREATEST(
                  ${projection.blockTs},
                  COALESCE(
                    ri.submitted_at,
                    ri.prepared_at
                  ),
                  ri.prepared_at
                )
              ),
        last_error_code = NULL,
        last_error_message = NULL,
            updated_at =
              GREATEST(
                ${projection.blockTs},
                ri.updated_at,
                COALESCE(
                  ri.submitted_at,
                  ri.prepared_at
                ),
                ri.prepared_at
              )
      FROM eligible e
      WHERE ri.id = e.relay_intent_id
        AND EXISTS (SELECT 1 FROM round_projection)
      RETURNING ri.id
    ),
    auction_projection AS (
      UPDATE auctions a
      SET
        status = 'SCHEDULED',
        current_round = ${projection.roundNo},
        updated_at = ${projection.blockTs}
      FROM eligible e
      WHERE a.id = e.auction_id
        AND EXISTS (SELECT 1 FROM relay_projection)
        AND EXISTS (SELECT 1 FROM round_projection)
      RETURNING a.id, e.auction_status
    ),
    transition_log AS (
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
        ap.id,
        ${projection.roundNo},
        'PASSED_IN',
        'SCHEDULED',
        NULL,
        'RoundScheduled projection',
        lower(${projection.txHash}),
        ${projection.blockTs}
      FROM auction_projection ap
      WHERE ap.auction_status = 'PASSED_IN'
      RETURNING id
    ),
    processed_event AS (
      UPDATE chain_events ce
      SET
        processed = true,
        processing_error = NULL
      WHERE ce.id = ${input.eventId}
        AND EXISTS (SELECT 1 FROM relay_projection)
        AND EXISTS (SELECT 1 FROM auction_projection)
        AND EXISTS (SELECT 1 FROM round_projection)
      RETURNING ce.id
    )
    SELECT EXISTS (SELECT 1 FROM processed_event) AS projected
  `);

  const row = (
    'rows' in result && Array.isArray(result.rows)
      ? result.rows[0]
      : result[0]
  ) as RelayProjectionResult | undefined;

  if (!row || row.projected !== true) {
    throw new Error(
      'RoundScheduled projection failed its durable relay, round, or tx-hash boundary.',
    );
  }
}

async function projectSettled(
  db: Db,
  input: Readonly<{
    eventId: number;
    auctionId: string;
    eventName: string;
    args: unknown;
    txHash: string;
    blockTs: Date;
  }>,
): Promise<void> {
  const projection = parseSettledProjection({
    eventName: input.eventName,
    args: input.args,
    txHash: input.txHash,
    blockTs: input.blockTs,
  });

  const result = await db.execute(sql`
    WITH current_state AS (
      SELECT
        a.id AS auction_id,
        a.current_round,
        a.status AS auction_status,
        ri.id AS relay_intent_id,
        ri.status AS relay_status,
        ri.tx_hash,
        ri.payload,
        lower(ri.payload ->> 'derivedTxHash') AS derived_tx_hash
      FROM auctions a
      JOIN relay_intents ri
        ON ri.resource_id = a.id
        AND ri.resource_type = 'AUCTION'
        AND ri.operation = 'WITHDRAW_CONSIGNOR'
      WHERE a.id = ${input.auctionId}
      FOR UPDATE OF a, ri
    ),
    eligible AS (
      SELECT *
      FROM current_state
      WHERE
        auction_status IN ('CLAIM_PERIOD', 'SETTLED')
        AND current_round = ${projection.roundNo}
        AND relay_status IN ('PREPARED', 'SUBMITTED', 'CONFIRMED')
        AND derived_tx_hash = lower(${projection.txHash})
        AND (tx_hash IS NULL OR lower(tx_hash) = lower(${projection.txHash}))
        AND lower(payload -> 'withdrawConsignor' ->> 'auctionKey') = lower(${projection.auctionKey})
        AND payload -> 'withdrawConsignor' ->> 'roundNo' = ${projection.roundNo.toString()}
    ),
    relay_projection AS (
      UPDATE relay_intents ri
      SET
        status = 'CONFIRMED',
        tx_hash = lower(${projection.txHash}),
        submitted_at =
              COALESCE(
                ri.submitted_at,
                GREATEST(
                  ${projection.blockTs},
                  ri.prepared_at
                )
              ),
            confirmed_at =
              COALESCE(
                ri.confirmed_at,
                GREATEST(
                  ${projection.blockTs},
                  COALESCE(
                    ri.submitted_at,
                    ri.prepared_at
                  ),
                  ri.prepared_at
                )
              ),
        last_error_code = NULL,
        last_error_message = NULL,
            updated_at =
              GREATEST(
                ${projection.blockTs},
                ri.updated_at,
                COALESCE(
                  ri.submitted_at,
                  ri.prepared_at
                ),
                ri.prepared_at
              )
      FROM eligible e
      WHERE ri.id = e.relay_intent_id
      RETURNING ri.id
    ),
    auction_projection AS (
      UPDATE auctions a
      SET status = 'SETTLED', updated_at = ${projection.blockTs}
      FROM eligible e
      WHERE a.id = e.auction_id
        AND EXISTS (SELECT 1 FROM relay_projection)
      RETURNING a.id, e.auction_status
    ),
    transition_log AS (
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
        ap.id,
        ${projection.roundNo},
        'CLAIM_PERIOD',
        'SETTLED',
        NULL,
        'Settled projection',
        lower(${projection.txHash}),
        ${projection.blockTs}
      FROM auction_projection ap
      WHERE ap.auction_status = 'CLAIM_PERIOD'
      RETURNING id
    ),
    processed_event AS (
      UPDATE chain_events ce
      SET
        processed = true,
        processing_error = NULL
      WHERE ce.id = ${input.eventId}
        AND EXISTS (SELECT 1 FROM relay_projection)
        AND EXISTS (SELECT 1 FROM auction_projection)
      RETURNING ce.id
    )
    SELECT EXISTS (SELECT 1 FROM processed_event) AS projected
  `);

  const row = (
    'rows' in result && Array.isArray(result.rows)
      ? result.rows[0]
      : result[0]
  ) as RelayProjectionResult | undefined;

  if (!row || row.projected !== true) {
    throw new Error(
      'Settled projection failed its durable relay, round, or tx-hash boundary.',
    );
  }
}

async function projectRefundWithdrawal(
  db: Db,
  input: Readonly<{
    eventId: number;
    auctionId: string;
    eventName: string;
    args: unknown;
    txHash: string;
    logIndex: number;
    blockTs: Date;
    withdrawalFee: bigint;
  }>,
): Promise<void> {
  const projection =
    parseRefundWithdrawalProjection({
      eventName: input.eventName,
      args: input.args,
      txHash: input.txHash,
      blockTs: input.blockTs,
      withdrawalFee: input.withdrawalFee,
    });

  const result = await db.execute(sql`
    WITH current_state AS (
      SELECT
        a.id AS auction_id,
        a.current_round,
        bs.my_bid,
        bs.status AS stake_status,
        bs.refund_claimed_tx
      FROM auctions a
      JOIN bidder_stakes bs
        ON bs.auction_id = a.id
        AND bs.round_no = ${projection.roundNo}
        AND lower(bs.bidder_wallet) = lower(${projection.wallet})
      WHERE a.id = ${input.auctionId}
      FOR UPDATE OF a, bs
    ),
    relay_state AS MATERIALIZED (
      SELECT
        ri.id,
        ri.status,
        ri.tx_hash,
        ri.payload
      FROM relay_intents ri
      JOIN current_state s
        ON ri.resource_id = s.auction_id
      WHERE
        ri.resource_type = 'AUCTION'
        AND ri.operation = 'WITHDRAW_REFUND'
      FOR UPDATE OF ri
    ),
    existing_withdrawal AS (
      SELECT
        w.id,
        w.relayed
      FROM withdrawals w
      WHERE
        w.tx_hash = lower(${projection.txHash})
        AND w.source_log_index = ${input.logIndex}
        AND w.auction_id = ${input.auctionId}
        AND w.round_no = ${projection.roundNo}
        AND lower(w.wallet) = lower(${projection.wallet})
        AND w.kind = 'REFUND'
        AND w.gross_amount = ${projection.gross}
        AND w.withdraw_fee = ${projection.fee}
        AND w.net_amount = ${projection.net}
    ),
    relay_match AS (
      SELECT ri.id
      FROM relay_state ri
      JOIN current_state s ON true
      WHERE
        ri.status IN ('PREPARED', 'SUBMITTED', 'CONFIRMED')
        AND lower(ri.payload ->> 'derivedTxHash') =
          lower(${projection.txHash})
        AND (
          ri.tx_hash IS NULL
          OR lower(ri.tx_hash) =
            lower(${projection.txHash})
        )
        AND lower(ri.payload -> 'withdrawRefund' ->> 'auctionKey') =
          lower(${projection.auctionKey})
        AND ri.payload -> 'withdrawRefund' ->> 'roundNo' =
          ${projection.roundNo.toString()}
        AND lower(ri.payload -> 'withdrawRefund' ->> 'bidder') =
          lower(${projection.wallet})
        AND ri.payload -> 'withdrawRefund' ->> 'gross' =
          ${projection.gross.toString()}
        AND ri.payload -> 'withdrawRefund' ->> 'fee' =
          ${projection.fee.toString()}
        AND ri.payload -> 'withdrawRefund' ->> 'net' =
          ${projection.net.toString()}
        AND s.my_bid = ${projection.gross}
    ),
    eligible AS (
      SELECT s.*
      FROM current_state s
      WHERE
        s.current_round = ${projection.roundNo}
        AND s.my_bid = ${projection.gross}
        AND s.stake_status IN (
          'ACTIVE',
          'PROVISIONAL',
          'DEFAULTED',
          'REFUNDABLE',
          'REFUNDED'
        )
        AND (
          s.refund_claimed_tx IS NULL
          OR lower(s.refund_claimed_tx) =
            lower(${projection.txHash})
        )
        AND (
          NOT EXISTS (SELECT 1 FROM relay_state)
          OR EXISTS (SELECT 1 FROM relay_match)
          OR EXISTS (SELECT 1 FROM existing_withdrawal)
        )
    ),
    withdrawal_insert AS (
      INSERT INTO withdrawals (
        auction_id,
        round_no,
        wallet,
        kind,
        gross_amount,
        withdraw_fee,
        net_amount,
        relayed,
        tx_hash,
        source_log_index,
        created_at
      )
      SELECT
        e.auction_id,
        ${projection.roundNo},
        lower(${projection.wallet}),
        'REFUND',
        ${projection.gross},
        ${projection.fee},
        ${projection.net},
        EXISTS (SELECT 1 FROM relay_match),
        lower(${projection.txHash}),
        ${input.logIndex},
        ${projection.blockTs}
      FROM eligible e
      ON CONFLICT (tx_hash, source_log_index) DO NOTHING
      RETURNING id
    ),
    withdrawal_projection AS (
      SELECT id FROM withdrawal_insert
      UNION
      SELECT ew.id
      FROM existing_withdrawal ew
      WHERE EXISTS (SELECT 1 FROM eligible)
    ),
    relay_projection AS (
      UPDATE relay_intents ri
      SET
        status = 'CONFIRMED',
        tx_hash = lower(${projection.txHash}),
        submitted_at =
              COALESCE(
                ri.submitted_at,
                GREATEST(
                  ${projection.blockTs},
                  ri.prepared_at
                )
              ),
            confirmed_at =
              COALESCE(
                ri.confirmed_at,
                GREATEST(
                  ${projection.blockTs},
                  COALESCE(
                    ri.submitted_at,
                    ri.prepared_at
                  ),
                  ri.prepared_at
                )
              ),
        last_error_code = NULL,
        last_error_message = NULL,
            updated_at =
              GREATEST(
                ${projection.blockTs},
                ri.updated_at,
                COALESCE(
                  ri.submitted_at,
                  ri.prepared_at
                ),
                ri.prepared_at
              )
      FROM relay_match rm
      WHERE ri.id = rm.id
        AND EXISTS (SELECT 1 FROM withdrawal_projection)
      RETURNING ri.id
    ),
    stake_projection AS (
      UPDATE bidder_stakes bs
      SET
        status = 'REFUNDED',
        refund_claimed_tx = lower(${projection.txHash}),
        updated_at = ${projection.blockTs}
      FROM eligible e
      WHERE
        bs.auction_id = e.auction_id
        AND bs.round_no = ${projection.roundNo}
        AND lower(bs.bidder_wallet) = lower(${projection.wallet})
        AND EXISTS (SELECT 1 FROM withdrawal_projection)
      RETURNING bs.auction_id
    ),
    processed_event AS (
      UPDATE chain_events ce
      SET
        processed = true,
        processing_error = NULL
      WHERE
        ce.id = ${input.eventId}
        AND EXISTS (SELECT 1 FROM withdrawal_projection)
        AND EXISTS (SELECT 1 FROM stake_projection)
        AND (
          NOT EXISTS (SELECT 1 FROM relay_match)
          OR EXISTS (SELECT 1 FROM relay_projection)
        )
      RETURNING ce.id
    )
    SELECT EXISTS (
      SELECT 1 FROM processed_event
    ) AS projected
  `);

  const row = (
    'rows' in result && Array.isArray(result.rows)
      ? result.rows[0]
      : result[0]
  ) as RelayProjectionResult | undefined;

  if (!row || row.projected !== true) {
    throw new Error(
      'Refund Withdrawal projection failed its durable relay, stake, or tx-hash boundary.',
    );
  }
}

async function isConfirmedConsignorWithdrawal(
  db: Db,
  input: Readonly<{
    auctionId: string;
    auctionKey: string;
    roundNo: number;
    wallet: string;
    txHash: string;
  }>,
): Promise<boolean> {
  const result = await db.execute(sql`
    SELECT EXISTS (
      SELECT 1
      FROM relay_intents ri
      WHERE
        ri.resource_id = ${input.auctionId}
        AND ri.resource_type = 'AUCTION'
        AND ri.operation = 'WITHDRAW_CONSIGNOR'
        AND ri.status = 'CONFIRMED'
        AND lower(ri.tx_hash) = lower(${input.txHash})
        AND lower(ri.payload ->> 'derivedTxHash') =
          lower(${input.txHash})
        AND lower(ri.payload -> 'withdrawConsignor' ->> 'auctionKey') =
          lower(${input.auctionKey})
        AND ri.payload -> 'withdrawConsignor' ->> 'roundNo' =
          ${input.roundNo.toString()}
        AND lower(ri.payload -> 'withdrawConsignor' ->> 'consignor') =
          lower(${input.wallet})
    ) AS matched
  `);

  const row = (
    'rows' in result && Array.isArray(result.rows)
      ? result.rows[0]
      : result[0]
  ) as { matched?: unknown } | undefined;

  return row?.matched === true;
}

type TxCache = Map<string, number>;
async function getTxIndex(client: any, txHash: string, cache: TxCache): Promise<number> {
  if (cache.has(txHash)) return cache.get(txHash)!;
  const tx = await client.getTransaction({ hash: txHash as `0x${string}` });
  const i = tx.transactionIndex;
  cache.set(txHash, i);
  return i;
}

// 1 Subrequest: Window Function untuk rank
async function recomputeRanks(db: Db, auctionId: string, roundNo: number) {
  await db.execute(sql`
    UPDATE bidder_stakes AS bs
    SET rank = r.new_rank
    FROM (
      SELECT bidder_wallet, ROW_NUMBER() OVER (ORDER BY my_bid DESC, reached_seq ASC) as new_rank
      FROM bidder_stakes
      WHERE auction_id = ${auctionId} AND round_no = ${roundNo}
    ) AS r
    WHERE bs.auction_id = ${auctionId} AND bs.round_no = ${roundNo} AND bs.bidder_wallet = r.bidder_wallet
    AND bs.rank IS DISTINCT FROM (CASE WHEN r.new_rank <= 10 THEN r.new_rank::int ELSE NULL END);
  `);
}

async function processTransactionGroup(
  db:
    Db,
  client:
    any,
  group:
    CanonicalTransactionGroup,
): Promise<{
  processed:
    number;
  failed:
    number;
}> {
  const auctionMap =
    await buildAuctionMap(
      db,
    );

  const txCache:
    TxCache =
    new Map();

  /*
   * Preserve the existing event projection implementation inside one
   * transaction-local group. Event args remain runtime-validated by the
   * existing projection branches.
   */
  const pending =
    group.events as
      readonly any[];

  if (
    pending.length ===
      0
  ) {
    return {
      processed:
        0,
      failed:
        0,
    };
  }

  /*
   * FeeCredited does not contain auctionKey. This validates its attribution
   * from another auction-scoped event in the same blockchain transaction.
   * Persisting fee balances is handled by the deterministic projection step.
   */
  const attributedFeeCredits =
    attributeFeeCredits(
      group,
    );

  const feeCreditByLogIndex =
    new Map(
      attributedFeeCredits.map(
        (
          credit,
        ) => [
          credit.logIndex,
          credit,
        ] as const,
      ),
    );

  let ok =
    0;

  let failed =
    0;

  // Transaction-local projection accumulators.
  const processedIds: number[] = [];
  const newBids: any[] = [];
  const newStakes: any[] = [];
  const newPayouts: any[] = [];
  const newWithdrawals: any[] = [];
  const auctionStatusUpdates = new Map<string, string>(); // auctionId -> status
  const stakesToRecompute = new Set<string>(); // `${auctionId}:${roundNo}`

  for (const ev of pending) {
    try {
      const auctionId = ev.args.auctionKey ? auctionMap.get(ev.args.auctionKey) : null;
      
      // Jika butuh auctionId tapi tidak ketemu, skip (nanti di-retry)
      const isPlatformFeeWithdrawal =
        ev.eventName === 'Withdrawal' &&
        Number(ev.args.kind) ===
          ContractWithdrawalKind.FEE_BALANCE;
      const isGlobalConfigurationEvent =
        [
          'FeeConfigUpdated',
          'CurrencyConfigUpdated',
          'DefaultCurrencyUpdated',
          'TaxWalletUpdated',
          'AuctionTimingConfigUpdated',
          'AllowedIncrementUpdated',
          'BidConfigUpdated',
          'RankingConfigUpdated',
          'AgreementConfigUpdated',
          'DocumentConfigUpdated',
          'PartnerUpdated',
          'UserAdminUpdated',
          'RelayerUpdated',
          'OwnershipTransferred',
        ].includes(ev.eventName);
      const requiresAuction =
        ev.eventName !== 'FeeCredited' &&
        !isPlatformFeeWithdrawal &&
        !isGlobalConfigurationEvent;
      if (requiresAuction && !auctionId) {
        throw new Error(`auction not found for key ${ev.args.auctionKey}`);
      }

      switch (ev.eventName) {
        case 'FeeConfigUpdated': {
          if (getParalelDeployment().contractVersion === 'v3') {
            break;
          }

          const {
            platformBps,
            guarantorBps,
            notaryBps,
            taxBps,
            defaultFeeBps,
            withdrawalFee,
          } = ev.args;

          const bpsValues = [
            platformBps,
            guarantorBps,
            notaryBps,
            taxBps,
            defaultFeeBps,
          ].map(Number);
          if (
            bpsValues.some(
              (value) =>
                !Number.isInteger(value) ||
                value < 0 ||
                value > 10_000,
            ) ||
            typeof withdrawalFee === 'undefined'
          ) {
            throw new Error('FeeConfigUpdated event arguments are invalid.');
          }

          await db.insert(feeConfig).values({
            platformBps: bpsValues[0],
            guarantorBps: bpsValues[1],
            notaryBps: bpsValues[2],
            taxBps: bpsValues[3],
            defaultFeeBps: bpsValues[4],
            withdrawFee: BigInt(withdrawalFee),
            effectiveFrom: ev.blockTs,
            sourceTxHash: ev.txHash.toLowerCase(),
            sourceLogIndex: ev.logIndex,
          }).onConflictDoNothing({
            target: [feeConfig.sourceTxHash, feeConfig.sourceLogIndex],
          });
          break;
        }

        case 'AuctionRegistered':
          {
            const blockNumber = BigInt(ev.blockNumber);
            const [auctionState, snapshot] = await Promise.all([
              client.readContract({
                address: ev.contractAddress,
                abi: auctionAbi,
                functionName: 'getAuction',
                args: [ev.args.auctionKey],
                blockNumber,
              }),
              client.readContract({
                address: ev.contractAddress,
                abi: auctionAbi,
                functionName: 'getAuctionConfigSnapshot',
                args: [ev.args.auctionKey],
                blockNumber,
              }),
            ]);
            const [feeProjection] = await db.insert(feeConfig).values({
              platformBps: Number(auctionState.platformBps),
              guarantorBps: Number(auctionState.guarantorBps),
              notaryBps: Number(auctionState.notaryBps),
              taxBps: Number(auctionState.taxBps),
              defaultFeeBps: Number(snapshot.defaultFeeBps),
              withdrawFee: snapshot.withdrawalFee,
              effectiveFrom: ev.blockTs,
              sourceTxHash: ev.txHash.toLowerCase(),
              sourceLogIndex: ev.logIndex,
            }).onConflictDoUpdate({
              target: [feeConfig.sourceTxHash, feeConfig.sourceLogIndex],
              set: {
                platformBps: Number(auctionState.platformBps),
                guarantorBps: Number(auctionState.guarantorBps),
                notaryBps: Number(auctionState.notaryBps),
                taxBps: Number(auctionState.taxBps),
                defaultFeeBps: Number(snapshot.defaultFeeBps),
                withdrawFee: snapshot.withdrawalFee,
                effectiveFrom: ev.blockTs,
              },
            }).returning({ id: feeConfig.id });
            if (!feeProjection) {
              throw new Error('Auction fee snapshot projection failed.');
            }
          await projectAuctionRegistered(
            db,
            {
              eventId:
                ev.id,
              auctionId:
                auctionId!,
              feeConfigId:
                feeProjection.id,
              eventName:
                ev.eventName,
              args:
                ev.args,
              txHash:
                ev.txHash,
              blockTs:
                ev.blockTs,
            },
          );
          }

          /*
           * The atomic projector already marked this event processed.
           * It must not enter the generic processedIds batch.
           */
          ok++;
          continue;

        case 'RoundScheduled':
          if (Number(ev.args.roundNo) > 1) {
            await projectReusedRound(
              db,
              {
                eventId: ev.id,
                auctionId: auctionId!,
                eventName: ev.eventName,
                args: ev.args,
                txHash: ev.txHash,
                blockTs: ev.blockTs,
              },
            );
            ok++;
            continue;
          }

          await db.insert(auctionRounds).values({
            auctionId, roundNo: Number(ev.args.roundNo),
            startingBid: BigInt(ev.args.startingBid),
            bidIncrement: BigInt(ev.args.bidIncrement),
            openAt: new Date(Number(ev.args.openAt) * 1000),
            closeAt: new Date(Number(ev.args.closeAt) * 1000),
            durationHours: Math.round((Number(ev.args.closeAt) - Number(ev.args.openAt)) / 3600),
            scheduledAt: ev.blockTs,
          }).onConflictDoNothing();
          break;

        case 'BidPlaced': {
          const roundNo = Number(ev.args.roundNo);
          const bidder = ev.args.bidder.toLowerCase();
          const txIndex = await getTxIndex(client, ev.txHash, txCache);

          newBids.push({
            auctionId, roundNo,
            phase: ev.args.isPreBid ? 'PRE_BID' : 'LIVE_BID',
            bidderWallet: bidder,
            amountAdded: BigInt(ev.args.added),
            myBidAfter: BigInt(ev.args.myBidAfter),
            currentBidAfter: BigInt(ev.args.currentBidAfter),
            seq: BigInt(ev.args.seq),
            blockNumber: BigInt(ev.blockNumber),
            txIndex, logIndex: ev.logIndex, blockTs: ev.blockTs, txHash: ev.txHash,
          });

          newStakes.push({
            auctionId, roundNo, bidderWallet: bidder,
            myBid: BigInt(ev.args.myBidAfter),
            reachedSeq: BigInt(ev.args.seq),
            status: 'ACTIVE',
          });

          stakesToRecompute.add(`${auctionId}:${roundNo}`);
          break;
        }

        case 'AwardingStarted':
          auctionStatusUpdates.set(auctionId!, 'AWARDING');
          break;

        case 'AwardSigned':
          auctionStatusUpdates.set(auctionId!, 'COLLECTION');
          await db.update(bidderStakes).set({ status: 'WINNER' })
            .where(sql`${bidderStakes.auctionId} = ${auctionId} AND ${bidderStakes.roundNo} = ${ev.args.roundNo} AND ${bidderStakes.bidderWallet} = ${ev.args.winner.toLowerCase()}`);
          {
            const round = await client.readContract({
              address: ev.contractAddress,
              abi: auctionAbi,
              functionName: 'getRound',
              args: [ev.args.auctionKey, Number(ev.args.roundNo)],
              blockNumber: BigInt(ev.blockNumber),
            });
            if (round.collectionDeadline === 0n) {
              throw new Error('AwardSigned event has no collection deadline.');
            }
            await db.update(auctionRounds)
              .set({
                collectionDeadline: new Date(Number(round.collectionDeadline) * 1_000),
              })
              .where(and(
                eq(auctionRounds.auctionId, auctionId!),
                eq(auctionRounds.roundNo, Number(ev.args.roundNo)),
              ));
          }
          break;

        case 'Defaulted':
          await db.update(bidderStakes).set({ status: 'DEFAULTED' })
            .where(sql`${bidderStakes.auctionId} = ${auctionId} AND ${bidderStakes.roundNo} = ${ev.args.roundNo} AND ${bidderStakes.bidderWallet} = ${ev.args.candidate.toLowerCase()}`);
          break;

        case 'PassedIn':
          auctionStatusUpdates.set(auctionId!, 'PASSED_IN');
          break;

        case 'Collected':
          await projectCollected(
            db,
            {
              eventId:
                ev.id,
              auctionId:
                auctionId!,
              eventName:
                ev.eventName,
              args:
                ev.args,
              txHash:
                ev.txHash,
              blockTs:
                ev.blockTs,
            },
          );

          /*
           * Atomic projector already marked this event processed.
           */
          ok++;
          continue;

        case 'ClaimPeriodStarted':
          auctionStatusUpdates.set(
            auctionId!,
            'CLAIM_PERIOD',
          );
          {
            const round = await client.readContract({
              address: ev.contractAddress,
              abi: auctionAbi,
              functionName: 'getRound',
              args: [ev.args.auctionKey, Number(ev.args.roundNo)],
              blockNumber: BigInt(ev.blockNumber),
            });
            if (round.claimPeriodEnd === 0n) {
              throw new Error('ClaimPeriodStarted event has no claim period end.');
            }
            await db.update(auctionRounds)
              .set({
                claimPeriodEnd: new Date(Number(round.claimPeriodEnd) * 1_000),
              })
              .where(and(
                eq(auctionRounds.auctionId, auctionId!),
                eq(auctionRounds.roundNo, Number(ev.args.roundNo)),
              ));
          }
          break;

        case 'Settled':
          await projectSettled(
            db,
            {
              eventId: ev.id,
              auctionId: auctionId!,
              eventName: ev.eventName,
              args: ev.args,
              txHash: ev.txHash,
              blockTs: ev.blockTs,
            },
          );
          ok++;
          continue;

        case 'WithdrawnItem':
          await projectWithdrawn(
            db,
            {
              eventId:
                ev.id,
              auctionId:
                auctionId!,
              eventName:
                ev.eventName,
              args:
                ev.args,
              txHash:
                ev.txHash,
              blockTs:
                ev.blockTs,
            },
          );

          /*
           * Atomic projector already marked this event processed.
           */
          ok++;
          continue;

        case 'Withdrawal': {
          const withdrawalKind =
            Number(ev.args.kind);
          const kindMap = [
            'REFUND',
            'CONSIGNOR_PAYOUT',
            'FEE_BALANCE',
          ] as const;

          if (
            !Number.isInteger(withdrawalKind) ||
            withdrawalKind < 0 ||
            withdrawalKind >= kindMap.length ||
            typeof ev.args.wallet !== 'string' ||
            !isAddress(ev.args.wallet)
          ) {
            throw new Error(
              'Withdrawal event arguments are invalid.',
            );
          }

          if (withdrawalKind === 0) {
            const [feeRow] = await db
              .select({
                withdrawalFee: feeConfig.withdrawFee,
              })
              .from(auctions)
              .innerJoin(
                feeConfig,
                eq(auctions.feeConfigId, feeConfig.id),
              )
              .where(eq(auctions.id, auctionId!))
              .limit(1);
            if (!feeRow) {
              throw new Error(
                'Auction fee configuration snapshot is missing.',
              );
            }
            await projectRefundWithdrawal(
              db,
              {
                eventId: ev.id,
                auctionId: auctionId!,
                eventName: ev.eventName,
                args: ev.args,
                txHash: ev.txHash,
                logIndex: ev.logIndex,
                blockTs: ev.blockTs,
                withdrawalFee: feeRow.withdrawalFee,
              },
            );
            ok++;
            continue;
          }

          const platformFeeProjection =
            withdrawalKind ===
              ContractWithdrawalKind.FEE_BALANCE
              ? parsePlatformFeeWithdrawalProjection({
                  eventName: ev.eventName,
                  args: ev.args,
                  txHash: ev.txHash,
                  blockTs: ev.blockTs,
                })
              : null;
          const grossAmount =
            platformFeeProjection?.amount ??
            BigInt(ev.args.gross);
          const withdrawalFee =
            platformFeeProjection
              ? 0n
              : BigInt(ev.args.fee);
          const netAmount =
            platformFeeProjection?.amount ??
            BigInt(ev.args.net);

          if (
            grossAmount <= 0n ||
            withdrawalFee > grossAmount ||
            netAmount !==
              grossAmount - withdrawalFee
          ) {
            throw new Error(
              'Withdrawal amounts are inconsistent.',
            );
          }

          const relayed =
            withdrawalKind === 1 &&
            await isConfirmedConsignorWithdrawal(
              db,
              {
                auctionId: auctionId!,
                auctionKey: ev.args.auctionKey,
                roundNo: Number(ev.args.roundNo),
                wallet: ev.args.wallet,
                txHash: ev.txHash,
              },
            );

          if (
            withdrawalKind === 1 &&
            !relayed
          ) {
            throw new Error(
              'Consignor Withdrawal has no matching confirmed relay intent.',
            );
          }

          newWithdrawals.push({
            auctionId:
              platformFeeProjection
                ? null
                : auctionId,
            roundNo:
              platformFeeProjection
                ? null
                : Number(ev.args.roundNo),
            wallet: ev.args.wallet.toLowerCase(),
            kind: kindMap[withdrawalKind],
            grossAmount,
            withdrawFee: withdrawalFee,
            netAmount,
            relayed,
            txHash: ev.txHash,
            sourceLogIndex: ev.logIndex,
          });
          break;
        }

        case 'FeeCredited': {
          const credit =
            feeCreditByLogIndex.get(
              ev.logIndex,
            );

          if (!credit) {
            throw new Error(
              [
                'FeeCredited attribution is missing.',
                `txHash=${ev.txHash}`,
                `logIndex=${ev.logIndex}`,
              ].join(
                ' ',
              ),
            );
          }

          /*
           * Preserve the complete event evidence without inventing payout
           * kind or recipient role. A later deterministic resolver may
           * convert this row to RESOLVED when canonical wallet-role evidence
           * exists.
           */
          newPayouts.push({
            auctionId:
              null,
            roundNo:
              null,
            kind:
              null,
            recipientRole:
              null,
            recipientWallet:
              credit.recipient,
            amount:
              credit.amount,
            txHash:
              credit.txHash,
            sourceLogIndex:
              credit.logIndex,
            resolutionStatus:
              'UNRESOLVED',
            resolutionError:
              [
                'Recipient payout role is not deterministically resolvable',
                'from the current canonical database state.',
                `auctionKey=${credit.auctionKey}`,
                `roundNo=${credit.roundNo}`,
              ].join(
                ' ',
              ),
          });

          break;
        }

        case 'Closed':
          // Status CLOSED terjadi transisi waktu. Bisa diabaikan karena langsung ke AWARDING/PASSED_IN.
          break;
      }

      processedIds.push(ev.id);
      ok++;
    } catch (
      error: unknown
    ) {
      failed++;

      const message =
        error instanceof
          Error
          ? error.message
          : String(
              error,
            );

      throw new Error(
        [
          'Canonical transaction projection failed.',
          `txHash=${group.txHash}`,
          `event=${ev.eventName}`,
          `logIndex=${ev.logIndex}`,
          `cause=${message}`,
        ].join(
          ' ',
        ),
        {
          cause:
            error,
        },
      );
    }
  }

  // ─── EKSEKUSI BATCH (Hanya ~5 Subrequest) ─────────────────────
  if (processedIds.length > 0) {
    await db
      .update(
        chainEvents,
      )
      .set({
        processed:
          true,
        processingError:
          null,
      })
      .where(
        inArray(
          chainEvents.id,
          processedIds,
        ),
      );
  }

  if (newBids.length > 0) {
    await db.insert(bids).values(newBids).onConflictDoNothing();
  }

  if (newStakes.length > 0) {
    // Upsert batch untuk bidder_stakes
    await db.insert(bidderStakes).values(newStakes).onConflictDoUpdate({
      target: [bidderStakes.auctionId, bidderStakes.roundNo, bidderStakes.bidderWallet],
      set: { myBid: sql`EXCLUDED.my_bid`, reachedSeq: sql`EXCLUDED.reached_seq` }
    });
  }

  if (
    newPayouts.length >
      0
  ) {
    await db
      .insert(
        payouts,
      )
      .values(
        newPayouts,
      )
      .onConflictDoNothing({
        target: [
          payouts.txHash,
          payouts.sourceLogIndex,
        ],
      });
  }

  if (
    newWithdrawals.length >
      0
  ) {
    await db
      .insert(
        withdrawals,
      )
      .values(
        newWithdrawals,
      )
      .onConflictDoNothing({
        target: [
          withdrawals.txHash,
          withdrawals.sourceLogIndex,
        ],
      });
  }

  // Update status lelang
  for (const [aId, status] of auctionStatusUpdates.entries()) {
    await db.update(auctions).set({ status }).where(eq(auctions.id, aId));
  }

  // Recompute ranks (hanya untuk round yang ada bid baru)
  for (const key of stakesToRecompute) {
    const [aId, rNo] = key.split(':');
    await recomputeRanks(db, aId, Number(rNo));
  }

  return {
    processed:
      ok,
    failed,
  };
}

function toCanonicalChainEvent(
  row:
    typeof chainEvents
      .$inferSelect,
): CanonicalChainEvent {
  if (
    !/^0x[0-9a-f]{40}$/.test(
      row.contractAddress,
    ) ||
    !/^0x[0-9a-f]{64}$/.test(
      row.blockHash,
    ) ||
    !/^0x[0-9a-f]{64}$/.test(
      row.txHash,
    ) ||
    row.transactionIndex < 0 ||
    row.logIndex < 0 ||
    row.projectionVersion < 1
  ) {
    throw new Error(
      `Canonical chain event ${row.id} is invalid.`,
    );
  }

  return Object.freeze({
    id:
      row.id,
    chainId:
      row.chainId,
    contractAddress:
      row.contractAddress,
    blockNumber:
      row.blockNumber,
    blockHash:
      row.blockHash as
        `0x${string}`,
    blockTs:
      new Date(
        row.blockTs,
      ),
    transactionIndex:
      row.transactionIndex,
    txHash:
      row.txHash as
        `0x${string}`,
    logIndex:
      row.logIndex,
    eventName:
      row.eventName,
    args:
      row.args,
    canonical:
      row.canonical,
    projectionVersion:
      row.projectionVersion,
    processed:
      row.processed,
    processingError:
      row.processingError,
  });
}

function normalizeProcessingError(
  error:
    unknown,
): string {
  const message =
    error instanceof
      Error
      ? error.message
      : String(
          error,
        );

  return message.slice(
    0,
    4_000,
  );
}

async function recordTransactionFailure(
  db:
    IndexerDatabase,
  group:
    CanonicalTransactionGroup,
  error:
    unknown,
): Promise<void> {
  const ids =
    group.events.map(
      (
        event,
      ) =>
        event.id,
    );

  if (
    ids.length ===
      0
  ) {
    return;
  }

  await db
    .update(
      chainEvents,
    )
    .set({
      processed:
        false,
      processingError:
        normalizeProcessingError(
          error,
        ),
    })
    .where(
      inArray(
        chainEvents.id,
        ids,
      ),
    );
}

export async function processEvents(
  db:
    IndexerDatabase,
  client:
    any,
  limit =
    50,
): Promise<{
  processed:
    number;
  failed:
    number;
}> {
  if (
    !Number.isSafeInteger(
      limit,
    ) ||
    limit < 1
  ) {
    throw new Error(
      'Indexer processing limit is invalid.',
    );
  }

  /*
   * Read all currently pending rows before grouping. Applying a row LIMIT
   * before grouping could split one blockchain transaction across runs.
   * The limit below applies to complete transaction groups instead.
   */
  const pendingRows =
    await db
      .select()
      .from(
        chainEvents,
      )
      .where(
        and(
          eq(chainEvents.canonical, true),
          eq(chainEvents.processed, false),
        ),
      );

  if (
    pendingRows.length ===
      0
  ) {
    return {
      processed:
        0,
      failed:
        0,
    };
  }

  const groups =
    groupCanonicalTransactions(
      pendingRows.map(
        toCanonicalChainEvent,
      ),
    ).slice(
      0,
      limit,
    );

  let processed =
    0;

  let failed =
    0;

  for (
    const group
    of groups
  ) {
    try {
      const result =
        await db.transaction(
          async (
            transaction,
          ) => {
            const ids =
              group.events.map(
                (
                  event,
                ) =>
                  event.id,
              );

            const locked =
              await transaction
                .select()
                .from(
                  chainEvents,
                )
                .where(
                  inArray(
                    chainEvents.id,
                    ids,
                  ),
                )
                .for(
                  'update',
                );

            if (
              locked.length !==
                group.events.length ||
              locked.some(
                (
                  event,
                ) =>
                  event.processed ||
                  !event.canonical ||
                  event.txHash !==
                    group.txHash ||
                  event.blockHash !==
                    group.blockHash ||
                  event.transactionIndex !==
                    group.transactionIndex,
              )
            ) {
              throw new Error(
                `Canonical transaction ${group.txHash} changed before projection.`,
              );
            }

            return processTransactionGroup(
              transaction,
              client,
              group,
            );
          },
        );

      processed +=
        result.processed;
    } catch (
      error: unknown
    ) {
      failed +=
        group.events.length;

      await recordTransactionFailure(
        db,
        group,
        error,
      );
    }
  }

  return {
    processed,
    failed,
  };
}
