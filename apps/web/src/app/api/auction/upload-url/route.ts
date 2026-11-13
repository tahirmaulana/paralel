// @file apps/web/src/app/api/auction/upload-url/route.ts
//
// Presign URL untuk direct upload ke object storage.
// Checksum dan canonical metadata diikat pada signed PUT.
//
// Route ini belum menulis database.
import {
  isHex,
  type Hex,
} from 'viem';

import {
  createDomainError,
} from '@paralel/domain';

import {
  executeApiHandler,
} from '@/lib/api/handler';

import {
  dataResponse,
} from '@/lib/api/response';

import {
  requireWorkspace,
} from '@/lib/auth';

import {
  presignPut,
} from '@/lib/storage/presign';
import type {
  StoragePurpose,
} from '@/lib/storage/s3-client';

const ALLOWED_SLOTS = [
  'photo1',
  'photo2',
  'photo3',
  'photo4',
  'photo5',
  'doc',
] as const;

type Slot =
  (typeof ALLOWED_SLOTS)[number];

const ALLOWED_PHOTO_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

const ALLOWED_DOC_MIMES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
] as const;

const MAX_PHOTO_BYTES =
  5 * 1024 * 1024;

const MAX_DOC_BYTES =
  10 * 1024 * 1024;

const MAX_FILENAME_LENGTH = 255;

const EXTENSION_BY_MIME:
  Readonly<Record<string, string>> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'application/pdf': 'pdf',
  };

type UploadInput =
  Readonly<{
    slot: Slot;
    filename: string;
    mime: string;
    sizeBytes: number;
    contentHash: Hex;
    checksumSha256: string;
    width: number | null;
    height: number | null;
  }>;

function isObject(
  value: unknown,
): value is Record<
  string,
  unknown
> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  );
}

function requireString(
  value: unknown,
  field: string,
): string {
  if (
    typeof value !== 'string' ||
    value.trim().length === 0
  ) {
    throw createDomainError(
      'INVALID_INPUT',
      `${field} is required.`,
      {
        details: {
          field,
        },
      },
    );
  }

  return value.trim();
}

function requireInteger(
  value: unknown,
  field: string,
): number {
  if (
    typeof value !== 'number' ||
    !Number.isSafeInteger(value)
  ) {
    throw createDomainError(
      'INVALID_INPUT',
      `${field} must be a safe integer.`,
      {
        details: {
          field,
        },
      },
    );
  }

  return value;
}

function parseNullableDimension(
  value: unknown,
  field: string,
): number | null {
  if (value === null) {
    return null;
  }

  const parsed =
    requireInteger(
      value,
      field,
    );

  if (parsed <= 0) {
    throw createDomainError(
      'INVALID_INPUT',
      `${field} must be positive.`,
      {
        details: {
          field,
        },
      },
    );
  }

  return parsed;
}

function normalizeFilename(
  value: string,
): string {
  const basename =
    value
      .replaceAll('\\', '/')
      .split('/')
      .at(-1)
      ?.trim() ?? '';

  if (
    basename.length === 0 ||
    basename.length >
      MAX_FILENAME_LENGTH ||
    basename.includes('\0')
  ) {
    throw createDomainError(
      'INVALID_INPUT',
      'filename is invalid.',
      {
        details: {
          field: 'filename',
        },
      },
    );
  }

  const lastDot =
    basename.lastIndexOf('.');

  const withoutExtension =
    (
      lastDot > 0
        ? basename.slice(
            0,
            lastDot,
          )
        : basename
    ).trim();

  if (
    withoutExtension.length === 0
  ) {
    throw createDomainError(
      'INVALID_INPUT',
      'filename is invalid.',
      {
        details: {
          field: 'filename',
        },
      },
    );
  }

  return withoutExtension;
}

