import { NextResponse } from 'next/server';

export function dataResponse<T>(
  data: T,
  correlationId: string,
  init?: ResponseInit,
): NextResponse<Readonly<{ data: T }>> {
  const headers =
    new Headers(init?.headers);

  headers.set(
    'x-correlation-id',
    correlationId,
  );

  headers.set(
    'cache-control',
    'no-store',
  );

  return NextResponse.json(
    { data },
    {
      ...init,
      headers,
    },
  );
}

export function acceptedResponse<T>(
  data: T,
  correlationId: string,
): NextResponse<Readonly<{ data: T }>> {
  return dataResponse(
    data,
    correlationId,
    {
      status: 202,
    },
  );
}
