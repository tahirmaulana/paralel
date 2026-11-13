import {
  isHex,
} from 'viem';

import {
  assertAuthorized,
  canManagePartners,
  createDomainError,
} from '@paralel/domain';

import {
  dataResponse,
  executeApiHandler,
} from '@/lib/api';
import {
  requireWorkspace,
} from '@/lib/auth';
import {
  presignPut,
} from '@/lib/storage/presign';
import {
  getStorageLocation,
} from '@/lib/storage/s3-client';

const MAX_PARTNER_PHOTO_BYTES =
  5 * 1024 * 1024;
const ALLOWED_MIMES =
  new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
  ]);
const EXTENSIONS:
  Readonly<Record<string, string>> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
  };

function invalid(
  message: string,
): never {
  throw createDomainError(
    'INVALID_INPUT',
    message,
  );
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
          requestContext.correlationId,
          'PLATFORM_ADMIN',
        );
      assertAuthorized(
        canManagePartners(
          authentication.actor,
        ),
      );

      const body =
        await request.json().catch(
          () => invalid(
            'Request body must contain valid JSON.',
          ),
        ) as Record<string, unknown>;

      const mime =
        typeof body.mime === 'string'
          ? body.mime.trim().toLowerCase()
          : '';
      const filename =
        typeof body.filename === 'string'
          ? body.filename.trim()
          : '';
      const sizeBytes =
        body.sizeBytes;
      const contentHash =
        body.contentHash;
      const checksumSha256 =
        body.checksumSha256;

      if (
        !filename ||
        filename.length > 255 ||
        !ALLOWED_MIMES.has(mime) ||
        typeof sizeBytes !== 'number' ||
        !Number.isSafeInteger(sizeBytes) ||
        sizeBytes <= 0 ||
        sizeBytes > MAX_PARTNER_PHOTO_BYTES ||
        typeof contentHash !== 'string' ||
        !isHex(contentHash, { strict: true }) ||
        contentHash.length !== 66 ||
        typeof checksumSha256 !== 'string' ||
        !/^[A-Za-z0-9+/]+={0,2}$/.test(checksumSha256)
      ) {
        return invalid(
          'Partner photo metadata is invalid.',
        );
      }

      const extension =
        EXTENSIONS[mime]!;
      const location =
        getStorageLocation(
          'partner-photos',
        );
      const key =
        `${location.prefix}/${crypto.randomUUID()}.${extension}`;
      const result =
        await presignPut({
          purpose:
            'partner-photos',
          key,
          slot:
            'partner-photo',
          actorWallet:
            authentication.actor.wallet,
          contentType:
            mime,
          sizeBytes,
          contentHash:
            contentHash as `0x${string}`,
          checksumSha256,
          filename,
          extension,
          width: null,
          height: null,
        });

      return dataResponse(
        result,
        requestContext.correlationId,
      );
    },
  );
}
