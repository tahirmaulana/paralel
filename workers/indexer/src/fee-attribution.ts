// @file workers/indexer/src/fee-attribution.ts
//
// FeeCredited does not contain auctionKey or roundNo.
// Attribution comes only from another auction-scoped event in the same
// canonical transaction.
import type {
  Hex,
} from 'viem';

import type {
  CanonicalTransactionGroup,
} from './event-ordering';

type ObjectRecord =
  Record<
    string,
    unknown
  >;

export type AttributedFeeCredit =
  Readonly<{
    auctionKey:
      Hex;
    roundNo:
      number;
    recipient:
      string;
    amount:
      bigint;
    txHash:
      Hex;
    logIndex:
      number;
  }>;

function toRecord(
  value: unknown,
): ObjectRecord {
  if (
    typeof value !==
      'object' ||
    value === null ||
    Array.isArray(value)
  ) {
    throw new Error(
      'Chain event arguments must be an object.',
    );
  }

  return value as
    ObjectRecord;
}

function parseAuctionKey(
  value: unknown,
): Hex {
  if (
    typeof value !==
      'string' ||
    !/^0x[0-9a-f]{64}$/i.test(
      value,
    )
  ) {
    throw new Error(
      'Transaction auctionKey context is invalid.',
    );
  }

  return value
    .toLowerCase() as Hex;
}

function parseRoundNo(
  value: unknown,
): number {
  const parsed =
    typeof value ===
      'number'
      ? value
      : (
          typeof value ===
            'string'
            ? Number(
                value,
              )
            : Number.NaN
        );

  if (
    !Number.isSafeInteger(
      parsed,
    ) ||
    parsed < 1 ||
    parsed > 65_535
  ) {
    throw new Error(
      'Transaction round number context is invalid.',
    );
  }

  return parsed;
}

function parseRecipient(
  value: unknown,
): string {
  if (
    typeof value !==
      'string' ||
    !/^0x[0-9a-f]{40}$/i.test(
      value,
    )
  ) {
    throw new Error(
      'FeeCredited recipient is invalid.',
    );
  }

  return value
    .toLowerCase();
}

function parseAmount(
  value: unknown,
): bigint {
  if (
    typeof value !==
      'string' ||
    !/^(0|[1-9][0-9]*)$/.test(
      value,
    )
  ) {
    throw new Error(
      'FeeCredited amount is invalid.',
    );
  }

  return BigInt(
    value,
  );
}

export function attributeFeeCredits(
  group:
    CanonicalTransactionGroup,
): readonly AttributedFeeCredit[] {
  const feeEvents =
    group.events.filter(
      (event) =>
        event.eventName ===
          'FeeCredited',
    );

  if (
    feeEvents.length ===
      0
  ) {
    return Object.freeze(
      [],
    );
  }

  const scopedEvents =
    group.events.filter(
      (event) => {
        const args =
          toRecord(
            event.args,
          );

        return (
          args.auctionKey !==
            undefined &&
          args.roundNo !==
            undefined
        );
      },
    );

  if (
    scopedEvents.length ===
      0
  ) {
    throw new Error(
      'FeeCredited transaction lacks auction attribution context.',
    );
  }

  const firstArgs =
    toRecord(
      scopedEvents[0]
        ?.args,
    );

  const auctionKey =
    parseAuctionKey(
      firstArgs.auctionKey,
    );

  const roundNo =
    parseRoundNo(
      firstArgs.roundNo,
    );

  for (
    const event
    of scopedEvents
  ) {
    const args =
      toRecord(
        event.args,
      );

    if (
      parseAuctionKey(
        args.auctionKey,
      ) !== auctionKey ||
      parseRoundNo(
        args.roundNo,
      ) !== roundNo
    ) {
      throw new Error(
        'Transaction contains conflicting auction attribution context.',
      );
    }
  }

  return Object.freeze(
    feeEvents.map(
      (
        event,
      ) => {
        const args =
          toRecord(
            event.args,
          );

        return Object.freeze({
          auctionKey,
          roundNo,
          recipient:
            parseRecipient(
              args.recipient,
            ),
          amount:
            parseAmount(
              args.amount,
            ),
          txHash:
            group.txHash,
          logIndex:
            event.logIndex,
        });
      },
    ),
  );
}
