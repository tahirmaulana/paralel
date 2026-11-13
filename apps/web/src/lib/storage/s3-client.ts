// @file apps/web/src/lib/storage/s3-client.ts
//
// Singleton S3-compatible client untuk Neon Object Storage.
// Ref: TECH_STACK.md §2 (storage provider — pilot memakai Neon Object Storage,
//      S3-compatible). Pola sama dengan getRelayClients() di shared/relay/client.ts.
import { S3Client } from '@aws-sdk/client-s3';

export type StoragePurpose =
  | 'auction-item-documents'
  | 'auction-item-photos'
  | 'partner-documents'
  | 'partner-photos'
  | 'user-kyc-photos';

type StorageLocation = Readonly<{
  bucket: string;
  prefix: string;
}>;

let _client: S3Client | null = null;

export function getS3Client(): S3Client {
  if (_client) return _client;

  const endpoint = process.env.AWS_ENDPOINT_URL_S3;
  const region = process.env.AWS_REGION;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!endpoint || !region || !accessKeyId || !secretAccessKey) {
    throw new Error(
      'Neon Object Storage env incomplete: ' +
        'AWS_ENDPOINT_URL_S3 / AWS_REGION / AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY',
    );
  }

  _client = new S3Client({
    endpoint,
    region,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true,
  });

  return _client;
}

const STORAGE_CONFIG: Readonly<
  Record<
    StoragePurpose,
    Readonly<{
      bucketEnv: string;
      prefix: string;
    }>
  >
> = {
  'auction-item-documents': {
    bucketEnv: 'S3_BUCKET_AUCTIONS_ITEM_DOCUMENTS',
    prefix: 'auctions-item-documents',
  },
  'auction-item-photos': {
    bucketEnv: 'S3_BUCKET_AUCTIONS_ITEM_PHOTOS',
    prefix: 'auctions-item-photos',
  },
  'partner-documents': {
    bucketEnv: 'S3_BUCKET_PARTNERS_DOCUMENTS',
    prefix: 'partners-documents',
  },
  'partner-photos': {
    bucketEnv: 'S3_BUCKET_PARTNERS_PHOTOS',
    prefix: 'partners-photos',
  },
  'user-kyc-photos': {
    bucketEnv: 'S3_BUCKET_USERS_KYC_PHOTOS',
    prefix: 'users-kyc-photos',
  },
};

export function getStorageLocation(
  purpose: StoragePurpose = 'auction-item-photos',
): StorageLocation {
  const config =
    STORAGE_CONFIG[purpose];
  const bucket =
    process.env[config.bucketEnv]?.trim() ||
    process.env.S3_BUCKET?.trim();

  if (!bucket) {
    throw new Error(
      `${config.bucketEnv} or S3_BUCKET is required.`,
    );
  }

  return {
    bucket,
    prefix: config.prefix,
  };
}

export function getBucketName(
  purpose: StoragePurpose = 'auction-item-photos',
): string {
  return getStorageLocation(purpose).bucket;
}