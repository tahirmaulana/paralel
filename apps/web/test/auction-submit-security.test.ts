import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assertEmptySubmitBody,
  derivePendingWindow,
  isSubmitManifestFrozen,
  normalizeSubmitAuctionCode,
} from '../src/lib/auction/submit-security';

const completeFiles = [
  {
    kind: 'PHOTO',
    position: 1,
  },
  {
    kind: 'PHOTO',
    position: 2,
  },
  {
    kind: 'PHOTO',
    position: 3,
  },
  {
    kind: 'PHOTO',
    position: 4,
  },
  {
    kind: 'PHOTO',
    position: 5,
  },
  {
    kind:
      'DOCUMENT_SCAN',
    position:
      null,
  },
] as const;

test(
  'normalizes a canonical auction code',
  () => {
    assert.equal(
      normalizeSubmitAuctionCode(
        '  JKT-ELK-261109-0001  ',
      ),
      'JKT-ELK-261109-0001',
    );

    for (
      const invalid
      of [
        '',
        'lower-case',
        'JKT_ELK',
        null,
      ]
    ) {
      assert.throws(
        () =>
          normalizeSubmitAuctionCode(
            invalid,
          ),
        /auction code/i,
      );
    }
  },
);

test(
  'accepts only an empty submit body',
  () => {
    assert.doesNotThrow(
      () =>
        assertEmptySubmitBody(
          {},
        ),
    );

    for (
      const invalid
      of [
        null,
        [],
        {
          wallet:
            '0x1111111111111111111111111111111111111111',
        },
      ]
    ) {
      assert.throws(
        () =>
          assertEmptySubmitBody(
            invalid,
          ),
        /empty object|unknown fields/i,
      );
    }
  },
);

test(
  'accepts only a complete current-round manifest',
  () => {
    assert.equal(
      isSubmitManifestFrozen({
        assetSpecHashes: [
          true,
        ],
        files:
          completeFiles,
        currentRound:
          1,
        roundNumbers: [
          1,
        ],
      }),
      true,
    );

    assert.equal(
      isSubmitManifestFrozen({
        assetSpecHashes: [
          false,
        ],
        files:
          completeFiles,
        currentRound:
          1,
        roundNumbers: [
          1,
        ],
      }),
      false,
    );

    assert.equal(
      isSubmitManifestFrozen({
        assetSpecHashes: [
          true,
        ],
        files:
          completeFiles,
        currentRound:
          2,
        roundNumbers: [
          1,
        ],
      }),
      false,
    );
  },
);

test(
  'rejects duplicate photo positions or missing document',
  () => {
    const duplicatePosition = [
      ...completeFiles.slice(
        0,
        4,
      ),
      {
        kind:
          'PHOTO',
        position:
          4,
      },
      completeFiles[5],
    ];

    assert.equal(
      isSubmitManifestFrozen({
        assetSpecHashes: [
          true,
        ],
        files:
          duplicatePosition,
        currentRound:
          1,
        roundNumbers: [
          1,
        ],
      }),
      false,
    );

    assert.equal(
      isSubmitManifestFrozen({
        assetSpecHashes: [
          true,
        ],
        files:
          completeFiles.slice(
            0,
            5,
          ),
        currentRound:
          1,
        roundNumbers: [
          1,
        ],
      }),
      false,
    );
  },
);

test(
  'derives the deterministic 48-hour pending window',
  () => {
    const {
      pendingAt,
      pendingDeadline,
    } =
      derivePendingWindow(
        new Date(
          '2026-11-09T12:00:00.000Z',
        ),
      );

    assert.equal(
      pendingAt.toISOString(),
      '2026-11-09T12:00:00.000Z',
    );

    assert.equal(
      pendingDeadline
        .toISOString(),
      '2026-11-11T12:00:00.000Z',
    );

    assert.throws(
      () =>
        derivePendingWindow(
          new Date('invalid'),
        ),
      /evaluation time/i,
    );
  },
);
