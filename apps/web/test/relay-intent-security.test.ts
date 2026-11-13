import assert from 'node:assert/strict';
import test from 'node:test';

import {
  decideRelayIntentReuse,
  type PreparedReuseRoundPayload,
  type RelayIntentRecord,
  validatePreparedRelayPayload,
} from '../src/lib/api/relay-intent';

const serializedTransaction =
  '0x02abcdef' as const;

const derivedTxHash =
  `0x${'11'.repeat(32)}` as const;

test(
  'accepts a canonical prepared relay payload',
  () => {
    const payload =
      validatePreparedRelayPayload({
        version: 1,
        operation:
          'REGISTER_AUCTION',
        auctionCode:
          'JKT-ELK-261109-0001',
        serializedTransaction,
        derivedTxHash,
        registerAuction: {
          auctionKey:
            `0x${'22'.repeat(32)}`,
        },
      });

    assert.equal(
      payload.operation,
      'REGISTER_AUCTION',
    );

    assert.equal(
      payload.derivedTxHash,
      derivedTxHash,
    );
  },
);

test(
  'rejects an invalid signed transaction or derived hash',
  () => {
    assert.throws(
      () =>
        validatePreparedRelayPayload({
          version: 1,
          operation:
            'REGISTER_AUCTION',
          auctionCode:
            'JKT-ELK-261109-0001',
          serializedTransaction:
            'not-hex',
          derivedTxHash,
          registerAuction: {},
        }),
      /payload projection/i,
    );

    assert.throws(
      () =>
        validatePreparedRelayPayload({
          version: 1,
          operation:
            'REGISTER_AUCTION',
          auctionCode:
            'JKT-ELK-261109-0001',
          serializedTransaction,
          derivedTxHash:
            '0x12',
          registerAuction: {},
        }),
      /payload projection/i,
    );
  },
);

test(
  'rejects an unsupported relay operation',
  () => {
    assert.throws(
      () =>
        validatePreparedRelayPayload({
          version: 1,
          operation:
            'UNSUPPORTED_OPERATION',
          auctionCode:
            'JKT-ELK-261109-0001',
          serializedTransaction,
          derivedTxHash,
          registerAuction: {},
        }),
      /unsupported operation/i,
    );
  },
);

test(
  'accepts canonical MARK_COLLECTED relay payload',
  () => {
    const payload =
      validatePreparedRelayPayload({
        version: 1,
        operation:
          'MARK_COLLECTED',
        auctionCode:
          'JKT-ELK-261109-0001',
        serializedTransaction,
        derivedTxHash,
        markCollected: {
          auctionKey:
            `0x${'22'.repeat(32)}`,
          nonce:
            '7',
          expiry:
            '1794269100',
        },
      });

    assert.equal(
      payload.operation,
      'MARK_COLLECTED',
    );

    if (
      payload.operation !==
      'MARK_COLLECTED'
    ) {
      assert.fail(
        'Unexpected relay operation.',
      );
    }

    assert.equal(
      typeof payload.markCollected,
      'object',
    );
  },
);

test(
  'accepts canonical MARK_WITHDRAWN relay payload',
  () => {
    const payload =
      validatePreparedRelayPayload({
        version: 1,
        operation:
          'MARK_WITHDRAWN',
        auctionCode:
          'JKT-ELK-261109-0001',
        serializedTransaction,
        derivedTxHash,
        markWithdrawn: {
          auctionKey:
            `0x${'22'.repeat(32)}`,
          nonce:
            '8',
          expiry:
            '1794269100',
        },
      });

    assert.equal(
      payload.operation,
      'MARK_WITHDRAWN',
    );
  },
);

test(
  'rejects operation-specific payload drift',
  () => {
    assert.throws(
      () =>
        validatePreparedRelayPayload({
          version: 1,
          operation:
            'MARK_COLLECTED',
          auctionCode:
            'JKT-ELK-261109-0001',
          serializedTransaction,
          derivedTxHash,
          markWithdrawn: {},
        }),
      /markCollected projection/i,
    );

    assert.throws(
      () =>
        validatePreparedRelayPayload({
          version: 1,
          operation:
            'MARK_WITHDRAWN',
          auctionCode:
            'JKT-ELK-261109-0001',
          serializedTransaction,
          derivedTxHash,
          markCollected: {},
        }),
      /markWithdrawn projection/i,
    );
  },
);

