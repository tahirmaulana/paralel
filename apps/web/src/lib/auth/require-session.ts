import {
  ARBITRUM_SEPOLIA_CHAIN_ID,
} from '@paralel/contracts';

import {
  SESSION_COOKIE_NAME,
  validateSession,
  type SessionClaims,
} from '@paralel/auth';

import {
  createDomainError,
} from '@paralel/domain';

import {
  sessionRepository,
} from './session-repository';

function parseCookieHeader(
  cookieHeader: string | null,
): ReadonlyMap<string, string> {
  const cookies =
    new Map<string, string>();

  if (!cookieHeader) {
    return cookies;
  }

  for (
    const segment
    of cookieHeader.split(';')
  ) {
    const separatorIndex =
      segment.indexOf('=');

    if (separatorIndex < 1) {
      continue;
    }

    const name =
      segment
        .slice(0, separatorIndex)
        .trim();

    const value =
      segment
        .slice(separatorIndex + 1)
        .trim();

    if (
      name.length > 0 &&
      value.length > 0
    ) {
      cookies.set(
        name,
        decodeURIComponent(value),
      );
    }
  }

  return cookies;
}

export function readSessionToken(
  request: Request,
): string | null {
  const cookies =
    parseCookieHeader(
      request.headers.get('cookie'),
    );

  return (
    cookies.get(
      SESSION_COOKIE_NAME,
    ) ?? null
  );
}

export async function requireSession(
  request: Request,
  correlationId: string,
): Promise<SessionClaims> {
  const token =
    readSessionToken(request);

  if (!token) {
    throw createDomainError(
      'UNAUTHENTICATED',
      'An authenticated wallet session is required.',
      {
        correlationId,
      },
    );
  }

  try {
    return await validateSession(
      {
        token,
        expectedChainId:
          ARBITRUM_SEPOLIA_CHAIN_ID,
        now:
          new Date(),
      },
      {
        repository:
          sessionRepository,
        touchSession:
          true,
      },
    );
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      'correlationId' in error &&
      !error.correlationId
    ) {
      Object.assign(
        error,
        {
          correlationId,
        },
      );
    }

    throw error;
  }
}
