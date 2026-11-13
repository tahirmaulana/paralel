// @file packages/auth/test/challenge.test.ts

import assert from 'node:assert/strict';
import {
  describe,
  it,
} from 'node:test';

import type {
  Address,
  Hex,
} from 'viem';

import {
  ARBITRUM_SEPOLIA_CHAIN_ID,
} from '@paralel/contracts';

import {
  DomainError,
} from '@paralel/domain';

import {
  AUTH_CHALLENGE_HEADER,
  AUTH_CHALLENGE_VERSION,
  DEFAULT_AUTH_STATEMENT,
  DEFAULT_CHALLENGE_TTL_SECONDS,
  MAX_CHALLENGE_TTL_SECONDS,
  MIN_CHALLENGE_TTL_SECONDS,
  buildWalletAuthMessage,
  createStoredChallenge,
  hashAuthValue,
  issueWalletAuthChallenge,
  revokeWalletAuthChallenge,
  verifyWalletAuthChallenge,
} from '../src/challenge';

import type {
  ChallengeRepository,
  StoredWalletAuthChallenge,
  WalletAuthChallenge,
} from '../src/types';

const WALLET =
  '0x1111111111111111111111111111111111111111' as Address;

const OTHER_WALLET =
  '0x2222222222222222222222222222222222222222' as Address;

const DOMAIN =
  'localhost:3000';

const URI =
  'http://localhost:3000/';

const NOW =
  new Date(
    '2026-11-08T10:00:00.000Z',
  );

const CHALLENGE_ID =
  'challenge000000000000000000000001';

const NONCE =
  '1111111111111111111111111111111111111111111111111111111111111111';

const SIGNATURE =
  `0x${'11'.repeat(65)}` as Hex;

function cloneStoredChallenge(
  value: StoredWalletAuthChallenge,
): StoredWalletAuthChallenge {
  return {
    ...value,
    issuedAt:
      new Date(
        value.issuedAt.getTime(),
      ),
    expiresAt:
      new Date(
        value.expiresAt.getTime(),
      ),
    consumedAt:
      value.consumedAt
        ? new Date(
            value.consumedAt.getTime(),
          )
        : null,
    revokedAt:
      value.revokedAt
        ? new Date(
            value.revokedAt.getTime(),
          )
        : null,
    createdAt:
      new Date(
        value.createdAt.getTime(),
      ),
  };
}

class MemoryChallengeRepository
  implements ChallengeRepository
{
  private readonly records =
    new Map<
      string,
      StoredWalletAuthChallenge
    >();

  createCalls = 0;
  findCalls = 0;
  consumeCalls = 0;
  revokeCalls = 0;

  async create(
    challenge:
      StoredWalletAuthChallenge,
  ): Promise<void> {
    this.createCalls += 1;

    if (
      this.records.has(
        challenge.challengeId,
      )
    ) {
      throw new Error(
        'Duplicate challenge ID',
      );
    }

    this.records.set(
      challenge.challengeId,
      cloneStoredChallenge(
        challenge,
      ),
    );
  }

  async findById(
    challengeId: string,
  ): Promise<
    StoredWalletAuthChallenge | null
  > {
    this.findCalls += 1;

    const value =
      this.records.get(
        challengeId,
      );

    return value
      ? cloneStoredChallenge(value)
      : null;
  }

  async consume(
    input: Readonly<{
      challengeId: string;
      consumedAt: Date;
    }>,
  ): Promise<boolean> {
    this.consumeCalls += 1;

    const current =
      this.records.get(
        input.challengeId,
      );

    if (!current) {
      return false;
    }

    if (
      current.status !== 'ACTIVE' ||
      current.consumedAt !== null ||
      current.revokedAt !== null ||
      input.consumedAt.getTime() >=
        current.expiresAt.getTime()
    ) {
      return false;
    }

    this.records.set(
      input.challengeId,
      {
        ...current,
        status:
          'CONSUMED',
        consumedAt:
          new Date(
            input.consumedAt.getTime(),
          ),
      },
    );

    return true;
  }

  async revoke(
    input: Readonly<{
      challengeId: string;
      revokedAt: Date;
    }>,
  ): Promise<boolean> {
    this.revokeCalls += 1;

    const current =
      this.records.get(
        input.challengeId,
      );

    if (!current) {
      return false;
    }

    if (
      current.status !== 'ACTIVE' ||
      current.consumedAt !== null ||
      current.revokedAt !== null
    ) {
      return false;
    }

    this.records.set(
      input.challengeId,
      {
        ...current,
        status:
          'REVOKED',
        revokedAt:
          new Date(
            input.revokedAt.getTime(),
          ),
      },
    );

    return true;
  }

  seed(
    challenge:
      StoredWalletAuthChallenge,
  ): void {
    this.records.set(
      challenge.challengeId,
      cloneStoredChallenge(
        challenge,
      ),
    );
  }

  get(
    challengeId: string,
  ): StoredWalletAuthChallenge | null {
    const value =
      this.records.get(
        challengeId,
      );

    return value
      ? cloneStoredChallenge(value)
      : null;
  }
}

