import assert from 'node:assert/strict';
import test from 'node:test';

import {
  GUARANTOR_COMPATIBILITY_CATEGORY,
} from '@paralel/contracts';

import type {
  Hex,
} from 'viem';

import {
  buildRegisterAuctionInput,
  dateToUnixSeconds,
  parseNotarySigningPayload,
} from '../src/lib/auction/confirm-registration';

const consignorSignature =
  `0x${'11'.repeat(65)}` as Hex;

function facts() {
  return {
    auctionKey:
      `0x${'22'.repeat(32)}` as Hex,
    consignorWallet:
      '0x1111111111111111111111111111111111111111',
    guarantorWallet:
      '0x2222222222222222222222222222222222222222',
    notaryWallet:
      '0x3333333333333333333333333333333333333333',
    specHash:
      Buffer.alloc(
        32,
        0x44,
      ),
    startingBid:
      1_000_000n,
    bidIncrement:
      50_000n,
    openAt:
      new Date(
        '2026-11-10T00:00:00.000Z',
      ),
    durationHours:
      24,
    platformBps:
      250,
    guarantorBps:
      150,
    notaryBps:
      100,
    taxBps:
      1_000,
    confirmationCodeHash:
      Buffer.alloc(
        32,
        0x55,
      ),
    notarySignature:
      Buffer.alloc(
        65,
        0x66,
      ),
    notaryPayload: {
      nonce:
        '7',
      expiry:
        '1794269100',
    },
    consignorSignature,
    consignorNonce:
      8n,
    consignorExpiry:
      1_794_269_100n,
  } as const;
}

test(
  'builds canonical registerAuction input',
  () => {
    const input =
      buildRegisterAuctionInput(
        facts(),
      );

    assert.equal(
      input.category,
      GUARANTOR_COMPATIBILITY_CATEGORY,
    );

    assert.equal(
      input.notaryNonce,
      7n,
    );

    assert.equal(
      input.consignorNonce,
      8n,
    );

    assert.equal(
      input.specHash.length,
      66,
    );

    assert.equal(
      input.notarySig.length,
      132,
    );
  },
);

test(
  'parses strict Notary signing material',
  () => {
    assert.deepEqual(
      parseNotarySigningPayload({
        nonce:
          '0',
        expiry:
          '300',
      }),
      {
        nonce:
          0n,
        expiry:
          300n,
      },
    );

    assert.throws(
      () =>
        parseNotarySigningPayload({
          nonce:
            '01',
          expiry:
            '300',
        }),
      /Notary nonce/i,
    );
  },
);

test(
  'rejects malformed byte projections',
  () => {
    assert.throws(
      () =>
        buildRegisterAuctionInput({
          ...facts(),
          specHash:
            Buffer.alloc(31),
        }),
      /spec hash byte length/i,
    );

    assert.throws(
      () =>
        buildRegisterAuctionInput({
          ...facts(),
          notarySignature:
            Buffer.alloc(64),
        }),
      /Notary signature byte length/i,
    );
  },
);

test(
  'converts dates using Solidity-compatible floor seconds',
  () => {
    assert.equal(
      dateToUnixSeconds(
        new Date(
          '2026-11-10T00:00:00.999Z',
        ),
      ),
      1_794_268_800n,
    );

    assert.throws(
      () =>
        dateToUnixSeconds(
          new Date('invalid'),
        ),
      /opening time/i,
    );
  },
);

test(
  'serializes registerAuction bigint values for durable JSONB storage',
  async () => {
    const {
      serializeRegisterAuctionInput,
    } =
      await import(
        '../src/lib/auction/confirm-registration'
      );

    const serialized =
      serializeRegisterAuctionInput(
        buildRegisterAuctionInput(
          facts(),
        ),
      );

    assert.equal(
      serialized.startingBid,
      '1000000',
    );

    assert.equal(
      serialized.bidIncrement,
      '50000',
    );

    assert.equal(
      serialized.notaryNonce,
      '7',
    );

    assert.equal(
      serialized.consignorNonce,
      '8',
    );

    assert.doesNotThrow(
      () =>
        JSON.stringify(
          serialized,
        ),
    );

    assert.equal(
      JSON.stringify(
        serialized,
      ).includes(
        'bigint',
      ),
      false,
    );
  },
);
