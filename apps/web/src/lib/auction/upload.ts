// @file apps/web/src/lib/auction/upload.ts
//
// Client-side canonical upload flow:
// validate -> hash/dimensions -> presign -> checksum-bound PUT -> thumbnail.
//
// Server tidak menerima byte file. S3 wajib memvalidasi checksum SHA-256
// yang dikirim pada PUT, lalu metadata object diverifikasi kembali melalui
// HEAD sebelum POST /api/auction membuka database transaction.
import type { Hex } from 'viem';

export type FileSlot =
  | 'photo1'
  | 'photo2'
  | 'photo3'
  | 'photo4'
  | 'photo5'
  | 'doc';

export type UploadedFile = {
  slot: FileSlot;
  key: string;
  contentHash: Hex;
  sizeBytes: number;
  mime: string;
  filename: string;
  extension: string;
  width?: number;
  height?: number;
  previewUrl?: string;
};

type PresignResponse = Readonly<{
  data?: Readonly<{
    url: string;
    key: string;
    headers: Readonly<Record<string, string>>;
    filename: string;
    extension: string;
  }>;
  error?: Readonly<{
    message?: string;
  }>;
}>;

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const MAX_DOC_BYTES = 10 * 1024 * 1024;

const PHOTO_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

const DOC_MIMES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
] as const;

export function validateFileLocally(
  file: File,
  slot: FileSlot,
): string | null {
  const isDoc = slot === 'doc';
  const max =
    isDoc
      ? MAX_DOC_BYTES
      : MAX_PHOTO_BYTES;
  const allowed =
    isDoc
      ? DOC_MIMES
      : PHOTO_MIMES;

  if (file.size === 0) {
    return 'File kosong';
  }

  if (file.size > max) {
    return `Ukuran maksimal ${Math.round(max / 1024 / 1024)} MB`;
  }

  if (
    !(
      allowed as readonly string[]
    ).includes(file.type)
  ) {
    return `Tipe file tidak didukung: ${file.type}`;
  }

  return null;
}

async function sha256(
  buffer: ArrayBuffer,
): Promise<
  Readonly<{
    hex: Hex;
    base64: string;
  }>
> {
  const digest =
    await crypto.subtle.digest(
      'SHA-256',
      buffer,
    );

  const bytes =
    new Uint8Array(digest);

  let hex = '0x';
  let binary = '';

  for (const byte of bytes) {
    hex +=
      byte
        .toString(16)
        .padStart(2, '0');

    binary +=
      String.fromCharCode(byte);
  }

  return {
    hex: hex as Hex,
    base64: btoa(binary),
  };
}

function getImageDimensions(
  file: File,
): Promise<
  Readonly<{
    width: number;
    height: number;
  }>
> {
  return new Promise(
    (resolve, reject) => {
      const url =
        URL.createObjectURL(file);
      const image =
        new Image();

      image.onload = () => {
        URL.revokeObjectURL(url);

        if (
          !Number.isSafeInteger(
            image.naturalWidth,
          ) ||
          !Number.isSafeInteger(
            image.naturalHeight,
          ) ||
          image.naturalWidth <= 0 ||
          image.naturalHeight <= 0
        ) {
          reject(
            new Error(
              'Dimensi gambar tidak valid',
            ),
          );
          return;
        }

        resolve({
          width:
            image.naturalWidth,
          height:
            image.naturalHeight,
        });
      };

      image.onerror = () => {
        URL.revokeObjectURL(url);
        reject(
          new Error(
            'Gagal membaca dimensi gambar',
          ),
        );
      };

      image.src = url;
    },
  );
}

function makeThumbnail(
  file: File,
): Promise<string> {
  return new Promise(
    (resolve, reject) => {
      const url =
        URL.createObjectURL(file);
      const image =
        new Image();

      image.onload = () => {
        URL.revokeObjectURL(url);

        const maxDimension = 300;
        const scale =
          Math.min(
            maxDimension /
              image.naturalWidth,
            maxDimension /
              image.naturalHeight,
            1,
          );

        const width =
          Math.round(
            image.naturalWidth *
              scale,
          );

        const height =
          Math.round(
            image.naturalHeight *
              scale,
          );

        const canvas =
          document.createElement(
            'canvas',
          );

        canvas.width = width;
        canvas.height = height;

        const context =
          canvas.getContext('2d');

        if (!context) {
          reject(
            new Error(
              'canvas context unavailable',
            ),
          );
          return;
        }

        context.drawImage(
          image,
          0,
          0,
          width,
          height,
        );

        resolve(
          canvas.toDataURL(
            'image/jpeg',
            0.7,
          ),
        );
      };

      image.onerror = () => {
        URL.revokeObjectURL(url);
        reject(
          new Error(
            'Gagal membuat thumbnail',
          ),
        );
      };

      image.src = url;
    },
  );
}

export async function uploadToStorage(
  file: File,
  slot: FileSlot,
): Promise<UploadedFile> {
  const localError =
    validateFileLocally(
      file,
      slot,
    );

  if (localError) {
    throw new Error(localError);
  }

  const buffer =
    await file.arrayBuffer();

  const isImage =
    file.type.startsWith(
      'image/',
    );

  const [
    checksum,
    dimensions,
    thumbnail,
  ] = await Promise.all([
    sha256(buffer),
    isImage
      ? getImageDimensions(file)
      : Promise.resolve(null),
    isImage
      ? makeThumbnail(file).catch(
          () => undefined,
        )
      : Promise.resolve(
          undefined,
        ),
  ]);

  const presignResponse =
    await fetch(
      '/api/auction/upload-url',
      {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type':
            'application/json',
        },
        body: JSON.stringify({
          slot,
          filename:
            file.name,
          mime:
            file.type,
          sizeBytes:
            file.size,
          contentHash:
            checksum.hex,
          checksumSha256:
            checksum.base64,
          width:
            dimensions?.width ??
            null,
          height:
            dimensions?.height ??
            null,
        }),
      },
    );

  const presignJson =
    await presignResponse
      .json() as PresignResponse;

  if (
    !presignResponse.ok ||
    !presignJson.data
  ) {
    throw new Error(
      presignJson.error
        ?.message ??
      `Presign failed (${presignResponse.status})`,
    );
  }

  const uploadResponse =
    await fetch(
      presignJson.data.url,
      {
        method: 'PUT',
        headers:
          presignJson.data
            .headers,
        body:
          file,
      },
    );

  if (!uploadResponse.ok) {
    throw new Error(
      `Upload failed (${uploadResponse.status})`,
    );
  }

  return {
    slot,
    key:
      presignJson.data.key,
    contentHash:
      checksum.hex,
    sizeBytes:
      file.size,
    mime:
      file.type,
    filename:
      presignJson.data
        .filename,
    extension:
      presignJson.data
        .extension,
    width:
      dimensions?.width,
    height:
      dimensions?.height,
    previewUrl:
      thumbnail,
  };
}