test(
  'accepts canonical SUBMIT_AWARD relay payload',
  () => {
    const payload =
      validatePreparedRelayPayload({
        version:
          1,
        operation:
          'SUBMIT_AWARD',
        auctionCode:
          'JKT-ELK-261110-0001',
        serializedTransaction:
          '0x02',
        derivedTxHash:
          `0x${'44'.repeat(32)}`,
        submitAward: {
          auctionKey:
            `0x${'11'.repeat(32)}`,
          roundNo:
            '2',
          rank:
            '0',
          candidate:
            '0x2222222222222222222222222222222222222222',
          nonce:
            '7',
          expiry:
            '1794272400',
          signature:
            `0x${'33'.repeat(65)}`,
        },
      });

    assert.equal(
      payload.operation,
      'SUBMIT_AWARD',
    );

    if (
      payload.operation !==
        'SUBMIT_AWARD'
    ) {
      throw new Error(
        'Expected SUBMIT_AWARD payload.',
      );
    }

    assert.deepEqual(
      payload.submitAward,
      {
        auctionKey:
          `0x${'11'.repeat(32)}`,
        roundNo:
          '2',
        rank:
          '0',
        candidate:
          '0x2222222222222222222222222222222222222222',
        nonce:
          '7',
        expiry:
          '1794272400',
        signature:
          `0x${'33'.repeat(65)}`,
      },
    );
  },
);

test(
  'rejects SUBMIT_AWARD operation-specific payload drift',
  () => {
    assert.throws(
      () =>
        validatePreparedRelayPayload({
          version:
            1,
          operation:
            'SUBMIT_AWARD',
          auctionCode:
            'JKT-ELK-261110-0001',
          serializedTransaction:
            '0x02',
          derivedTxHash:
            `0x${'44'.repeat(32)}`,
          markCollected: {
            auctionKey:
              `0x${'11'.repeat(32)}`,
          },
        }),
      /submitAward/i,
    );
  },
);

test(
  'accepts canonical WITHDRAW_REFUND relay payload',
  () => {
    const payload =
      validatePreparedRelayPayload({
        version:
          1,
        operation:
          'WITHDRAW_REFUND',
        auctionCode:
          'JKT-ELK-261110-0001',
        serializedTransaction:
          '0x02',
        derivedTxHash:
          `0x${'44'.repeat(32)}`,
        withdrawRefund: {
          auctionKey:
            `0x${'11'.repeat(32)}`,
          roundNo:
            '2',
          bidder:
            '0x2222222222222222222222222222222222222222',
          nonce:
            '7',
          expiry:
            '1794272400',
          signature:
            `0x${'33'.repeat(65)}`,
        },
      });

    assert.equal(
      payload.operation,
      'WITHDRAW_REFUND',
    );

    if (
      payload.operation !==
        'WITHDRAW_REFUND'
    ) {
      throw new Error(
        'Expected WITHDRAW_REFUND payload.',
      );
    }

    assert.equal(
      (
        payload.withdrawRefund as
          Record<string, unknown>
      ).bidder,
      '0x2222222222222222222222222222222222222222',
    );
  },
);

test(
  'rejects WITHDRAW_REFUND operation-specific payload drift',
  () => {
    assert.throws(
      () =>
        validatePreparedRelayPayload({
          version:
            1,
          operation:
            'WITHDRAW_REFUND',
          auctionCode:
            'JKT-ELK-261110-0001',
          serializedTransaction:
            '0x02',
          derivedTxHash:
            `0x${'44'.repeat(32)}`,
          submitAward: {
            auctionKey:
              `0x${'11'.repeat(32)}`,
          },
        }),
      /withdrawRefund/i,
    );
  },
);

test(
  'accepts canonical WITHDRAW_CONSIGNOR relay payload',
  () => {
    const payload =
      validatePreparedRelayPayload({
        version:
          1,
        operation:
          'WITHDRAW_CONSIGNOR',
        auctionCode:
          'JKT-ELK-261110-0001',
        serializedTransaction:
          '0x02',
        derivedTxHash:
          `0x${'44'.repeat(32)}`,
        withdrawConsignor: {
          auctionKey:
            `0x${'11'.repeat(32)}`,
          roundNo:
            '2',
          consignor:
            '0x2222222222222222222222222222222222222222',
          nonce:
            '7',
          expiry:
            '1794272400',
          signature:
            `0x${'33'.repeat(65)}`,
        },
      });

    assert.equal(
      payload.operation,
      'WITHDRAW_CONSIGNOR',
    );

    if (
      payload.operation !==
        'WITHDRAW_CONSIGNOR'
    ) {
      throw new Error(
        'Expected WITHDRAW_CONSIGNOR payload.',
      );
    }

    assert.equal(
      (
        payload.withdrawConsignor as
          Record<string, unknown>
      ).consignor,
      '0x2222222222222222222222222222222222222222',
    );
  },
);

