const SAFE_IDEMPOTENCY_KEY =
  /^[A-Za-z0-9._:-]{16,128}$/;

export function createRelayRequestOptions(
  serializedBody: string,
  idempotencyKey: string,
): RequestInit {
  if (
    !SAFE_IDEMPOTENCY_KEY.test(
      idempotencyKey,
    )
  ) {
    throw new Error(
      'A valid relay idempotency key is required.',
    );
  }

  return {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key':
        idempotencyKey,
    },
    body: serializedBody,
  };
}