function expectDomainError(
  action:
    () =>
      | unknown
      | Promise<unknown>,
  expectedCode:
    DomainError['code'],
): Promise<void> {
  return assert.rejects(
    async () => {
      await action();
    },
    (
      error: unknown,
    ) => {
      assert.equal(
        error instanceof DomainError,
        true,
      );

      if (
        !(error instanceof DomainError)
      ) {
        return false;
      }

      assert.equal(
        error.code,
        expectedCode,
      );

      return true;
    },
  );
}

async function issueChallenge(
  repository:
    ChallengeRepository,
  overrides: Partial<{
    wallet: Address;
    chainId: number;
    domain: string;
    uri: string;
    statement: string;
    now: Date;
    ttlSeconds: number;
  }> = {},
): Promise<WalletAuthChallenge> {
  return issueWalletAuthChallenge(
    {
      wallet:
        overrides.wallet ??
        WALLET,
      chainId:
        overrides.chainId ??
        ARBITRUM_SEPOLIA_CHAIN_ID,
      domain:
        overrides.domain ??
        DOMAIN,
      uri:
        overrides.uri ??
        URI,
      statement:
        overrides.statement,
      now:
        overrides.now ??
        NOW,
      ttlSeconds:
        overrides.ttlSeconds,
    },
    {
      repository,
      generateChallengeId:
        () => CHALLENGE_ID,
      generateNonce:
        () => NONCE,
    },
  );
}

function validSignatureVerifier() {
  return async () => true;
}

function invalidSignatureVerifier() {
  return async () => false;
}

