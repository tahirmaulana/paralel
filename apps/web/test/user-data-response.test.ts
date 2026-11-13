import assert from 'node:assert/strict';
import test from 'node:test';

import {
  serializeUserData,
} from '../src/lib/user/data-response';

test(
  'serializes canonical user data',
  () => {
    const serialized =
      serializeUserData({
        kycStatus:
          'VERIFIED',
        adminComment:
          null,
        verifiedAt:
          new Date(
            '2026-11-09T12:00:00.000Z',
          ),
        liveAuctions: [],
        joinedAuctions: [],
        createdAuctions: [],
      });

    assert.deepEqual(
      serialized,
      {
        kycStatus:
          'VERIFIED',
        adminComment:
          null,
        verifiedAt:
          '2026-11-09T12:00:00.000Z',
        liveAuctions: [],
        joinedAuctions: [],
        createdAuctions: [],
      },
    );
  },
);

test(
  'serializes auction bigint values as decimal strings',
  () => {
    const serialized =
      serializeUserData({
        kycStatus:
          'NONE',
        adminComment:
          null,
        verifiedAt:
          null,
        liveAuctions: [
          {
            auctionCode:
              'JKT-ELK-261109-0001',
            currentBid:
              1_500_000n,
            myBid:
              1_000_000n,
          },
        ],
        joinedAuctions: [
          {
            myBid:
              500_000n,
          },
        ],
        createdAuctions: [
          {
            startingBid:
              1_000_000n,
          },
        ],
      });

    assert.doesNotThrow(
      () =>
        JSON.stringify(
          serialized,
        ),
    );

    const data =
      serialized as
        Record<string, unknown>;

    const liveAuctions =
      data.liveAuctions as
        Array<
          Record<
            string,
            unknown
          >
        >;

    const joinedAuctions =
      data.joinedAuctions as
        Array<
          Record<
            string,
            unknown
          >
        >;

    const createdAuctions =
      data.createdAuctions as
        Array<
          Record<
            string,
            unknown
          >
        >;

    assert.equal(
      liveAuctions[0]
        ?.currentBid,
      '1500000',
    );

    assert.equal(
      liveAuctions[0]
        ?.myBid,
      '1000000',
    );

    assert.equal(
      joinedAuctions[0]
        ?.myBid,
      '500000',
    );

    assert.equal(
      createdAuctions[0]
        ?.startingBid,
      '1000000',
    );
  },
);

test(
  'preserves null KYC and auction values',
  () => {
    const serialized =
      serializeUserData({
        kycStatus:
          'UNVERIFIED',
        adminComment:
          'Document requires review.',
        verifiedAt:
          null,
        liveAuctions: [
          {
            myBid:
              null,
            closeAt:
              null,
          },
        ],
        joinedAuctions: [],
        createdAuctions: [],
      });

    assert.doesNotThrow(
      () =>
        JSON.stringify(
          serialized,
        ),
    );
  },
);
