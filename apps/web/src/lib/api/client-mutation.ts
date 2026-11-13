export function createMutationHeaders(
  operation: string,
): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'Idempotency-Key': `${operation}:${crypto.randomUUID()}`,
  };
}