describe(
  'wallet authentication challenge creation',
  () => {
    it(
      'builds the canonical deterministic challenge message',
      async () => {
        const repository =
          new MemoryChallengeRepository();

        const challenge =
          await issueChallenge(
            repository,
          );

        assert.equal(
          challenge.challengeId,
          CHALLENGE_ID,
        );

        assert.equal(
          challenge.wallet,
          WALLET,
        );

        assert.equal(
          challenge.chainId,
          ARBITRUM_SEPOLIA_CHAIN_ID,
        );

        assert.equal(
          challenge.domain,
          DOMAIN,
        );

        assert.equal(
          challenge.uri,
          URI,
        );

        assert.equal(
          challenge.statement,
          DEFAULT_AUTH_STATEMENT,
        );

        assert.equal(
          challenge.nonce,
          NONCE,
        );

        assert.equal(
          challenge.issuedAt.toISOString(),
          NOW.toISOString(),
        );

        assert.equal(
          challenge.expiresAt.toISOString(),
          '2026-11-08T10:05:00.000Z',
        );

        assert.equal(
          challenge.message,
          [
            AUTH_CHALLENGE_HEADER,
            '',
            DEFAULT_AUTH_STATEMENT,
            '',
            `Domain: ${DOMAIN}`,
            `URI: ${URI}`,
            `Version: ${AUTH_CHALLENGE_VERSION}`,
            `Chain ID: ${ARBITRUM_SEPOLIA_CHAIN_ID}`,
            `Wallet: ${WALLET}`,
            `Challenge ID: ${CHALLENGE_ID}`,
            `Nonce: ${NONCE}`,
            `Issued At: ${NOW.toISOString()}`,
            'Expiration Time: 2026-11-08T10:05:00.000Z',
          ].join('\n'),
        );

        assert.equal(
          repository.createCalls,
          1,
        );
      },
    );

    it(
      'stores nonce hash and message hash instead of plaintext nonce',
      async () => {
        const repository =
          new MemoryChallengeRepository();

        const challenge =
          await issueChallenge(
            repository,
          );

        const stored =
          repository.get(
            challenge.challengeId,
          );

        assert.ok(stored);

        assert.equal(
          stored.nonceHash,
          hashAuthValue(NONCE),
        );

        assert.equal(
          stored.messageHash,
          hashAuthValue(
            challenge.message,
          ),
        );

        assert.equal(
          Object.hasOwn(
            stored,
            'nonce',
          ),
          false,
        );

        assert.equal(
          Object.hasOwn(
            stored,
            'message',
          ),
          false,
        );

        assert.equal(
          stored.status,
          'ACTIVE',
        );

        assert.equal(
          stored.consumedAt,
          null,
        );

        assert.equal(
          stored.revokedAt,
          null,
        );
      },
    );

    it(
      'uses the canonical default TTL of five minutes',
      async () => {
        const repository =
          new MemoryChallengeRepository();

        const challenge =
          await issueChallenge(
            repository,
          );

        assert.equal(
          DEFAULT_CHALLENGE_TTL_SECONDS,
          300,
        );

        assert.equal(
          challenge.expiresAt.getTime() -
            challenge.issuedAt.getTime(),
          300_000,
        );
      },
    );

    it(
      'accepts the minimum challenge TTL',
      async () => {
        const repository =
          new MemoryChallengeRepository();

        const challenge =
          await issueChallenge(
            repository,
            {
              ttlSeconds:
                MIN_CHALLENGE_TTL_SECONDS,
            },
          );

        assert.equal(
          challenge.expiresAt.getTime() -
            challenge.issuedAt.getTime(),
          MIN_CHALLENGE_TTL_SECONDS *
            1_000,
        );
      },
    );

    it(
      'accepts the maximum challenge TTL',
      async () => {
        const repository =
          new MemoryChallengeRepository();

        const challenge =
          await issueChallenge(
            repository,
            {
              ttlSeconds:
                MAX_CHALLENGE_TTL_SECONDS,
            },
          );

        assert.equal(
          challenge.expiresAt.getTime() -
            challenge.issuedAt.getTime(),
          MAX_CHALLENGE_TTL_SECONDS *
            1_000,
        );
      },
    );

    it(
      'rejects a TTL below the canonical minimum',
      async () => {
        const repository =
          new MemoryChallengeRepository();

        await expectDomainError(
          () =>
            issueChallenge(
              repository,
              {
                ttlSeconds:
                  MIN_CHALLENGE_TTL_SECONDS -
                  1,
              },
            ),
          'INVALID_INPUT',
        );
      },
    );

    it(
      'rejects a TTL above five minutes',
      async () => {
        const repository =
          new MemoryChallengeRepository();

        await expectDomainError(
          () =>
            issueChallenge(
              repository,
              {
                ttlSeconds:
                  MAX_CHALLENGE_TTL_SECONDS +
                  1,
              },
            ),
          'INVALID_INPUT',
        );
      },
    );

    it(
      'rejects a fractional TTL',
      async () => {
        const repository =
          new MemoryChallengeRepository();

        await expectDomainError(
          () =>
            issueChallenge(
              repository,
              {
                ttlSeconds:
                  60.5,
              },
            ),
          'INVALID_INPUT',
        );
      },
    );

    it(
      'rejects a chain other than Arbitrum Sepolia',
      async () => {
        const repository =
          new MemoryChallengeRepository();

        await expectDomainError(
          () =>
            issueChallenge(
              repository,
              {
                chainId:
                  1,
              },
            ),
          'WRONG_NETWORK',
        );

        assert.equal(
          repository.createCalls,
          0,
        );
      },
    );

    it(
      'rejects a domain containing a URI scheme',
      async () => {
        const repository =
          new MemoryChallengeRepository();

        await expectDomainError(
          () =>
            issueChallenge(
              repository,
              {
                domain:
                  'http://localhost:3000',
              },
            ),
          'INVALID_INPUT',
        );
      },
    );

    it(
      'rejects a domain that does not match URI host',
      async () => {
        const repository =
          new MemoryChallengeRepository();

        await expectDomainError(
          () =>
            issueChallenge(
              repository,
              {
                domain:
                  'localhost:3000',
                uri:
                  'http://127.0.0.1:3000/',
              },
            ),
          'INVALID_INPUT',
        );
      },
    );

    it(
      'rejects a non-HTTP URI',
      async () => {
        const repository =
          new MemoryChallengeRepository();

        await expectDomainError(
          () =>
            issueChallenge(
              repository,
              {
                domain:
                  'localhost:3000',
                uri:
                  'file://localhost:3000/auth',
              },
            ),
          'INVALID_INPUT',
        );
      },
    );

    it(
      'rejects a URI containing credentials',
      async () => {
        const repository =
          new MemoryChallengeRepository();

        await expectDomainError(
          () =>
            issueChallenge(
              repository,
              {
                uri:
                  'http://user:password@localhost:3000/',
              },
            ),
          'INVALID_INPUT',
        );
      },
    );

    it(
      'removes URI fragment before storing the challenge',
      async () => {
        const repository =
          new MemoryChallengeRepository();

        const challenge =
          await issueChallenge(
            repository,
            {
              uri:
                'http://localhost:3000/auth#fragment',
            },
          );

        assert.equal(
          challenge.uri,
          'http://localhost:3000/auth',
        );
      },
    );

    it(
      'rejects a multiline authentication statement',
      async () => {
        const repository =
          new MemoryChallengeRepository();

        await expectDomainError(
          () =>
            issueChallenge(
              repository,
              {
                statement:
                  'Authenticate\nand move funds',
              },
            ),
          'INVALID_INPUT',
        );
      },
    );

    it(
      'rejects an invalid current Date',
      async () => {
        const repository =
          new MemoryChallengeRepository();

        await expectDomainError(
          () =>
            issueChallenge(
              repository,
              {
                now:
                  new Date(
                    Number.NaN,
                  ),
              },
            ),
          'INVALID_INPUT',
        );
      },
    );

    it(
      'rejects an invalid generated nonce',
      async () => {
        const repository =
          new MemoryChallengeRepository();

        await expectDomainError(
          () =>
            issueWalletAuthChallenge(
              {
                wallet:
                  WALLET,
                chainId:
                  ARBITRUM_SEPOLIA_CHAIN_ID,
                domain:
                  DOMAIN,
                uri:
                  URI,
                now:
                  NOW,
              },
              {
                repository,
                generateChallengeId:
                  () =>
                    CHALLENGE_ID,
                generateNonce:
                  () =>
                    'not-a-valid-nonce',
              },
            ),
          'INVALID_INPUT',
        );
      },
    );

    it(
      'rejects an invalid generated challenge ID',
      async () => {
        const repository =
          new MemoryChallengeRepository();

        await expectDomainError(
          () =>
            issueWalletAuthChallenge(
              {
                wallet:
                  WALLET,
                chainId:
                  ARBITRUM_SEPOLIA_CHAIN_ID,
                domain:
                  DOMAIN,
                uri:
                  URI,
                now:
                  NOW,
              },
              {
                repository,
                generateChallengeId:
                  () =>
                    'short',
                generateNonce:
                  () =>
                    NONCE,
              },
            ),
          'INVALID_INPUT',
        );
      },
    );
  },
);

