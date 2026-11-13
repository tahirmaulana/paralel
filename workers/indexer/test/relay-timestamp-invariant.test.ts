import assert from 'node:assert/strict';
import {
  readFileSync,
} from 'node:fs';
import test from 'node:test';
import {
  resolve,
} from 'node:path';

const processSource =
  readFileSync(
    resolve(
      process.cwd(),
      'workers/indexer/src/process.ts',
    ),
    'utf8',
  );

const projectionBoundaries =
  [
    [
      'projectAuctionRegistered',
      'projectCollected',
    ],
    [
      'projectCollected',
      'projectWithdrawn',
    ],
    [
      'projectWithdrawn',
      'projectReusedRound',
    ],
    [
      'projectReusedRound',
      'projectSettled',
    ],
    [
      'projectSettled',
      'projectRefundWithdrawal',
    ],
    [
      'projectRefundWithdrawal',
      'isConfirmedConsignorWithdrawal',
    ],
  ] as const;

function readProjection(
  current:
    string,
  following:
    string,
): string {
  const startMarker =
    `async function ${current}(`;
  const endMarker =
    `async function ${following}(`;

  const start =
    processSource.indexOf(
      startMarker,
    );
  const end =
    processSource.indexOf(
      endMarker,
      start,
    );

  assert.notEqual(
    start,
    -1,
    `${current} start boundary is missing`,
  );
  assert.notEqual(
    end,
    -1,
    `${current} end boundary is missing`,
  );

  return processSource.slice(
    start,
    end,
  );
}

function normalizeRelayTimestamps(
  input:
    Readonly<{
      blockTs:
        Date;
      preparedAt:
        Date;
      submittedAt:
        Date | null;
      confirmedAt:
        Date | null;
      updatedAt:
        Date;
    }>,
): Readonly<{
  submittedAt:
    Date;
  confirmedAt:
    Date;
  updatedAt:
    Date;
}> {
  const submittedAt =
    input.submittedAt ??
    new Date(
      Math.max(
        input.blockTs.getTime(),
        input.preparedAt.getTime(),
      ),
    );

  const confirmedAt =
    input.confirmedAt ??
    new Date(
      Math.max(
        input.blockTs.getTime(),
        submittedAt.getTime(),
        input.preparedAt.getTime(),
      ),
    );

  const updatedAt =
    new Date(
      Math.max(
        input.blockTs.getTime(),
        input.updatedAt.getTime(),
        submittedAt.getTime(),
        input.preparedAt.getTime(),
      ),
    );

  return Object.freeze({
    submittedAt,
    confirmedAt,
    updatedAt,
  });
}

test(
  'normalizes the production timestamp precision inversion',
  () => {
    const result =
      normalizeRelayTimestamps({
        blockTs:
          new Date(
            '2026-11-12T09:59:30.000Z',
          ),
        preparedAt:
          new Date(
            '2026-11-12T09:59:25.284Z',
          ),
        submittedAt:
          new Date(
            '2026-11-12T09:59:30.853Z',
          ),
        confirmedAt:
          null,
        updatedAt:
          new Date(
            '2026-11-12T09:59:30.853Z',
          ),
      });

    assert.equal(
      result.submittedAt.toISOString(),
      '2026-11-12T09:59:30.853Z',
    );
    assert.equal(
      result.confirmedAt.toISOString(),
      '2026-11-12T09:59:30.853Z',
    );
    assert.ok(
      result.confirmedAt.getTime() >=
        result.submittedAt.getTime(),
    );
    assert.ok(
      result.updatedAt.getTime() >=
        result.submittedAt.getTime(),
    );
  },
);

