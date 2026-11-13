import {
  getAddress,
  isAddress,
  type Address,
} from 'viem';

import {
  ARBITRUM_SEPOLIA_CHAIN_ID,
} from '@paralel/contracts';

import {
  assertTrustedRequestOrigin,
  issueWalletAuthChallenge,
} from '@paralel/auth';

import {
  assertDomain,
  createDomainError,
} from '@paralel/domain';

import {
  dataResponse,
  executeApiHandler,
} from '@/lib/api';

import {
  challengeRepository,
} from '@/lib/auth';

type ParsedChallengeBody =
  Readonly<{
    wallet: Address;
    chainId: number;
  }>;

function isJsonObject(
  value: unknown,
): value is Record<
  string,
  unknown
> {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value)
  );
}

async function readJsonObject(
  request: Request,
): Promise<
  Record<string, unknown>
> {
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
): ParsedChallengeBody {
  const wallet =
    body.wallet;

  const chainId =
    body.chainId;

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

  return Object.freeze({
    wallet:
      getAddress(wallet),
    chainId,
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

      const challenge =
        await issueWalletAuthChallenge(
          {
            wallet:
              body.wallet,
            chainId:
              body.chainId,
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

      return dataResponse(
        {
          challengeId:
            challenge.challengeId,
          wallet:
            challenge.wallet,
          chainId:
            challenge.chainId,
          domain:
            challenge.domain,
          uri:
            challenge.uri,
          statement:
            challenge.statement,
          issuedAt:
            challenge.issuedAt
              .toISOString(),
          expiresAt:
            challenge.expiresAt
              .toISOString(),
          message:
            challenge.message,
        },
        requestContext.correlationId,
        {
          status: 201,
        },
      );
    },
  );
}
