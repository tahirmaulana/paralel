// @file packages/domain/test/errors.test.ts

import assert from 'node:assert/strict';
import {
  describe,
  it,
} from 'node:test';

import {
  DomainError,
  assertDomain,
  createDomainError,
  defaultDomainErrorMessage,
  defaultDomainErrorRetryable,
  isDomainError,
  isDomainErrorCode,
  normalizeDomainError,
  serializeDomainError,
} from '../src/errors';

describe(
  'domain errors',
  () => {
    it(
      'recognizes canonical error codes',
      () => {
        assert.equal(
          isDomainErrorCode(
            'INVALID_INPUT',
          ),
          true,
        );

        assert.equal(
          isDomainErrorCode(
            'RPC_UNAVAILABLE',
          ),
          true,
        );

        assert.equal(
          isDomainErrorCode(
            'UNKNOWN_ERROR',
          ),
          false,
        );

        assert.equal(
          isDomainErrorCode(null),
          false,
        );
      },
    );

    it(
      'uses canonical default messages',
      () => {
        assert.equal(
          defaultDomainErrorMessage(
            'AUCTION_NOT_FOUND',
          ),
          'The requested auction was not found.',
        );

        assert.equal(
          defaultDomainErrorMessage(
            'PROJECTION_PENDING',
          ),
          'The blockchain transaction is confirmed but its projection is pending.',
        );
      },
    );

    it(
      'marks only temporary failures retryable by default',
      () => {
        assert.equal(
          defaultDomainErrorRetryable(
            'RPC_UNAVAILABLE',
          ),
          true,
        );

        assert.equal(
          defaultDomainErrorRetryable(
            'PROJECTION_PENDING',
          ),
          true,
        );

        assert.equal(
          defaultDomainErrorRetryable(
            'INVALID_SIGNATURE',
          ),
          false,
        );

        assert.equal(
          defaultDomainErrorRetryable(
            'TRANSACTION_REVERTED',
          ),
          false,
        );
      },
    );

    it(
      'creates a serializable DomainError',
      () => {
        const error =
          new DomainError(
            'AUCTION_STATE_CHANGED',
            'Auction is no longer pending.',
            {
              correlationId:
                'req_001',
              details: {
                auctionCode:
                  'AUC001',
                previousStatus:
                  'PENDING',
                receivedStatus:
                  'REGISTERING',
              },
            },
          );

        assert.equal(
          error.name,
          'DomainError',
        );

        assert.equal(
          error.code,
          'AUCTION_STATE_CHANGED',
        );

        assert.equal(
          error.retryable,
          false,
        );

        assert.equal(
          error.correlationId,
          'req_001',
        );

        assert.deepEqual(
          error.toJSON(),
          {
            code:
              'AUCTION_STATE_CHANGED',
            message:
              'Auction is no longer pending.',
            retryable:
              false,
            correlationId:
              'req_001',
            details: {
              auctionCode:
                'AUC001',
              previousStatus:
                'PENDING',
              receivedStatus:
                'REGISTERING',
            },
          },
        );
      },
    );

    it(
      'does not serialize the internal cause',
      () => {
        const cause =
          new Error(
            'internal database failure',
          );

        const error =
          new DomainError(
            'RPC_UNAVAILABLE',
            undefined,
            {
              cause,
            },
          );

        assert.equal(
          error.cause,
          cause,
        );

        assert.equal(
          Object.hasOwn(
            error.toJSON(),
            'cause',
          ),
          false,
        );
      },
    );

    it(
      'creates errors through the factory',
      () => {
        const error =
          createDomainError(
            'PARTNER_INACTIVE',
          );

        assert.equal(
          isDomainError(error),
          true,
        );

        assert.equal(
          error.message,
          'The selected partner is inactive.',
        );
      },
    );

    it(
      'preserves an existing DomainError during normalization',
      () => {
        const source =
          new DomainError(
            'INVALID_INPUT',
          );

        const normalized =
          normalizeDomainError(
            source,
            'RPC_UNAVAILABLE',
          );

        assert.equal(
          normalized,
          source,
        );
      },
    );

    it(
      'adds correlation ID during normalization when absent',
      () => {
        const source =
          new DomainError(
            'INVALID_INPUT',
          );

        const normalized =
          normalizeDomainError(
            source,
            'RPC_UNAVAILABLE',
            {
              correlationId:
                'req_002',
            },
          );

        assert.notEqual(
          normalized,
          source,
        );

        assert.equal(
          normalized.code,
          'INVALID_INPUT',
        );

        assert.equal(
          normalized.correlationId,
          'req_002',
        );
      },
    );

    it(
      'hides unknown internal errors behind a non-RPC fallback code',
      () => {
        const internalError =
          new Error(
            'database password leaked',
          );

        const normalized =
          normalizeDomainError(
            internalError,
            'INTERNAL_SERVER_ERROR',
            {
              correlationId:
                'req_003',
            },
          );

        assert.equal(
          normalized.code,
          'INTERNAL_SERVER_ERROR',
        );

        assert.equal(
          normalized.message,
          'An unexpected server error occurred.',
        );

        assert.equal(
          normalized.retryable,
          false,
        );

        assert.equal(
          normalized.cause,
          internalError,
        );

        assert.equal(
          normalized.toJSON().message.includes(
            'password',
          ),
          false,
        );
      },
    );

    it(
      'serializes the canonical API envelope',
      () => {
        const error =
          new DomainError(
            'SESSION_EXPIRED',
          );

        assert.deepEqual(
          serializeDomainError(
            error,
          ),
          {
            error: {
              code:
                'SESSION_EXPIRED',
              message:
                'The wallet session has expired.',
              retryable:
                false,
            },
          },
        );
      },
    );

    it(
      'assertDomain does nothing for a true condition',
      () => {
        assert.doesNotThrow(
          () => {
            assertDomain(
              true,
              'INVALID_INPUT',
            );
          },
        );
      },
    );

    it(
      'assertDomain throws DomainError for a false condition',
      () => {
        assert.throws(
          () => {
            assertDomain(
              false,
              'RESOURCE_FORBIDDEN',
              'Wallet cannot access this auction.',
              {
                details: {
                  auctionCode:
                    'AUC002',
                },
              },
            );
          },
          (
            error: unknown,
          ) => {
            assert.equal(
              isDomainError(error),
              true,
            );

            if (
              !isDomainError(error)
            ) {
              return false;
            }

            assert.equal(
              error.code,
              'RESOURCE_FORBIDDEN',
            );

            assert.equal(
              error.message,
              'Wallet cannot access this auction.',
            );

            return true;
          },
        );
      },
    );
  },
);
