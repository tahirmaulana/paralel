import {
  NextResponse,
} from 'next/server';

import {
  getAddress,
  isAddress,
  isHex,
  type Address,
  type Hex,
} from 'viem';

import {
  ARBITRUM_SEPOLIA_CHAIN_ID,
} from '@paralel/contracts';

import {
  assertTrustedRequestOrigin,
  getSessionCookieOptions,
  issueSession,
  verifyWalletAuthChallenge,
} from '@paralel/auth';

import {
  assertDomain,
  createDomainError,
} from '@paralel/domain';

import {
  executeApiHandler,
  writeAuditLog,
} from '@/lib/api';

import {
  createTransactionChallengeRepository,
  createTransactionSessionRepository,
} from '@/lib/auth';

import {
  withTransaction,
} from '@/lib/database';

type ParsedVerifyBody =
  Readonly<{
    challengeId: string;
    wallet: Address;
    chainId: number;
    message: string;
    signature: Hex;
  }>;

function isJsonObject(
  value: unknown,
): value is Record<string, unknown> {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value)
  );
}

async function readJsonObject(
  request: Request,
): Promise<Record<string, unknown>> {
  let value: unknown;

  try {
    value =
      await request.json();
  } catch (error: unknown) {
    throw createDomainError(
      'INVALID_INPUT',
      'Request body must contain valid JSON.',
      {
        cause:
          error,
      },
    );
  }

  assertDomain(
    isJsonObject(value),
    'INVALID_INPUT',
    'Request body must be a JSON object.',
  );

  return value;
}

function parseBody(
  body: Record<string, unknown>,
): ParsedVerifyBody {
  const challengeId =
    body.challengeId;

  const wallet =
    body.wallet;

  const chainId =
    body.chainId;

  const message =
    body.message;

  const signature =
    body.signature;

  assertDomain(
    typeof challengeId ===
      'string' &&
      challengeId.trim().length >= 16 &&
      challengeId.trim().length <= 128 &&
      /^[A-Za-z0-9_-]+$/.test(
        challengeId.trim(),
      ),
    'INVALID_INPUT',
    'challengeId is invalid.',
  );

  assertDomain(
    typeof wallet ===
      'string' &&
      isAddress(
        wallet,
        {
          strict: false,
        },
      ),
    'INVALID_INPUT',
    'wallet must be a valid address.',
  );

  assertDomain(
    typeof chainId ===
      'number' &&
      Number.isSafeInteger(
        chainId,
      ),
    'INVALID_INPUT',
    'chainId must be an integer.',
  );

  assertDomain(
    chainId ===
      ARBITRUM_SEPOLIA_CHAIN_ID,
    'WRONG_NETWORK',
    `Authentication requires chain ID ${ARBITRUM_SEPOLIA_CHAIN_ID}.`,
    {
      details: {
        expectedChainId:
          ARBITRUM_SEPOLIA_CHAIN_ID,
        receivedChainId:
          chainId,
      },
    },
  );

  assertDomain(
    typeof message ===
      'string' &&
      message.length > 0 &&
      message.length <= 4_096,
    'INVALID_INPUT',
    'message must contain between 1 and 4096 characters.',
  );

  assertDomain(
    typeof signature ===
      'string' &&
      isHex(signature) &&
      signature.length === 132,
    'INVALID_SIGNATURE',
    'Authentication signature must be a 65-byte hexadecimal value.',
  );

  return Object.freeze({
    challengeId:
      challengeId.trim(),
    wallet:
      getAddress(wallet),
    chainId,
    message,
    signature,
  });
}

function requestIdentity(
  request: Request,
): Readonly<{
  domain: string;
  uri: string;
}> {
  const url =
    new URL(request.url);

  return Object.freeze({
    domain:
      url.host,
    uri:
      url.origin,
  });
}

export async function POST(
  request: Request,
): Promise<Response> {
  return executeApiHandler(
    request,
    async (requestContext) => {
      const requestUrl =
        new URL(request.url);

      assertTrustedRequestOrigin({
        method:
          request.method,
        origin:
          request.headers.get(
            'origin',
          ),
        expectedOrigin:
          requestUrl.origin,
      });

      const body =
        parseBody(
          await readJsonObject(
            request,
          ),
        );

      const identity =
        requestIdentity(
          request,
        );

      const issued =
        await withTransaction(
          async (transaction) => {
            const challengeRepository =
              createTransactionChallengeRepository(
                transaction,
              );

            const sessionRepository =
              createTransactionSessionRepository(
                transaction,
              );

            const verified =
              await verifyWalletAuthChallenge(
                {
                  challengeId:
                    body.challengeId,
                  wallet:
                    body.wallet,
                  chainId:
                    body.chainId,
                  message:
                    body.message,
                  signature:
                    body.signature,
                  domain:
                    identity.domain,
                  uri:
                    identity.uri,
                  now:
                    requestContext
                      .receivedAt,
                },
                {
                  repository:
                    challengeRepository,
                },
              );

            const issuedSession =
              await issueSession(
                {
                  wallet:
                    verified.wallet,
                  chainId:
                    verified.chainId,
                  now:
                    verified.verifiedAt,
                },
                {
                  repository:
                    sessionRepository,
                },
              );

            await writeAuditLog(
              transaction,
              {
                correlationId:
                  requestContext
                    .correlationId,
                sessionId:
                  issuedSession
                    .claims
                    .sessionId,
                actorWallet:
                  issuedSession
                    .claims
                    .wallet,
                actorRoles: {
                  scope:
                    'AUTHENTICATED_WALLET',
                },
                action:
                  'AUTH_SESSION_ISSUED',
                resourceType:
                  'AUTH_SESSION',
                resourceId:
                  issuedSession
                    .claims
                    .sessionId,
                outcome:
                  'SUCCEEDED',
                metadata: {
                  challengeId:
                    verified.challengeId,
                  chainId:
                    verified.chainId,
                  generation:
                    issuedSession
                      .claims
                      .generation,
                },
                createdAt:
                  verified.verifiedAt,
              },
            );

            return issuedSession;
          },
        );

      const response =
        NextResponse.json(
          {
            data: {
              wallet:
                issued.claims.wallet,
              chainId:
                issued.claims.chainId,
              sessionId:
                issued.claims.sessionId,
              issuedAt:
                issued.claims.issuedAt
                  .toISOString(),
              expiresAt:
                issued.claims.expiresAt
                  .toISOString(),
            },
          },
          {
            status: 201,
            headers: {
              'x-correlation-id':
                requestContext
                  .correlationId,
              'cache-control':
                'no-store',
            },
          },
        );

      const cookie =
        getSessionCookieOptions();

      response.cookies.set(
        cookie.name,
        issued.token,
        {
          path:
            cookie.path,
          httpOnly:
            cookie.httpOnly,
          secure:
            cookie.secure,
          sameSite:
            cookie.sameSite,
          maxAge:
            cookie.maxAgeSeconds,
        },
      );

      return response;
    },
  );
}