function parseInput(
  value: unknown,
): UploadInput {
  if (!isObject(value)) {
    throw createDomainError(
      'INVALID_INPUT',
      'JSON body must be an object.',
    );
  }

  const allowedKeys =
    new Set([
      'slot',
      'filename',
      'mime',
      'sizeBytes',
      'contentHash',
      'checksumSha256',
      'width',
      'height',
    ]);

  const unknownKeys =
    Object.keys(value).filter(
      (key) =>
        !allowedKeys.has(key),
    );

  if (unknownKeys.length > 0) {
    throw createDomainError(
      'INVALID_INPUT',
      'JSON body contains unknown fields.',
      {
        details: {
          fields:
            unknownKeys,
        },
      },
    );
  }

  const slot =
    requireString(
      value.slot,
      'slot',
    );

  if (
    !(
      ALLOWED_SLOTS as
        readonly string[]
    ).includes(slot)
  ) {
    throw createDomainError(
      'INVALID_INPUT',
      'slot is invalid.',
      {
        details: {
          field: 'slot',
        },
      },
    );
  }

  const mime =
    requireString(
      value.mime,
      'mime',
    );

  const isDocument =
    slot === 'doc';

  const allowedMimes =
    isDocument
      ? ALLOWED_DOC_MIMES
      : ALLOWED_PHOTO_MIMES;

  if (
    !(
      allowedMimes as
        readonly string[]
    ).includes(mime)
  ) {
    throw createDomainError(
      'INVALID_INPUT',
      'mime is not allowed for this slot.',
      {
        details: {
          field: 'mime',
          slot,
          mime,
        },
      },
    );
  }

  const sizeBytes =
    requireInteger(
      value.sizeBytes,
      'sizeBytes',
    );

  const maxBytes =
    isDocument
      ? MAX_DOC_BYTES
      : MAX_PHOTO_BYTES;

  if (
    sizeBytes <= 0 ||
    sizeBytes > maxBytes
  ) {
    throw createDomainError(
      'INVALID_INPUT',
      'sizeBytes is outside the allowed range.',
      {
        details: {
          field:
            'sizeBytes',
          maximum:
            maxBytes,
        },
      },
    );
  }

  const contentHash =
    requireString(
      value.contentHash,
      'contentHash',
    );

  if (
    !isHex(contentHash) ||
    contentHash.length !== 66
  ) {
    throw createDomainError(
      'INVALID_INPUT',
      'contentHash must be a SHA-256 hex value.',
      {
        details: {
          field:
            'contentHash',
        },
      },
    );
  }

  const checksumSha256 =
    requireString(
      value.checksumSha256,
      'checksumSha256',
    );

  let checksumBytes:
    Uint8Array;

  try {
    checksumBytes =
      Uint8Array.from(
        atob(checksumSha256),
        (character) =>
          character.charCodeAt(0),
      );
  } catch {
    throw createDomainError(
      'INVALID_INPUT',
      'checksumSha256 must be valid base64.',
      {
        details: {
          field:
            'checksumSha256',
        },
      },
    );
  }

  if (
    checksumBytes.length !== 32
  ) {
    throw createDomainError(
      'INVALID_INPUT',
      'checksumSha256 must contain 32 bytes.',
      {
        details: {
          field:
            'checksumSha256',
        },
      },
    );
  }

  const checksumHex =
    `0x${Array.from(
      checksumBytes,
      (byte) =>
        byte
          .toString(16)
          .padStart(2, '0'),
    ).join('')}`;

  if (
    checksumHex.toLowerCase() !==
    contentHash.toLowerCase()
  ) {
    throw createDomainError(
      'INVALID_INPUT',
      'contentHash and checksumSha256 do not match.',
      {
        details: {
          field:
            'contentHash',
        },
      },
    );
  }

  const width =
    parseNullableDimension(
      value.width,
      'width',
    );

  const height =
    parseNullableDimension(
      value.height,
      'height',
    );

  const isImage =
    mime.startsWith('image/');

  if (
    isImage &&
    (
      width === null ||
      height === null
    )
  ) {
    throw createDomainError(
      'INVALID_INPUT',
      'Image dimensions are required.',
      {
        details: {
          fields: [
            'width',
            'height',
          ],
        },
      },
    );
  }

  if (
    !isImage &&
    (
      width !== null ||
      height !== null
    )
  ) {
    throw createDomainError(
      'INVALID_INPUT',
      'Non-image files must not include dimensions.',
      {
        details: {
          fields: [
            'width',
            'height',
          ],
        },
      },
    );
  }

  return {
    slot:
      slot as Slot,
    filename:
      normalizeFilename(
        requireString(
          value.filename,
          'filename',
        ),
      ),
    mime,
    sizeBytes,
    contentHash:
      contentHash as Hex,
    checksumSha256,
    width,
    height,
  };
}

export async function POST(
  request: Request,
): Promise<Response> {
  return executeApiHandler(
    request,
    async (requestContext) => {
      const authentication =
        await requireWorkspace(
          request,
          requestContext
            .correlationId,
          'USER',
        );

      let rawBody: unknown;

      try {
        rawBody =
          await request.json();
      } catch {
        throw createDomainError(
          'INVALID_INPUT',
          'Request body must contain valid JSON.',
        );
      }

      const input =
        parseInput(rawBody);

      const extension =
        EXTENSION_BY_MIME[
          input.mime
        ];

      if (!extension) {
        throw createDomainError(
          'INVALID_INPUT',
          'No canonical extension exists for mime.',
        );
      }

      const purpose: StoragePurpose =
        input.slot === 'doc'
          ? 'auction-item-documents'
          : 'auction-item-photos';
      const key =
        `${purpose === 'auction-item-documents'
          ? 'auctions-item-documents'
          : 'auctions-item-photos'}/${crypto.randomUUID()}.${extension}`;

      const result =
        await presignPut({
          key,
          purpose,
          slot:
            input.slot,
          actorWallet:
            authentication
              .actor
              .wallet
              .toLowerCase(),
          contentType:
            input.mime,
          sizeBytes:
            input.sizeBytes,
          contentHash:
            input.contentHash,
          checksumSha256:
            input.checksumSha256,
          filename:
            input.filename,
          extension,
          width:
            input.width,
          height:
            input.height,
        });

      return dataResponse(
        {
          ...result,
          filename:
            input.filename,
          extension,
        },
        requestContext
          .correlationId,
      );
    },
  );
}