test(
  'rejects WITHDRAW_CONSIGNOR operation-specific payload drift',
  () => {
    assert.throws(
      () =>
        validatePreparedRelayPayload({
          version:
            1,
          operation:
            'WITHDRAW_CONSIGNOR',
          auctionCode:
            'JKT-ELK-261110-0001',
          serializedTransaction:
            '0x02',
          derivedTxHash:
            `0x${'44'.repeat(32)}`,
          withdrawRefund: {
            auctionKey:
              `0x${'11'.repeat(32)}`,
          },
        }),
      /withdrawConsignor/i,
    );
  },
);

test(
  'accepts canonical REUSE_ROUND relay payload',
  () => {
    const payload =
      validatePreparedRelayPayload({
        version:
          1,
        operation:
          'REUSE_ROUND',
        auctionCode:
          'JKT-ELK-261110-0001',
        serializedTransaction:
          '0x02',
        derivedTxHash:
          `0x${'44'.repeat(32)}`,
        reuseRound: {
          auctionKey:
            `0x${'11'.repeat(32)}`,
          previousRoundNo:
            1,
          expectedRoundNo:
            2,
          startingBid:
            '2000000',
          bidIncrement:
            '50000',
        },
      });

    assert.equal(
      payload.operation,
      'REUSE_ROUND',
    );

    if (
      payload.operation !==
        'REUSE_ROUND'
    ) {
      throw new Error(
        'Expected REUSE_ROUND payload.',
      );
    }

    assert.equal(
      (
        payload.reuseRound as
          Record<string, unknown>
      ).expectedRoundNo,
      2,
    );
  },
);

test(
  'rejects REUSE_ROUND operation-specific payload drift',
  () => {
    assert.throws(
      () =>
        validatePreparedRelayPayload({
          version:
            1,
          operation:
            'REUSE_ROUND',
          auctionCode:
            'JKT-ELK-261110-0001',
          serializedTransaction:
            '0x02',
          derivedTxHash:
            `0x${'44'.repeat(32)}`,
          withdrawConsignor: {
            auctionKey:
              `0x${'11'.repeat(32)}`,
          },
        }),
      /reuseRound/i,
    );
  },
);

test(
  'allows a new per-auction relay only after the prior intent is confirmed',
  () => {
    const payload:
      PreparedReuseRoundPayload =
      Object.freeze({
        version: 1,
        operation: 'REUSE_ROUND',
        auctionCode:
          'JKT-ELK-261110-0001',
        serializedTransaction,
        derivedTxHash,
        reuseRound: {},
      });
    const input = {
      resourceId:
        '22222222-2222-4222-8222-222222222222',
      routeKey:
        'POST:/api/relay/reuse-round',
      idempotencyKey:
        'new-round-request-0002',
      requestHash:
        'b'.repeat(64),
      payload,
      preparedAt:
        new Date(
          '2026-11-10T00:00:00.000Z',
        ),
    };
    const existing:
      RelayIntentRecord =
      Object.freeze({
        id:
          '11111111-1111-4111-8111-111111111111',
        resourceId:
          input.resourceId,
        routeKey:
          input.routeKey,
        idempotencyKey:
          'new-round-request-0001',
        requestHash:
          'a'.repeat(64),
        payload,
        status:
          'CONFIRMED',
        txHash:
          derivedTxHash,
        attemptCount:
          1,
        preparedAt:
          new Date(
            '2026-11-09T00:00:00.000Z',
          ),
        submittedAt:
          new Date(
            '2026-11-09T00:00:01.000Z',
          ),
        confirmedAt:
          new Date(
            '2026-11-09T00:00:02.000Z',
          ),
        failedAt:
          null,
      });

    assert.equal(
      decideRelayIntentReuse(
        existing,
        input,
      ),
      'REPLACE_CONFIRMED',
    );
    assert.equal(
      decideRelayIntentReuse(
        Object.freeze({
          ...existing,
          status: 'SUBMITTED',
        }),
        input,
      ),
      'CONFLICT',
    );
    assert.equal(
      decideRelayIntentReuse(
        Object.freeze({
          ...existing,
          idempotencyKey:
            input.idempotencyKey,
          requestHash:
            input.requestHash,
        }),
        input,
      ),
      'REUSE',
    );
  },
);
