// @file apps/web/src/lib/storage/presign.ts
//
// Presigned object-storage operations untuk auction files.
// PUT mengikat checksum SHA-256 dan canonical metadata.
// HEAD verifier digunakan sebelum database transaction.
import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';

import {
  getSignedUrl,
} from '@aws-sdk/s3-request-presigner';

import type {
  Hex,
} from 'viem';

import {
  matchesStoredObjectMetadata,
} from '@/lib/auction/create-security';

import {
  getStorageLocation,
  getS3Client,
  type StoragePurpose,
} from './s3-client';

const PUT_EXPIRES_SECONDS = 300;
const GET_EXPIRES_SECONDS = 3600;

export type PresignPutInput =
  Readonly<{
    key: string;
    purpose?: StoragePurpose;
    slot: string;
    actorWallet: string;
    contentType: string;
    sizeBytes: number;
    contentHash: Hex;
    checksumSha256: string;
    filename: string;
    extension: string;
    width: number | null;
    height: number | null;
  }>;

export type PresignPutResult =
  Readonly<{
    url: string;
    key: string;
    headers:
      Readonly<
        Record<string, string>
      >;
  }>;

export type StoredObjectExpectation =
  Readonly<{
    key: string;
    purpose?: StoragePurpose;
    slot: string;
    actorWallet: string;
    contentType: string;
    sizeBytes: number;
    contentHash: Hex;
    checksumSha256: string;
    filename: string;
    extension: string;
    width: number | null;
    height: number | null;
  }>;

export type StoredObjectVerification =
  Readonly<{
    ok: boolean;
    reason:
      | null
      | 'NOT_FOUND'
      | 'SIZE_MISMATCH'
      | 'MIME_MISMATCH'
      | 'CHECKSUM_MISMATCH'
      | 'METADATA_MISMATCH';
  }>;

function metadataValue(
  value: string,
): string {
  return encodeURIComponent(
    value,
  );
}

function optionalIntegerMetadata(
  value: number | null,
): string {
  return (
    value === null
      ? ''
      : String(value)
  );
}

function expectedMetadata(
  input:
    StoredObjectExpectation,
): Readonly<
  Record<string, string>
> {
  return {
    slot:
      input.slot,
    'actor-wallet':
      input.actorWallet
        .toLowerCase(),
    'content-hash':
      input.contentHash
        .toLowerCase(),
    filename:
      metadataValue(
        input.filename,
      ),
    extension:
      input.extension,
    width:
      optionalIntegerMetadata(
        input.width,
      ),
    height:
      optionalIntegerMetadata(
        input.height,
      ),
  };
}

export async function presignPut(
  input: PresignPutInput,
): Promise<PresignPutResult> {
  const location =
    getStorageLocation(
      input.purpose,
    );
  const metadata =
    expectedMetadata(input);

  const command =
    new PutObjectCommand({
      Bucket:
        location.bucket,
      Key:
        input.key,
      ContentType:
        input.contentType,
      ContentLength:
        input.sizeBytes,
      ChecksumSHA256:
        input.checksumSha256,
      Metadata:
        metadata,
    });

  const url =
    await getSignedUrl(
      getS3Client(),
      command,
      {
        expiresIn:
          PUT_EXPIRES_SECONDS,
      },
    );

  return {
    url,
    key:
      input.key,
    headers: {
      'Content-Type':
        input.contentType,
      'Content-Length':
        String(
          input.sizeBytes,
        ),
      'x-amz-checksum-sha256':
        input.checksumSha256,
      'x-amz-meta-slot':
        metadata.slot,
      'x-amz-meta-actor-wallet':
        metadata[
          'actor-wallet'
        ],
      'x-amz-meta-content-hash':
        metadata[
          'content-hash'
        ],
      'x-amz-meta-filename':
        metadata.filename,
      'x-amz-meta-extension':
        metadata.extension,
      'x-amz-meta-width':
        metadata.width,
      'x-amz-meta-height':
        metadata.height,
    },
  };
}

export async function presignGet(
  key: string,
  purpose: StoragePurpose = 'auction-item-photos',
): Promise<string> {
  const location =
    getStorageLocation(purpose);
  const command =
    new GetObjectCommand({
      Bucket:
        location.bucket,
      Key:
        key,
    });

  return getSignedUrl(
    getS3Client(),
    command,
    {
      expiresIn:
        GET_EXPIRES_SECONDS,
    },
  );
}

export async function verifyStoredObject(
  expectation:
    StoredObjectExpectation,
): Promise<
  StoredObjectVerification
> {
  const location =
    getStorageLocation(
      expectation.purpose,
    );
  try {
    const response =
      await getS3Client().send(
        new HeadObjectCommand({
          Bucket:
            location.bucket,
          Key:
            expectation.key,
          ChecksumMode:
            'ENABLED',
        }),
      );

    if (
      response.ContentLength !==
      expectation.sizeBytes
    ) {
      return {
        ok: false,
        reason:
          'SIZE_MISMATCH',
      };
    }

    if (
      response.ContentType !==
      expectation.contentType
    ) {
      return {
        ok: false,
        reason:
          'MIME_MISMATCH',
      };
    }

    if (
      response.ChecksumSHA256 !==
      expectation
        .checksumSha256
    ) {
      return {
        ok: false,
        reason:
          'CHECKSUM_MISMATCH',
      };
    }

    const metadata =
      response.Metadata ?? {};

    const expected =
      expectedMetadata(
        expectation,
      );

    if (
      !matchesStoredObjectMetadata(
        metadata,
        expected,
      )
    ) {
      return {
        ok: false,
        reason:
          'METADATA_MISMATCH',
      };
    }

    return {
      ok: true,
      reason: null,
    };
  } catch {
    return {
      ok: false,
      reason:
        'NOT_FOUND',
    };
  }
}
