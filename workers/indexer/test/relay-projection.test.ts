import assert from 'node:assert/strict';
import test from 'node:test';
import {
  parsePlatformFeeWithdrawalProjection,
  parseRefundWithdrawalProjection,
  parseRoundScheduledProjection,
  parseSettledProjection,
} from '../src/relay-projection';

const auctionKey = `0x${'11'.repeat(32)}`;
const txHash = `0x${'22'.repeat(32)}`;
const blockTs = new Date('2026-11-11T00:00:00.000Z');

test('parses canonical scheduled-round evidence', () => {
  const projection = parseRoundScheduledProjection({
    eventName: 'RoundScheduled',
    args: {
      auctionKey,
      roundNo: 2n,
      startingBid: 2_000_000n,
      bidIncrement: 50_000n,
      openAt: 1_794_441_600n,
      closeAt: 1_794_528_000n,
    },
    txHash,
    blockTs,
  });

  assert.equal(projection.roundNo, 2);
  assert.equal(projection.durationHours, 24);
  assert.equal(projection.startingBid, 2_000_000n);
});

test('rejects invalid scheduled-round parameters and evidence', () => {
  const valid = {
    eventName: 'RoundScheduled',
    args: {
      auctionKey,
      roundNo: 2n,
      startingBid: 2_000_000n,
      bidIncrement: 50_000n,
      openAt: 1_794_441_600n,
      closeAt: 1_794_528_000n,
    },
    txHash,
    blockTs,
    withdrawalFee: 2_500_000n,
  };

  assert.throws(
    () => parseRoundScheduledProjection({
      ...valid,
      args: { ...valid.args, bidIncrement: 0n },
    }),
    /parameters/i,
  );
  assert.throws(
    () => parseRoundScheduledProjection({
      ...valid,
      args: { ...valid.args, closeAt: 1_794_440_000n },
    }),
    /parameters/i,
  );
  assert.throws(
    () => parseRoundScheduledProjection({
      ...valid,
      txHash: '0x1234',
    }),
    /transaction hash/i,
  );
});

test('accepts round timing and increments beyond the former fixed policy', () => {
  const projection = parseRoundScheduledProjection({
    eventName: 'RoundScheduled',
    args: {
      auctionKey,
      roundNo: 2n,
      startingBid: 2_000_000n,
      bidIncrement: 51_000n,
      openAt: 1_794_441_600n,
      closeAt: 1_794_463_200n,
    },
    txHash,
    blockTs,
  });
  assert.equal(projection.bidIncrement, 51_000n);
  assert.equal(projection.durationHours, 6);
});

test('parses the settlement event identity and rejects other events', () => {
  const input = {
    eventName: 'Settled',
    args: { auctionKey, roundNo: 2n },
    txHash,
    blockTs,
  };

  assert.deepEqual(parseSettledProjection(input), {
    auctionKey,
    roundNo: 2,
    txHash,
    blockTs,
  });
  assert.throws(
    () => parseSettledProjection({ ...input, eventName: 'Withdrawal' }),
    /not Settled/i,
  );
});

test('parses a refund Withdrawal with canonical fee evidence', () => {
  const projection =
    parseRefundWithdrawalProjection({
      eventName: 'Withdrawal',
      args: {
        auctionKey,
        roundNo: 2n,
        wallet:
          '0x3333333333333333333333333333333333333333',
        kind: 0,
        gross: 5_000_000n,
        fee: 2_500_000n,
        net: 2_500_000n,
      },
      txHash,
      blockTs,
      withdrawalFee: 2_500_000n,
    });

  assert.equal(projection.roundNo, 2);
  assert.equal(projection.gross, 5_000_000n);
  assert.equal(projection.wallet, '0x3333333333333333333333333333333333333333');
});

test('rejects mismatched refund amount, fee, kind, and wallet', () => {
  const input = {
    eventName: 'Withdrawal',
    args: {
      auctionKey,
      roundNo: 2n,
      wallet:
        '0x3333333333333333333333333333333333333333',
      kind: 0,
      gross: 5_000_000n,
      fee: 2_500_000n,
      net: 2_500_000n,
    },
    txHash,
    blockTs,
    withdrawalFee: 2_500_000n,
  };

  assert.throws(
    () => parseRefundWithdrawalProjection({
      ...input,
      args: { ...input.args, fee: 2_000_000n },
    }),
    /parameters/i,
  );
  assert.throws(
    () => parseRefundWithdrawalProjection({
      ...input,
      args: { ...input.args, kind: 1 },
    }),
    /parameters/i,
  );
  assert.throws(
    () => parseRefundWithdrawalProjection({
      ...input,
      args: { ...input.args, wallet: 'not-an-address' },
    }),
    /parameters/i,
  );
});

test('parses platform-fee withdrawals without auction context', () => {
  const projection =
    parsePlatformFeeWithdrawalProjection({
      eventName: 'Withdrawal',
      args: {
        auctionKey:
          `0x${'00'.repeat(32)}`,
        roundNo: 0,
        wallet:
          '0x3333333333333333333333333333333333333333',
        kind: 2,
        gross: 2_500_000n,
        fee: 0n,
        net: 2_500_000n,
      },
      txHash,
      blockTs,
    });

  assert.equal(projection.amount, 2_500_000n);
  assert.throws(
    () => parsePlatformFeeWithdrawalProjection({
      eventName: 'Withdrawal',
      args: {
        auctionKey,
        roundNo: 1,
        wallet:
          '0x3333333333333333333333333333333333333333',
        kind: 2,
        gross: 2_500_000n,
        fee: 0n,
        net: 2_500_000n,
      },
      txHash,
      blockTs,
    }),
    /parameters/i,
  );
});
