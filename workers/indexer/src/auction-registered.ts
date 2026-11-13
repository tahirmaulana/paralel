// @file workers/indexer/src/auction-registered.ts
//
// Pure validation for AuctionRegistered projection.
// No database, RPC, environment, or mutable state access.
import type {
  Hex,
} from 'viem';

export type AuctionRegisteredProjection =
  Readonly<{
    auctionKey: Hex;
    txHash: Hex;
    blockTs: Date;
  }>;

function requireHex32(
  value: unknown,
  field: string,
): Hex {
  if (
    typeof value !==
      'string' ||
    !/^0x[0-9a-fA-F]{64}$/.test(
      value,
    )
  ) {
    throw new Error(
      `Invalid ${field}.`,
    );
  }

  return value
    .toLowerCase() as Hex;
}

export function parseAuctionRegisteredProjection(
  input:
    Readonly<{
      eventName: string;
      args: unknown;
      txHash: unknown;
      blockTs: Date;
    }>,
): AuctionRegisteredProjection {
  if (
    input.eventName !==
      'AuctionRegistered'
  ) {
    throw new Error(
      'Event is not AuctionRegistered.',
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
      'AuctionRegistered arguments are invalid.',
    );
  }

  if (
    !Number.isFinite(
      input.blockTs.getTime(),
    )
  ) {
    throw new Error(
      'AuctionRegistered block timestamp is invalid.',
    );
  }

  const args =
    input.args as
      Record<string, unknown>;

  return Object.freeze({
    auctionKey:
      requireHex32(
        args.auctionKey,
        'AuctionRegistered auction key',
      ),

    txHash:
      requireHex32(
        input.txHash,
        'AuctionRegistered transaction hash',
      ),

    blockTs:
      new Date(
        input.blockTs,
      ),
  });
}

export function canProjectAuctionRegistered(
  input:
    Readonly<{
      auctionStatus: string;
      relayStatus: string;
      eventTxHash: Hex;
      relayTxHash:
        Hex | null;
      derivedTxHash:
        Hex;
    }>,
): boolean {
  if (
    input.auctionStatus !==
      'REGISTERING' &&
    input.auctionStatus !==
      'SCHEDULED'
  ) {
    return false;
  }

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

  if (
    input.derivedTxHash
      .toLowerCase() !==
    input.eventTxHash
      .toLowerCase()
  ) {
    return false;
  }

  if (
    input.relayTxHash !==
      null &&
    input.relayTxHash
      .toLowerCase() !==
    input.eventTxHash
      .toLowerCase()
  ) {
    return false;
  }

  return true;
}
