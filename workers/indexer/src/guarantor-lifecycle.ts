// @file workers/indexer/src/guarantor-lifecycle.ts
//
// Pure validation for Guarantor lifecycle event projection.
// No database, RPC, environment, or network access.
import {
  isHex,
  type Hex,
} from 'viem';

export type GuarantorLifecycleOperation =
  | 'MARK_COLLECTED'
  | 'MARK_WITHDRAWN';

export type GuarantorLifecycleEvent =
  | 'Collected'
  | 'WithdrawnItem';

export type GuarantorLifecycleProjection =
  Readonly<{
    operation:
      GuarantorLifecycleOperation;
    eventName:
      GuarantorLifecycleEvent;
    roundNo: number;
    txHash: Hex;
    blockTs: Date;
    attestationType:
      | 'GUARANTOR_COLLECTED'
      | 'GUARANTOR_WITHDRAWN';
    targetStatus:
      | 'CLAIM_PERIOD'
      | 'WITHDRAWN';
  }>;

function parseRoundNo(
  value: unknown,
): number {
  const normalized =
    typeof value === 'bigint'
      ? Number(value)
      : typeof value === 'number'
        ? value
        : NaN;

  if (
    !Number.isInteger(
      normalized,
    ) ||
    normalized < 1 ||
    normalized > 65_535
  ) {
    throw new Error(
      'Guarantor lifecycle roundNo projection is invalid.',
    );
  }

  return normalized;
}

function parseTxHash(
  value: unknown,
): Hex {
  if (
    typeof value !== 'string' ||
    !isHex(value) ||
    value.length !== 66
  ) {
    throw new Error(
      'Guarantor lifecycle txHash projection is invalid.',
    );
  }

  return value
    .toLowerCase() as Hex;
}

export function parseGuarantorLifecycleProjection(
  input:
    Readonly<{
      eventName: string;
      args: unknown;
      txHash: unknown;
      blockTs: Date;
    }>,
): GuarantorLifecycleProjection {
  if (
    input.eventName !==
      'Collected' &&
    input.eventName !==
      'WithdrawnItem'
  ) {
    throw new Error(
      'Unsupported Guarantor lifecycle event.',
    );
  }

  if (
    typeof input.args !==
      'object' ||
    input.args === null ||
    Array.isArray(
      input.args,
    )
  ) {
    throw new Error(
      'Guarantor lifecycle args projection is invalid.',
    );
  }

  if (
    !Number.isFinite(
      input.blockTs.getTime(),
    )
  ) {
    throw new Error(
      'Guarantor lifecycle block timestamp is invalid.',
    );
  }

  const args =
    input.args as
      Record<string, unknown>;

  /*
   * auctionKey is already resolved by the indexer before this parser.
   * Validate its canonical bytes32 representation to reject malformed
   * chain-event evidence.
   */
  if (
    typeof args.auctionKey !==
      'string' ||
    !isHex(
      args.auctionKey,
    ) ||
    args.auctionKey.length !==
      66
  ) {
    throw new Error(
      'Guarantor lifecycle auctionKey projection is invalid.',
    );
  }

  const roundNo =
    parseRoundNo(
      args.roundNo,
    );

  const txHash =
    parseTxHash(
      input.txHash,
    );

  if (
    input.eventName ===
      'Collected'
  ) {
    return Object.freeze({
      operation:
        'MARK_COLLECTED',
      eventName:
        'Collected',
      roundNo,
      txHash,
      blockTs:
        new Date(
          input.blockTs,
        ),
      attestationType:
        'GUARANTOR_COLLECTED',
      targetStatus:
        'CLAIM_PERIOD',
    });
  }

  return Object.freeze({
    operation:
      'MARK_WITHDRAWN',
    eventName:
      'WithdrawnItem',
    roundNo,
    txHash,
    blockTs:
      new Date(
        input.blockTs,
      ),
    attestationType:
      'GUARANTOR_WITHDRAWN',
    targetStatus:
      'WITHDRAWN',
  });
}

export function hasExactLifecycleRelayBinding(
  input:
    Readonly<{
      expectedOperation:
        GuarantorLifecycleOperation;
      relayStatus:
        'PREPARED' |
        'SUBMITTED' |
        'CONFIRMED' |
        'FAILED';
      durableDerivedTxHash:
        string;
      durableTxHash:
        string | null;
      eventTxHash:
        string;
    }>,
): boolean {
  if (
    input.relayStatus !==
      'PREPARED' &&
    input.relayStatus !==
      'SUBMITTED' &&
    input.relayStatus !==
      'CONFIRMED'
  ) {
    return false;
  }

  const eventTxHash =
    input.eventTxHash
      .toLowerCase();

  if (
    input.durableDerivedTxHash
      .toLowerCase() !==
    eventTxHash
  ) {
    return false;
  }

  return (
    input.durableTxHash ===
      null ||
    input.durableTxHash
      .toLowerCase() ===
      eventTxHash
  );
}
