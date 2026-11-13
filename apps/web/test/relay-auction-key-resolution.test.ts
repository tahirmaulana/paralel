import assert from 'node:assert/strict';
import test from 'node:test';

import {
  computeAuctionKey,
} from '../src/lib/auction/auction-code';

import {
  resolveAuctionIdentityFromKey,
} from '../src/lib/relay/auction-key-resolution';

const first =
  Object.freeze({
    auctionId:
      '11111111-1111-4111-8111-111111111111',
    auctionCode:
      'JKT-ELK-261110-0001',
    currentRound:
      1,
  });

const second =
  Object.freeze({
    auctionId:
      '22222222-2222-4222-8222-222222222222',
    auctionCode:
      'JKT-OTO-261110-0002',
    currentRound:
      2,
  });

test(
  'resolves canonical auction key and current round',
  () => {
    assert.deepEqual(
      resolveAuctionIdentityFromKey(
        [
          first,
          second,
        ],
        {
          auctionKey:
            computeAuctionKey(
              second
                .auctionCode,
            ),
          roundNo:
            2,
        },
      ),
      {
        auctionId:
          second.auctionId,
        auctionCode:
          second.auctionCode,
        currentRound:
          2,
        auctionKey:
          computeAuctionKey(
            second
              .auctionCode,
          ),
      },
    );
  },
);

test(
  'rejects auction key with a different current round',
  () => {
    assert.throws(
      () =>
        resolveAuctionIdentityFromKey(
          [
            first,
          ],
          {
            auctionKey:
              computeAuctionKey(
                first
                  .auctionCode,
              ),
            roundNo:
              2,
          },
        ),
      /No current database auction/i,
    );
  },
);

test(
  'rejects non-unique auction key resolution',
  () => {
    assert.throws(
      () =>
        resolveAuctionIdentityFromKey(
          [
            first,
            {
              ...first,
              auctionId:
                '33333333-3333-4333-8333-333333333333',
            },
          ],
          {
            auctionKey:
              computeAuctionKey(
                first
                  .auctionCode,
              ),
            roundNo:
              1,
          },
        ),
      /not unique/i,
    );
  },
);