test(
  'recovers PREPARED without producing inverted timestamps',
  () => {
    const result =
      normalizeRelayTimestamps({
        blockTs:
          new Date(
            '2026-11-12T09:59:30.000Z',
          ),
        preparedAt:
          new Date(
            '2026-11-12T09:59:30.853Z',
          ),
        submittedAt:
          null,
        confirmedAt:
          null,
        updatedAt:
          new Date(
            '2026-11-12T09:59:30.853Z',
          ),
      });

    assert.equal(
      result.submittedAt.toISOString(),
      '2026-11-12T09:59:30.853Z',
    );
    assert.equal(
      result.confirmedAt.toISOString(),
      '2026-11-12T09:59:30.853Z',
    );
    assert.ok(
      result.submittedAt.getTime() >=
        new Date(
          '2026-11-12T09:59:30.853Z',
        ).getTime(),
    );
    assert.ok(
      result.confirmedAt.getTime() >=
        result.submittedAt.getTime(),
    );
  },
);

test(
  'preserves an existing CONFIRMED timestamp on replay',
  () => {
    const existingConfirmedAt =
      new Date(
        '2026-11-12T10:00:00.500Z',
      );

    const result =
      normalizeRelayTimestamps({
        blockTs:
          new Date(
            '2026-11-12T09:59:30.000Z',
          ),
        preparedAt:
          new Date(
            '2026-11-12T09:59:25.284Z',
          ),
        submittedAt:
          new Date(
            '2026-11-12T09:59:30.853Z',
          ),
        confirmedAt:
          existingConfirmedAt,
        updatedAt:
          new Date(
            '2026-11-12T10:00:01.000Z',
          ),
      });

    assert.equal(
      result.confirmedAt.toISOString(),
      existingConfirmedAt.toISOString(),
    );
    assert.equal(
      result.updatedAt.toISOString(),
      '2026-11-12T10:00:01.000Z',
    );
  },
);

test(
  'all relay confirmation projections use the timestamp invariant',
  () => {
    for (
      const [
        current,
        following,
      ]
      of projectionBoundaries
    ) {
      const projection =
        readProjection(
          current,
          following,
        );

      assert.match(
        projection,
        /relay_projection AS/,
        `${current} lacks relay projection`,
      );

      assert.match(
        projection,
        /submitted_at\s*=\s*COALESCE\(\s*ri\.submitted_at,\s*GREATEST\(\s*\$\{projection\.blockTs\},\s*ri\.prepared_at\s*\)\s*\)/s,
        `${current} does not normalize submitted_at`,
      );

      assert.match(
        projection,
        /confirmed_at\s*=\s*COALESCE\(\s*ri\.confirmed_at,\s*GREATEST\(\s*\$\{projection\.blockTs\},\s*COALESCE\(\s*ri\.submitted_at,\s*ri\.prepared_at\s*\),\s*ri\.prepared_at\s*\)\s*\)/s,
        `${current} does not normalize confirmed_at`,
      );

      assert.match(
        projection,
        /updated_at\s*=\s*GREATEST\(\s*\$\{projection\.blockTs\},\s*ri\.updated_at,\s*COALESCE\(\s*ri\.submitted_at,\s*ri\.prepared_at\s*\),\s*ri\.prepared_at\s*\)/s,
        `${current} does not normalize updated_at`,
      );

      assert.match(
        projection,
        /processed\s*=\s*true,\s*processing_error\s*=\s*NULL/s,
        `${current} does not clear processing_error`,
      );
    }
  },
);

test(
  'AuctionRegistered persists immutable chain registration evidence',
  () => {
    const projection =
      readProjection(
        'projectAuctionRegistered',
        'projectCollected',
      );

    assert.match(
      projection,
      /onchain_tx_hash\s*=\s*lower\(\s*\$\{projection\.txHash\}\s*\)/s,
    );

    assert.match(
      projection,
      /onchain_registered_at\s*=\s*COALESCE\(\s*a\.onchain_registered_at,\s*\$\{projection\.blockTs\}\s*\)/s,
    );
  },
);

test(
  'legacy direct block timestamp relay assignments are absent',
  () => {
    assert.doesNotMatch(
      processSource,
      /submitted_at\s*=\s*COALESCE\(\s*ri\.submitted_at,\s*\$\{projection\.blockTs\}\s*\)/s,
    );

    assert.doesNotMatch(
      processSource,
      /confirmed_at\s*=\s*COALESCE\(\s*ri\.confirmed_at,\s*\$\{projection\.blockTs\}\s*\)/s,
    );
  },
);