describe(
  'wallet authentication message construction',
  () => {
    it(
      'produces the same message for identical normalized input',
      () => {
        const input = {
          challengeId:
            CHALLENGE_ID,
          wallet:
            WALLET,
          chainId:
            ARBITRUM_SEPOLIA_CHAIN_ID,
          domain:
            DOMAIN,
          uri:
            URI,
          statement:
            DEFAULT_AUTH_STATEMENT,
          nonce:
            NONCE,
          issuedAt:
            NOW,
          expiresAt:
            new Date(
              '2026-11-08T10:05:00.000Z',
            ),
        };

        assert.equal(
          buildWalletAuthMessage(
            input,
          ),
          buildWalletAuthMessage(
            input,
          ),
        );
      },
    );

    it(
      'changes when wallet changes',
      () => {
        const baseInput = {
          challengeId:
            CHALLENGE_ID,
          wallet:
            WALLET,
          chainId:
            ARBITRUM_SEPOLIA_CHAIN_ID,
          domain:
            DOMAIN,
          uri:
            URI,
          statement:
            DEFAULT_AUTH_STATEMENT,
          nonce:
            NONCE,
          issuedAt:
            NOW,
          expiresAt:
            new Date(
              '2026-11-08T10:05:00.000Z',
            ),
        };

        const original =
          buildWalletAuthMessage(
            baseInput,
          );

        const changed =
          buildWalletAuthMessage({
            ...baseInput,
            wallet:
              OTHER_WALLET,
          });

        assert.notEqual(
          original,
          changed,
        );
      },
    );

    it(
      'changes when nonce changes',
      () => {
        const baseInput = {
          challengeId:
            CHALLENGE_ID,
          wallet:
            WALLET,
          chainId:
            ARBITRUM_SEPOLIA_CHAIN_ID,
          domain:
            DOMAIN,
          uri:
            URI,
          statement:
            DEFAULT_AUTH_STATEMENT,
          nonce:
            NONCE,
          issuedAt:
            NOW,
          expiresAt:
            new Date(
              '2026-11-08T10:05:00.000Z',
            ),
        };

        const original =
          buildWalletAuthMessage(
            baseInput,
          );

        const changed =
          buildWalletAuthMessage({
            ...baseInput,
            nonce:
              '2222222222222222222222222222222222222222222222222222222222222222',
          });

        assert.notEqual(
          original,
          changed,
        );
      },
    );

    it(
      'rejects expiration before issue time',
      () => {
        assert.throws(
          () =>
            buildWalletAuthMessage({
              challengeId:
                CHALLENGE_ID,
              wallet:
                WALLET,
              chainId:
                ARBITRUM_SEPOLIA_CHAIN_ID,
              domain:
                DOMAIN,
              uri:
                URI,
              statement:
                DEFAULT_AUTH_STATEMENT,
              nonce:
                NONCE,
              issuedAt:
                NOW,
              expiresAt:
                new Date(
                  NOW.getTime() -
                    1,
                ),
            }),
          DomainError,
        );
      },
    );
  },
);

