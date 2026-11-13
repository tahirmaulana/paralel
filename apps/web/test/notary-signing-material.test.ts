import assert from 'node:assert/strict';
import test from 'node:test';

import type {
  Address,
} from 'viem';

import {
  deriveNotarySigningMaterial,
  type NotaryApprovalSnapshot,
} from '../src/lib/notary/approval-snapshot';

const snapshot:
  NotaryApprovalSnapshot =
  Object.freeze({
    auctionId:
      '11111111-1111-4111-8111-111111111111',
    auctionCode:
      'JKT-ELK-261110-0001',
    status:
      'PENDING',
    currentRound:
      1,
    consignorWallet:
      '0x1111111111111111111111111111111111111111',
    createdAt:
      new Date(
        '2026-11-10T00:00:00.000Z',
      ),
    startingBid:
      100_000_000n,
    bidIncrement:
      5_000_000n,
    openAt:
      new Date(
        '2026-11-11T00:00:00.999Z',
      ),
    durationHours:
      24,
    manifestFrozen:
      true,
    guarantorApproved:
      true,
    notaryApproved:
      false,
    guarantorWallet:
      '0x2222222222222222222222222222222222222222',
    guarantorApprovedAt:
      new Date(
        '2026-11-10T00:10:00.000Z',
      ),
  });

const notaryWallet =
  '0x3333333333333333333333333333333333333333' as Address;

test(
  'derives deterministic Notary signing material',
  () => {
    const first =
      deriveNotarySigningMaterial({
        snapshot,
        notaryWallet,
        nonce:
          7n,
        expiry:
          1_794_272_400n,
      });

    const second =
      deriveNotarySigningMaterial({
        snapshot,
        notaryWallet,
        nonce:
          7n,
        expiry:
          1_794_272_400n,
      });

    assert.deepEqual(
      first,
      second,
    );

    assert.equal(
      first.nonce,
      7n,
    );

    assert.equal(
      first.expiry,
      1_794_272_400n,
    );

    assert.match(
      first.auctionKey,
      /^0x[0-9a-f]{64}$/i,
    );

    assert.match(
      first.paramsHash,
      /^0x[0-9a-f]{64}$/i,
    );

    assert.match(
      first.codeHash,
      /^0x[0-9a-f]{64}$/i,
    );
  },
);

test(
  'binds Notary signing material to nonce and expiry',
  () => {
    const first =
      deriveNotarySigningMaterial({
        snapshot,
        notaryWallet,
        nonce:
          7n,
        expiry:
          1_794_272_400n,
      });

    const changed =
      deriveNotarySigningMaterial({
        snapshot,
        notaryWallet,
        nonce:
          8n,
        expiry:
          1_794_272_401n,
      });

    assert.notEqual(
      first.codeHash,
      changed.codeHash,
    );
  },
);

test(
  'rejects negative Notary signing values',
  () => {
    assert.throws(
      () =>
        deriveNotarySigningMaterial({
          snapshot,
          notaryWallet,
          nonce:
            -1n,
          expiry:
            1n,
        }),
      /non-negative/i,
    );
  },
);
