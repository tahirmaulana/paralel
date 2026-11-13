// @file workers/indexer/src/event-ordering.ts
//
// Pure canonical ordering and transaction grouping for Phase 5.
import type {
  Hex,
} from 'viem';

export type CanonicalChainEvent =
  Readonly<{
    id:
      number;
    chainId:
      number;
    contractAddress:
      string;
    blockNumber:
      bigint;
    blockHash:
      Hex;
    blockTs:
      Date;
    transactionIndex:
      number;
    txHash:
      Hex;
    logIndex:
      number;
    eventName:
      string;
    args:
      unknown;
    canonical:
      boolean;
    projectionVersion:
      number;
    processed:
      boolean;
    processingError:
      string | null;
  }>;

export type CanonicalTransactionGroup =
  Readonly<{
    chainId:
      number;
    blockNumber:
      bigint;
    blockHash:
      Hex;
    transactionIndex:
      number;
    txHash:
      Hex;
    events:
      readonly CanonicalChainEvent[];
  }>;

export function compareCanonicalEvents(
  left:
    CanonicalChainEvent,
  right:
    CanonicalChainEvent,
): number {
  if (
    left.blockNumber !==
      right.blockNumber
  ) {
    return left.blockNumber <
      right.blockNumber
      ? -1
      : 1;
  }

  if (
    left.transactionIndex !==
      right.transactionIndex
  ) {
    return (
      left.transactionIndex -
      right.transactionIndex
    );
  }

  return (
    left.logIndex -
    right.logIndex
  );
}

export function groupCanonicalTransactions(
  events:
    readonly CanonicalChainEvent[],
): readonly CanonicalTransactionGroup[] {
  const ordered =
    [...events]
      .sort(
        compareCanonicalEvents,
      );

  const groups:
    CanonicalTransactionGroup[] =
    [];

  for (
    const event
    of ordered
  ) {
    if (
      !event.canonical
    ) {
      continue;
    }

    if (
      event.transactionIndex < 0 ||
      event.logIndex < 0
    ) {
      throw new Error(
        'Canonical event ordering projection is invalid.',
      );
    }

    const previous =
      groups[
        groups.length -
          1
      ];

    if (
      previous &&
      previous.chainId ===
        event.chainId &&
      previous.blockNumber ===
        event.blockNumber &&
      previous.blockHash ===
        event.blockHash &&
      previous.transactionIndex ===
        event.transactionIndex &&
      previous.txHash ===
        event.txHash
    ) {
      groups[
        groups.length -
          1
      ] =
        Object.freeze({
          ...previous,
          events:
            Object.freeze([
              ...previous.events,
              event,
            ]),
        });

      continue;
    }

    groups.push(
      Object.freeze({
        chainId:
          event.chainId,
        blockNumber:
          event.blockNumber,
        blockHash:
          event.blockHash,
        transactionIndex:
          event.transactionIndex,
        txHash:
          event.txHash,
        events:
          Object.freeze([
            event,
          ]),
      }),
    );
  }

  return Object.freeze(
    groups,
  );
}