describe(
  'stored authentication challenge',
  () => {
    it(
      'creates an ACTIVE stored challenge with defensive Date copies',
      async () => {
        const repository =
          new MemoryChallengeRepository();

        const challenge =
          await issueChallenge(
            repository,
          );

        const stored =
          createStoredChallenge(
            challenge,
          );

        assert.equal(
          stored.status,
          'ACTIVE',
        );

        assert.equal(
          stored.consumedAt,
          null,
        );

        assert.equal(
          stored.revokedAt,
          null,
        );

        assert.notEqual(
          stored.issuedAt,
          challenge.issuedAt,
        );

        assert.notEqual(
          stored.expiresAt,
          challenge.expiresAt,
        );

        assert.equal(
          stored.issuedAt.getTime(),
          challenge.issuedAt.getTime(),
        );

        assert.equal(
          stored.expiresAt.getTime(),
          challenge.expiresAt.getTime(),
        );
      },
    );
  },
);

describe(
  'wallet authentication challenge verification',
  () => {
    it(
      'verifies a valid signature and consumes the challenge',
      async () => {
        const repository =
          new MemoryChallengeRepository();

        const challenge =
          await issueChallenge(
            repository,
          );

        const verified =
          await verifyWalletAuthChallenge(
            {
              challengeId:
                challenge.challengeId,
              wallet:
                challenge.wallet,
              chainId:
                challenge.chainId,
              message:
                challenge.message,
              signature:
                SIGNATURE,
              domain:
                challenge.domain,
              uri:
                challenge.uri,
              now:
                new Date(
                  '2026-11-08T10:01:00.000Z',
                ),
            },
            {
              repository,
              verifySignature:
                validSignatureVerifier(),
            },
          );

        assert.deepEqual(
          verified,
          {
            challengeId:
              CHALLENGE_ID,
            wallet:
              WALLET,
            chainId:
              ARBITRUM_SEPOLIA_CHAIN_ID,
            verifiedAt:
              new Date(
                '2026-11-08T10:01:00.000Z',
              ),
          },
        );

        assert.equal(
          repository.consumeCalls,
          1,
        );

        const stored =
          repository.get(
            CHALLENGE_ID,
          );

        assert.equal(
          stored?.status,
          'CONSUMED',
        );

        assert.equal(
          stored?.consumedAt?.toISOString(),
          '2026-11-08T10:01:00.000Z',
        );
      },
    );

    it(
      'rejects an unknown challenge ID',
      async () => {
        const repository =
          new MemoryChallengeRepository();

        await expectDomainError(
          () =>
            verifyWalletAuthChallenge(
              {
                challengeId:
                  CHALLENGE_ID,
                wallet:
                  WALLET,
                chainId:
                  ARBITRUM_SEPOLIA_CHAIN_ID,
                message:
                  'unknown',
                signature:
                  SIGNATURE,
                domain:
                  DOMAIN,
                uri:
                  URI,
                now:
                  NOW,
              },
              {
                repository,
                verifySignature:
                  validSignatureVerifier(),
              },
            ),
          'UNAUTHENTICATED',
        );
      },
    );

    it(
      'rejects a challenge used by another wallet',
      async () => {
        const repository =
          new MemoryChallengeRepository();

        const challenge =
          await issueChallenge(
            repository,
          );

        await expectDomainError(
          () =>
            verifyWalletAuthChallenge(
              {
                challengeId:
                  challenge.challengeId,
                wallet:
                  OTHER_WALLET,
                chainId:
                  challenge.chainId,
                message:
                  challenge.message,
                signature:
                  SIGNATURE,
                domain:
                  challenge.domain,
                uri:
                  challenge.uri,
                now:
                  new Date(
                    '2026-11-08T10:01:00.000Z',
                  ),
              },
              {
                repository,
                verifySignature:
                  validSignatureVerifier(),
              },
            ),
          'UNAUTHENTICATED',
        );

        assert.equal(
          repository.consumeCalls,
          0,
        );
      },
    );

    it(
      'rejects the wrong chain',
      async () => {
        const repository =
          new MemoryChallengeRepository();

        const challenge =
          await issueChallenge(
            repository,
          );

        await expectDomainError(
          () =>
            verifyWalletAuthChallenge(
              {
                challengeId:
                  challenge.challengeId,
                wallet:
                  challenge.wallet,
                chainId:
                  1,
                message:
                  challenge.message,
                signature:
                  SIGNATURE,
                domain:
                  challenge.domain,
                uri:
                  challenge.uri,
                now:
                  new Date(
                    '2026-11-08T10:01:00.000Z',
                  ),
              },
              {
                repository,
                verifySignature:
                  validSignatureVerifier(),
              },
            ),
          'WRONG_NETWORK',
        );
      },
    );

    it(
      'rejects a different domain',
      async () => {
        const repository =
          new MemoryChallengeRepository();

        const challenge =
          await issueChallenge(
            repository,
          );

        await expectDomainError(
          () =>
            verifyWalletAuthChallenge(
              {
                challengeId:
                  challenge.challengeId,
                wallet:
                  challenge.wallet,
                chainId:
                  challenge.chainId,
                message:
                  challenge.message,
                signature:
                  SIGNATURE,
                domain:
                  '127.0.0.1:3000',
                uri:
                  'http://127.0.0.1:3000/',
                now:
                  new Date(
                    '2026-11-08T10:01:00.000Z',
                  ),
              },
              {
                repository,
                verifySignature:
                  validSignatureVerifier(),
              },
            ),
          'UNAUTHENTICATED',
        );
      },
    );

    it(
      'rejects a different URI on the same domain',
      async () => {
        const repository =
          new MemoryChallengeRepository();

        const challenge =
          await issueChallenge(
            repository,
          );

        await expectDomainError(
          () =>
            verifyWalletAuthChallenge(
              {
                challengeId:
                  challenge.challengeId,
                wallet:
                  challenge.wallet,
                chainId:
                  challenge.chainId,
                message:
                  challenge.message,
                signature:
                  SIGNATURE,
                domain:
                  challenge.domain,
                uri:
                  'http://localhost:3000/different',
                now:
                  new Date(
                    '2026-11-08T10:01:00.000Z',
                  ),
              },
              {
                repository,
                verifySignature:
                  validSignatureVerifier(),
              },
            ),
          'UNAUTHENTICATED',
        );
      },
    );

    it(
      'rejects a modified message before signature verification',
      async () => {
        const repository =
          new MemoryChallengeRepository();

        const challenge =
          await issueChallenge(
            repository,
          );

        let verificationCalled =
          false;

        await expectDomainError(
          () =>
            verifyWalletAuthChallenge(
              {
                challengeId:
                  challenge.challengeId,
                wallet:
                  challenge.wallet,
                chainId:
                  challenge.chainId,
                message:
                  `${challenge.message}\nModified`,
                signature:
                  SIGNATURE,
                domain:
                  challenge.domain,
                uri:
                  challenge.uri,
                now:
                  new Date(
                    '2026-11-08T10:01:00.000Z',
                  ),
              },
              {
                repository,
                verifySignature:
                  async () => {
                    verificationCalled =
                      true;

                    return true;
                  },
              },
            ),
          'UNAUTHENTICATED',
        );

        assert.equal(
          verificationCalled,
          false,
        );

        assert.equal(
          repository.consumeCalls,
          0,
        );
      },
    );

    it(
      'rejects an invalid signature',
      async () => {
        const repository =
          new MemoryChallengeRepository();

        const challenge =
          await issueChallenge(
            repository,
          );

        await expectDomainError(
          () =>
            verifyWalletAuthChallenge(
              {
                challengeId:
                  challenge.challengeId,
                wallet:
                  challenge.wallet,
                chainId:
                  challenge.chainId,
                message:
                  challenge.message,
                signature:
                  SIGNATURE,
                domain:
                  challenge.domain,
                uri:
                  challenge.uri,
                now:
                  new Date(
                    '2026-11-08T10:01:00.000Z',
                  ),
              },
              {
                repository,
                verifySignature:
                  invalidSignatureVerifier(),
              },
            ),
          'INVALID_SIGNATURE',
        );

        assert.equal(
          repository.consumeCalls,
          0,
        );
      },
    );

    it(
      'converts signature verifier failures to INVALID_SIGNATURE',
      async () => {
        const repository =
          new MemoryChallengeRepository();

        const challenge =
          await issueChallenge(
            repository,
          );

        await expectDomainError(
          () =>
            verifyWalletAuthChallenge(
              {
                challengeId:
                  challenge.challengeId,
                wallet:
                  challenge.wallet,
                chainId:
                  challenge.chainId,
                message:
                  challenge.message,
                signature:
                  SIGNATURE,
                domain:
                  challenge.domain,
                uri:
                  challenge.uri,
                now:
                  new Date(
                    '2026-11-08T10:01:00.000Z',
                  ),
              },
              {
                repository,
                verifySignature:
                  async () => {
                    throw new Error(
                      'Verifier failed',
                    );
                  },
              },
            ),
          'INVALID_SIGNATURE',
        );
      },
    );

    it(
      'rejects the challenge exactly at expiration time',
      async () => {
        const repository =
          new MemoryChallengeRepository();

        const challenge =
          await issueChallenge(
            repository,
          );

        await expectDomainError(
          () =>
            verifyWalletAuthChallenge(
              {
                challengeId:
                  challenge.challengeId,
                wallet:
                  challenge.wallet,
                chainId:
                  challenge.chainId,
                message:
                  challenge.message,
                signature:
                  SIGNATURE,
                domain:
                  challenge.domain,
                uri:
                  challenge.uri,
                now:
                  new Date(
                    challenge.expiresAt.getTime(),
                  ),
              },
              {
                repository,
                verifySignature:
                  validSignatureVerifier(),
              },
            ),
          'SIGNATURE_EXPIRED',
        );

        assert.equal(
          repository.consumeCalls,
          0,
        );
      },
    );

    it(
      'rejects replay after successful consumption',
      async () => {
        const repository =
          new MemoryChallengeRepository();

        const challenge =
          await issueChallenge(
            repository,
          );

        const verificationInput = {
          challengeId:
            challenge.challengeId,
          wallet:
            challenge.wallet,
          chainId:
            challenge.chainId,
          message:
            challenge.message,
          signature:
            SIGNATURE,
          domain:
            challenge.domain,
          uri:
            challenge.uri,
          now:
            new Date(
              '2026-11-08T10:01:00.000Z',
            ),
        };

        await verifyWalletAuthChallenge(
          verificationInput,
          {
            repository,
            verifySignature:
              validSignatureVerifier(),
          },
        );

        await expectDomainError(
          () =>
            verifyWalletAuthChallenge(
              {
                ...verificationInput,
                now:
                  new Date(
                    '2026-11-08T10:01:01.000Z',
                  ),
              },
              {
                repository,
                verifySignature:
                  validSignatureVerifier(),
              },
            ),
          'ALREADY_PROCESSED',
        );
      },
    );

    it(
      'allows only one consume winner during concurrent verification',
      async () => {
        const repository =
          new MemoryChallengeRepository();

        const challenge =
          await issueChallenge(
            repository,
          );

        const input = {
          challengeId:
            challenge.challengeId,
          wallet:
            challenge.wallet,
          chainId:
            challenge.chainId,
          message:
            challenge.message,
          signature:
            SIGNATURE,
          domain:
            challenge.domain,
          uri:
            challenge.uri,
          now:
            new Date(
              '2026-11-08T10:01:00.000Z',
            ),
        };

        const results =
          await Promise.allSettled([
            verifyWalletAuthChallenge(
              input,
              {
                repository,
                verifySignature:
                  validSignatureVerifier(),
              },
            ),
            verifyWalletAuthChallenge(
              input,
              {
                repository,
                verifySignature:
                  validSignatureVerifier(),
              },
            ),
          ]);

        const fulfilled =
          results.filter(
            result =>
              result.status ===
              'fulfilled',
          );

        const rejected =
          results.filter(
            result =>
              result.status ===
              'rejected',
          );

        assert.equal(
          fulfilled.length,
          1,
        );

        assert.equal(
          rejected.length,
          1,
        );

        const rejectedReason =
          rejected[0];

        assert.equal(
          rejectedReason?.status,
          'rejected',
        );

        if (
          rejectedReason?.status ===
          'rejected'
        ) {
          assert.equal(
            rejectedReason.reason
              instanceof DomainError,
            true,
          );

          assert.equal(
            rejectedReason.reason.code,
            'ALREADY_PROCESSED',
          );
        }
      },
    );

    it(
      'rejects a challenge whose stored status is EXPIRED',
      async () => {
        const repository =
          new MemoryChallengeRepository();

        const challenge =
          await issueChallenge(
            repository,
          );

        const stored =
          repository.get(
            challenge.challengeId,
          );

        assert.ok(stored);

        repository.seed({
          ...stored,
          status:
            'EXPIRED',
        });

        await expectDomainError(
          () =>
            verifyWalletAuthChallenge(
              {
                challengeId:
                  challenge.challengeId,
                wallet:
                  challenge.wallet,
                chainId:
                  challenge.chainId,
                message:
                  challenge.message,
                signature:
                  SIGNATURE,
                domain:
                  challenge.domain,
                uri:
                  challenge.uri,
                now:
                  new Date(
                    '2026-11-08T10:01:00.000Z',
                  ),
              },
              {
                repository,
                verifySignature:
                  validSignatureVerifier(),
              },
            ),
          'SIGNATURE_EXPIRED',
        );
      },
    );

    it(
      'rejects a revoked challenge',
      async () => {
        const repository =
          new MemoryChallengeRepository();

        const challenge =
          await issueChallenge(
            repository,
          );

        const revoked =
          await revokeWalletAuthChallenge(
            {
              challengeId:
                challenge.challengeId,
              now:
                new Date(
                  '2026-11-08T10:01:00.000Z',
                ),
            },
            repository,
          );

        assert.equal(
          revoked,
          true,
        );

        await expectDomainError(
          () =>
            verifyWalletAuthChallenge(
              {
                challengeId:
                  challenge.challengeId,
                wallet:
                  challenge.wallet,
                chainId:
                  challenge.chainId,
                message:
                  challenge.message,
                signature:
                  SIGNATURE,
                domain:
                  challenge.domain,
                uri:
                  challenge.uri,
                now:
                  new Date(
                    '2026-11-08T10:02:00.000Z',
                  ),
              },
              {
                repository,
                verifySignature:
                  validSignatureVerifier(),
              },
            ),
          'UNAUTHENTICATED',
        );
      },
    );
  },
);

