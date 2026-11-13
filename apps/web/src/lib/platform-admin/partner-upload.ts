type PartnerUploadResponse =
  Readonly<{
    data?: Readonly<{
      url: string;
      key: string;
      headers: Readonly<Record<string, string>>;
    }>;
    error?: Readonly<{ message?: string }>;
  }>;

async function sha256Base64(
  buffer: ArrayBuffer,
): Promise<string> {
  const digest =
    await crypto.subtle.digest(
      'SHA-256',
      buffer,
    );
  let binary = '';
  for (const byte of new Uint8Array(digest)) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

async function sha256Hex(
  buffer: ArrayBuffer,
): Promise<`0x${string}`> {
  const digest =
    await crypto.subtle.digest(
      'SHA-256',
      buffer,
    );
  return `0x${Array.from(
    new Uint8Array(digest),
    (byte) => byte.toString(16).padStart(2, '0'),
  ).join('')}` as `0x${string}`;
}

export async function uploadPartnerPhoto(
  file: File,
): Promise<string> {
  if (
    file.size <= 0 ||
    file.size > 5 * 1024 * 1024
  ) {
    throw new Error(
      'Ukuran foto partner harus lebih besar dari 0 dan maksimal 5 MB.',
    );
  }
  if (
    !['image/jpeg', 'image/png', 'image/webp'].includes(
      file.type,
    )
  ) {
    throw new Error(
      'Format foto partner harus JPG, PNG, atau WEBP.',
    );
  }

  const buffer =
    await file.arrayBuffer();
  const [contentHash, checksumSha256] =
    await Promise.all([
      sha256Hex(buffer),
      sha256Base64(buffer),
    ]);
  const response =
    await fetch(
      '/api/platform-admin/partners/upload-url',
      {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename: file.name,
          mime: file.type,
          sizeBytes: file.size,
          contentHash,
          checksumSha256,
        }),
      },
    );
  const result =
    await response.json() as PartnerUploadResponse;
  if (!response.ok || !result.data) {
    throw new Error(
      result.error?.message ??
        `Partner photo upload preparation failed (${response.status}).`,
    );
  }

  const upload =
    await fetch(
      result.data.url,
      {
        method: 'PUT',
        headers: result.data.headers,
        body: file,
      },
    );
  if (!upload.ok) {
    throw new Error(
      `Partner photo upload failed (${upload.status}).`,
    );
  }
  return result.data.key;
}
