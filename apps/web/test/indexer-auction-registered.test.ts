import assert from 'node:assert/strict';
import test from 'node:test';

import type {
  Hex,
} from 'viem';

import {
  canProjectAuctionRegistered,
  parseAuctionRegisteredProjection,
} from '../../../workers/indexer/src/auction-registered';

const txHash =
  `0x${'11'.repeat(32)}` as Hex;

const auctionKey =
  `0x${'22'.repeat(32)}` as Hex;

test(
  'parses canonical AuctionRegistered projection',
  () => {
    const projection =
      parseAuctionRegisteredProjection({
        eventName:
          'AuctionRegistered',
        args: {
          auctionKey,
        },
        txHash,
        blockTs:
          new Date(
            '2026-11-09T17:00:00.000Z',
          ),
      });

    assert.equal(
      projection.auctionKey,
      auctionKey,
    );

    assert.equal(
      projection.txHash,
      txHash,
    );
  },
);

test(
  'accepts REGISTERING with exact durable tx binding',
  () => {
    assert.equal(
      canProjectAuctionRegistered({
        auctionStatus:
          'REGISTERING',
        relayStatus:
          'SUBMITTED',
        eventTxHash:
          txHash,
        relayTxHash:
          txHash,
        derivedTxHash:
          txHash,
      }),
      true,
    );
  },
);

test(
  'recovers PREPARED when chain event proves broadcast',
  () => {
    assert.equal(
      canProjectAuctionRegistered({
        auctionStatus:
          'REGISTERING',
        relayStatus:
          'PREPARED',
        eventTxHash:
          txHash,
        relayTxHash:
          null,
        derivedTxHash:
          txHash,
      }),
      true,
    );
  },
);

test(
  'accepts idempotent confirmed projection',
  () => {
    assert.equal(
      canProjectAuctionRegistered({
        auctionStatus:
          'SCHEDULED',
        relayStatus:
          'CONFIRMED',
        eventTxHash:
          txHash,
        relayTxHash:
          txHash,
        derivedTxHash:
          txHash,
      }),
      true,
    );
  },
);

test(
  'rejects tx hash drift and invalid lifecycle state',
  () => {
    assert.equal(
      canProjectAuctionRegistered({
        auctionStatus:
          'REGISTERING',
        relayStatus:
          'SUBMITTED',
        eventTxHash:
          txHash,
        relayTxHash:
          `0x${'33'.repeat(32)}`,
        derivedTxHash:
          txHash,
      }),
      false,
    );

    assert.equal(
      canProjectAuctionRegistered({
        auctionStatus:
          'PENDING',
        relayStatus:
          'SUBMITTED',
        eventTxHash:
          txHash,
        relayTxHash:
          txHash,
        derivedTxHash:
          txHash,
      }),
      false,
    );
  },
);

test(
  'rejects malformed AuctionRegistered evidence',
  () => {
    assert.throws(
      () =>
        parseAuctionRegisteredProjection({
          eventName:
            'AuctionRegistered',
          args: {
            auctionKey:
              '0x12',
          },
          txHash,
          blockTs:
            new Date(),
        }),
      /auction key/i,
    );

    assert.throws(
      () =>
        parseAuctionRegisteredProjection({
          eventName:
            'BidPlaced',
          args: {
            auctionKey,
          },
          txHash,
          blockTs:
            new Date(),
        }),
      /not AuctionRegistered/i,
    );
  },
);