describe(
  'authentication challenge revocation',
  () => {
    it(
      'revokes an active challenge',
      async () => {
        const repository =
          new MemoryChallengeRepository();

        const challenge =
          await issueChallenge(
            repository,
          );

        const revoked =
          await revokeWalletAuthChallenge(
            {
              challengeId:
                challenge.challengeId,
              now:
                new Date(
                  '2026-11-08T10:02:00.000Z',
                ),
            },
            repository,
          );

        assert.equal(
          revoked,
          true,
        );

        assert.equal(
          repository.revokeCalls,
          1,
        );

        const stored =
          repository.get(
            challenge.challengeId,
          );

        assert.equal(
          stored?.status,
          'REVOKED',
        );

        assert.equal(
          stored?.revokedAt?.toISOString(),
          '2026-11-08T10:02:00.000Z',
        );
      },
    );

    it(
      'does not revoke an unknown challenge',
      async () => {
        const repository =
          new MemoryChallengeRepository();

        const revoked =
          await revokeWalletAuthChallenge(
            {
              challengeId:
                CHALLENGE_ID,
              now:
                NOW,
            },
            repository,
          );

        assert.equal(
          revoked,
          false,
        );
      },
    );

    it(
      'does not revoke an already consumed challenge',
      async () => {
        const repository =
          new MemoryChallengeRepository();

        const challenge =
          await issueChallenge(
            repository,
          );

        await verifyWalletAuthChallenge(
          {
            challengeId:
              challenge.challengeId,
            wallet:
              challenge.wallet,
            chainId:
              challenge.chainId,
            message:
              challenge.message,
            signature:
              SIGNATURE,
            domain:
              challenge.domain,
            uri:
              challenge.uri,
            now:
              new Date(
                '2026-11-08T10:01:00.000Z',
              ),
          },
          {
            repository,
            verifySignature:
              validSignatureVerifier(),
          },
        );

        const revoked =
          await revokeWalletAuthChallenge(
            {
              challengeId:
                challenge.challengeId,
              now:
                new Date(
                  '2026-11-08T10:02:00.000Z',
                ),
            },
            repository,
          );

        assert.equal(
          revoked,
          false,
        );
      },
    );
  },
);
