// @file workers/indexer/src/checkpoint.ts
//
// Pure finalized-checkpoint and reorg validation.
import type {
  Hex,
} from 'viem';

export type IndexerCheckpointEvidence =
  Readonly<{
    chainId:
      number;
    blockNumber:
      bigint;
    blockHash:
      Hex;
  }>;

export function assertCheckpointCanonical(
  checkpoint:
    IndexerCheckpointEvidence,
  block:
    IndexerCheckpointEvidence,
): void {
  if (
    checkpoint.chainId !==
      block.chainId ||
    checkpoint.blockNumber !==
      block.blockNumber
  ) {
    throw new Error(
      'Checkpoint evidence does not address the same finalized block.',
    );
  }

  if (
    checkpoint.blockHash
      .toLowerCase() !==
    block.blockHash
      .toLowerCase()
  ) {
    throw new Error(
      'INDEXER_REORG_DETECTED: finalized checkpoint block hash changed.',
    );
  }
}

export function assertCheckpointAdvance(
  previous:
    IndexerCheckpointEvidence | null,
  next:
    IndexerCheckpointEvidence,
): void {
  if (
    !Number.isSafeInteger(
      next.chainId,
    ) ||
    next.chainId <= 0 ||
    next.blockNumber < 0n ||
    !/^0x[0-9a-f]{64}$/.test(
      next.blockHash,
    )
  ) {
    throw new Error(
      'Indexer checkpoint projection is invalid.',
    );
  }

  if (
    previous === null
  ) {
    return;
  }

  if (
    previous.chainId !==
      next.chainId ||
    next.blockNumber <
      previous.blockNumber
  ) {
    throw new Error(
      'Indexer checkpoint cannot move backward or across chains.',
    );
  }

  if (
    next.blockNumber ===
      previous.blockNumber &&
    next.blockHash
      .toLowerCase() !==
    previous.blockHash
      .toLowerCase()
  ) {
    throw new Error(
      'INDEXER_REORG_DETECTED: checkpoint hash drift.',
    );
  }
}
