import assert from 'node:assert/strict';
import test from 'node:test';

import {
  parseAuctionCreateInput,
} from '../src/lib/auction/create-input';

const NOW =
  new Date(
    '2026-11-09T00:00:00.000Z',
  );

const CONTENT_HASH =
  `0x${'a'.repeat(64)}`;

type FileSlot =
  | 'photo1'
  | 'photo2'
  | 'photo3'
  | 'photo4'
  | 'photo5'
  | 'doc';

function validFile(
  slot: FileSlot,
) {
  const isDocument =
    slot === 'doc';

  return {
    slot,
    key:
      isDocument
        ? 'auctions-item-documents/123e4567-e89b-12d3-a456-426614174006.pdf'
        : `auctions-item-photos/123e4567-e89b-12d3-a456-42661417400${slot.at(-1)}.jpg`,
    contentHash:
      CONTENT_HASH,
    sizeBytes:
      1_024,
    mime:
      isDocument
        ? 'application/pdf'
        : 'image/jpeg',
    filename:
      isDocument
        ? 'invoice'
        : slot,
    extension:
      isDocument
        ? 'pdf'
        : 'jpg',
    width:
      isDocument
        ? null
        : 1_200,
    height:
      isDocument
        ? null
        : 800,
  };
}

function validBody() {
  return {
    category:
      'ELEKTRONIK',
    guarantorId:
      '123e4567-e89b-12d3-a456-426614174000',
    title:
      'Canonical asset',
    description:
      'Canonical asset description',
    condition:
      'GOOD',
    conditionNotes:
      null,
    documentNumber:
      'INV-001',
    chassisNumber:
      null,
    serialNumber:
      'SERIAL-001',
    spec: {
      brand:
        'Canonical Brand',
      model:
        'Canonical Model',
      purchaseYear:
        2026,
      completeness:
        'Complete',
    },
    startingBid:
      '100000000',
    bidIncrement:
      '5000000',
    openAt:
      '2026-11-12T00:00:00.000Z',
    durationHours:
      24,
    files: [
      validFile('photo1'),
      validFile('photo2'),
      validFile('photo3'),
      validFile('photo4'),
      validFile('photo5'),
      validFile('doc'),
    ],
  };
}

function rejects(
  body: unknown,
  message: RegExp,
  now: Date = NOW,
): void {
  assert.throws(
    () =>
      parseAuctionCreateInput(
        body,
        now,
      ),
    message,
  );
}

test(
  'accepts and normalizes a canonical auction request',
  () => {
    const parsed =
      parseAuctionCreateInput(
        validBody(),
        NOW,
      );

    assert.equal(
      parsed.category,
      'ELEKTRONIK',
    );

    assert.equal(
      parsed.documentType,
      'INVOICE',
    );

    assert.equal(
      parsed.startingBid,
      100_000_000n,
    );

    assert.equal(
      parsed.bidIncrement,
      5_000_000n,
    );

    assert.equal(
      parsed.closeAt.toISOString(),
      '2026-11-13T00:00:00.000Z',
    );

    assert.equal(
      parsed.files.length,
      6,
    );
  },
);

test(
  'rejects wallet authority in request body',
  () => {
    rejects(
      {
        ...validBody(),
        wallet:
          '0x1111111111111111111111111111111111111111',
      },
      /unknown fields|wallet is not accepted/i,
    );
  },
);

test(
  'rejects legacy or cross-purpose object keys',
  () => {
    const body =
      validBody();
    body.files[0].key =
      'uploads/123e4567-e89b-12d3-a456-426614174000.jpg';

    rejects(
      body,
      /Object key is invalid/i,
    );
  },
);

test(
  'rejects unknown top-level and file fields',
  () => {
    rejects(
      {
        ...validBody(),
        unexpected:
          true,
      },
      /unknown fields/i,
    );

    const body =
      validBody();

    body.files[0] = {
      ...body.files[0],
      unexpected:
        true,
    } as unknown as
      (typeof body.files)[number];

    rejects(
      body,
      /unknown fields/i,
    );
  },
);

test(
  'rejects malformed monetary values and unsupported increments',
  () => {
    rejects(
      {
        ...validBody(),
        startingBid:
          '100.00',
      },
      /unsigned decimal integer string/i,
    );

    rejects(
      {
        ...validBody(),
        bidIncrement:
          '-500000',
      },
      /unsigned decimal integer string/i,
    );

    rejects(
      {
        ...validBody(),
        bidIncrement:
          '0',
      },
      /must be positive/i,
    );

    const policy = {
      allowedIncrements: [50_000n],
      maxIncrementBps: 500,
      minDurationHours: 6,
      maxDurationHours: 72,
      minOpenDelay: 3_600,
      maxOpenDelay: 604_800,
      blockTimestamp: BigInt(NOW.getTime() / 1_000),
    };
    assert.throws(
      () =>
        parseAuctionCreateInput(
          { ...validBody(), bidIncrement: '1000000' },
          NOW,
          policy,
        ),
      /not allowed by the current contract configuration/i,
    );
  },
);

test(
  'rejects category and identifier mismatch',
  () => {
    rejects(
      {
        ...validBody(),
        category:
          'OTOMOTIF',
        chassisNumber:
          null,
        serialNumber:
          'SERIAL-001',
      },
      /chassisNumber/i,
    );

    rejects(
      {
        ...validBody(),
        category:
          'PROPERTI',
        documentNumber:
          'NUL',
        serialNumber:
          null,
      },
      /NUL is allowed only for INVOICE/i,
    );
  },
);

test(
  'rejects duplicate or missing file slots',
  () => {
    const duplicate =
      validBody();

    duplicate.files[4] =
      validFile('photo4');

    rejects(
      duplicate,
      /slot must occur exactly once/i,
    );

    const missing =
      validBody();

    missing.files =
      missing.files.slice(
        0,
        5,
      );

    rejects(
      missing,
      /exactly five photos and one document/i,
    );
  },
);

test(
  'rejects MIME extension and dimension mismatch',
  () => {
    const extensionMismatch =
      validBody();

    extensionMismatch.files[0] = {
      ...extensionMismatch.files[0],
      extension:
        'png',
    };

    rejects(
      extensionMismatch,
      /extension does not match mime/i,
    );

    const missingDimensions =
      validBody();

    missingDimensions.files[0] = {
      ...missingDimensions.files[0],
      width:
        null,
    };

    rejects(
      missingDimensions,
      /image dimensions are required/i,
    );

    const pdfDimensions =
      validBody();

    pdfDimensions.files[5] = {
      ...pdfDimensions.files[5],
      width:
        100,
      height:
        100,
    };

    rejects(
      pdfDimensions,
      /non-image files must not include dimensions/i,
    );
  },
);

test(
  'rejects invalid timestamp and duration',
  () => {
    rejects(
      {
        ...validBody(),
        openAt:
          '2026-11-12',
      },
      /canonical ISO-8601 UTC/i,
    );

    rejects(
      {
        ...validBody(),
        durationHours:
          65_536,
      },
      /outside the contract range/i,
    );
  },
);

test(
  'uses supplied evaluation time instead of system time',
  () => {
    assert.doesNotThrow(
      () =>
        parseAuctionCreateInput(
          validBody(),
          NOW,
        ),
    );

    rejects(
      validBody(),
      /must be in the future/i,
      new Date(
        '2026-11-13T00:00:01.000Z',
      ),
    );

    rejects(
      validBody(),
      /evaluation time is invalid/i,
      new Date('invalid'),
    );
  },
);
