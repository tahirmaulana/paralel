// @file packages/domain/test/effective-status.test.ts

import assert from 'node:assert/strict';
import {
  describe,
  it,
} from 'node:test';

import {
  ContractAuctionStatus,
} from '@paralel/contracts';

import {
  contractStatusToName,
  isBiddableEffectiveStatus,
  isContractAuctionStatus,
  isDatabaseAuctionStatus,
  isPreChainAuctionStatus,
  isPublicAuctionStatus,
  isRegisteredAuctionStatus,
  isTerminalAuctionStatus,
  resolveEffectiveAuctionStatus,
  resolveEffectiveStatusName,
} from '../src/effective-status';

import {
  DomainError,
} from '../src/errors';

const OPEN_AT =
  new Date('2026-11-10T10:00:00.000Z');

const CLOSE_AT =
  new Date('2026-11-11T10:00:00.000Z');

function expectDomainError(
  action: () => unknown,
  expectedCode: DomainError['code'],
): void {
  assert.throws(
    action,
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

describe(
  'effective auction status',
  () => {
    it(
      'recognizes database auction statuses',
      () => {
        assert.equal(
          isDatabaseAuctionStatus(
            'CREATED',
          ),
          true,
        );

        assert.equal(
          isDatabaseAuctionStatus(
            'CLAIM_PERIOD',
          ),
          true,
        );

        assert.equal(
          isDatabaseAuctionStatus(
            'UNKNOWN',
          ),
          false,
        );

        assert.equal(
          isDatabaseAuctionStatus(1),
          false,
        );
      },
    );

    it(
      'recognizes pre-chain and registered statuses',
      () => {
        assert.equal(
          isPreChainAuctionStatus(
            'PENDING',
          ),
          true,
        );

        assert.equal(
          isPreChainAuctionStatus(
            'REGISTERING',
          ),
          true,
        );

        assert.equal(
          isPreChainAuctionStatus(
            'SCHEDULED',
          ),
          false,
        );

        assert.equal(
          isRegisteredAuctionStatus(
            'SCHEDULED',
          ),
          true,
        );

        assert.equal(
          isRegisteredAuctionStatus(
            'AWARDING',
          ),
          true,
        );

        assert.equal(
          isRegisteredAuctionStatus(
            'CANCELED',
          ),
          false,
        );
      },
    );

    it(
      'recognizes valid contract statuses',
      () => {
        assert.equal(
          isContractAuctionStatus(
            ContractAuctionStatus.SCHEDULED,
          ),
          true,
        );

        assert.equal(
          isContractAuctionStatus(
            ContractAuctionStatus.WITHDRAWN,
          ),
          true,
        );

        assert.equal(
          isContractAuctionStatus(99),
          false,
        );

        assert.equal(
          isContractAuctionStatus(
            'SCHEDULED',
          ),
          false,
        );
      },
    );

    it(
      'keeps CREATED as a database pre-chain status',
      () => {
        const result =
          resolveEffectiveAuctionStatus({
            databaseStatus:
              'CREATED',
            now:
              new Date(
                '2026-11-09T10:00:00.000Z',
              ),
          });

        assert.equal(
          result.effectiveStatus,
          'CREATED',
        );

        assert.equal(
          result.contractStatus,
          null,
        );

        assert.equal(
          result.isPreChain,
          true,
        );

        assert.equal(
          result.isRegistered,
          false,
        );

        assert.equal(
          result.isTimeDerived,
          false,
        );
      },
    );

    it(
      'keeps all terminal pre-chain statuses from the database',
      () => {
        for (
          const databaseStatus
          of [
            'REJECTED',
            'CANCELED',
            'REGISTRATION_FAILED',
          ] as const
        ) {
          const result =
            resolveEffectiveAuctionStatus({
              databaseStatus,
              contractStatus:
                ContractAuctionStatus.SCHEDULED,
              openAt:
                OPEN_AT,
              closeAt:
                CLOSE_AT,
              now:
                new Date(
                  '2026-11-10T12:00:00.000Z',
                ),
            });

          assert.equal(
            result.effectiveStatus,
            databaseStatus,
          );

          assert.equal(
            result.contractStatus,
            null,
          );

          assert.equal(
            result.isPreChain,
            true,
          );
        }
      },
    );

    it(
      'returns SCHEDULED immediately before openAt',
      () => {
        const result =
          resolveEffectiveAuctionStatus({
            databaseStatus:
              'SCHEDULED',
            contractStatus:
              ContractAuctionStatus.SCHEDULED,
            openAt:
              OPEN_AT,
            closeAt:
              CLOSE_AT,
            now:
              new Date(
                '2026-11-10T09:59:59.999Z',
              ),
          });

        assert.equal(
          result.effectiveStatus,
          'SCHEDULED',
        );

        assert.equal(
          result.isTimeDerived,
          false,
        );
      },
    );

    it(
      'returns OPEN exactly at openAt',
      () => {
        const result =
          resolveEffectiveAuctionStatus({
            databaseStatus:
              'SCHEDULED',
            contractStatus:
              ContractAuctionStatus.SCHEDULED,
            openAt:
              OPEN_AT,
            closeAt:
              CLOSE_AT,
            now:
              new Date(
                OPEN_AT.getTime(),
              ),
          });

        assert.equal(
          result.effectiveStatus,
          'OPEN',
        );

        assert.equal(
          result.isTimeDerived,
          true,
        );
      },
    );

    it(
      'returns OPEN immediately before closeAt',
      () => {
        const result =
          resolveEffectiveAuctionStatus({
            databaseStatus:
              'SCHEDULED',
            contractStatus:
              ContractAuctionStatus.SCHEDULED,
            openAt:
              OPEN_AT,
            closeAt:
              CLOSE_AT,
            now:
              new Date(
                CLOSE_AT.getTime() - 1,
              ),
          });

        assert.equal(
          result.effectiveStatus,
          'OPEN',
        );
      },
    );

    it(
      'returns CLOSED exactly at closeAt',
      () => {
        const result =
          resolveEffectiveAuctionStatus({
            databaseStatus:
              'SCHEDULED',
            contractStatus:
              ContractAuctionStatus.SCHEDULED,
            openAt:
              OPEN_AT,
            closeAt:
              CLOSE_AT,
            now:
              new Date(
                CLOSE_AT.getTime(),
              ),
          });

        assert.equal(
          result.effectiveStatus,
          'CLOSED',
        );

        assert.equal(
          result.isTimeDerived,
          true,
        );
      },
    );

    it(
      'returns AWAITING_KEEPER after closeAt when requested',
      () => {
        const result =
          resolveEffectiveAuctionStatus({
            databaseStatus:
              'SCHEDULED',
            contractStatus:
              ContractAuctionStatus.SCHEDULED,
            openAt:
              OPEN_AT,
            closeAt:
              CLOSE_AT,
            now:
              new Date(
                '2026-11-11T10:00:01.000Z',
              ),
            exposeAwaitingKeeper:
              true,
          });

        assert.equal(
          result.effectiveStatus,
          'AWAITING_KEEPER',
        );

        assert.equal(
          result.isTimeDerived,
          true,
        );
      },
    );

    it(
      'does not trust stale contract OPEN after closeAt',
      () => {
        const result =
          resolveEffectiveAuctionStatus({
            databaseStatus:
              'OPEN',
            contractStatus:
              ContractAuctionStatus.OPEN,
            openAt:
              OPEN_AT,
            closeAt:
              CLOSE_AT,
            now:
              new Date(
                '2026-11-11T11:00:00.000Z',
              ),
          });

        assert.equal(
          result.effectiveStatus,
          'CLOSED',
        );
      },
    );

    it(
      'derives OPEN even when database status remains SCHEDULED',
      () => {
        const result =
          resolveEffectiveAuctionStatus({
            databaseStatus:
              'SCHEDULED',
            contractStatus:
              ContractAuctionStatus.SCHEDULED,
            openAt:
              OPEN_AT,
            closeAt:
              CLOSE_AT,
            now:
              new Date(
                '2026-11-10T12:00:00.000Z',
              ),
          });

        assert.equal(
          result.databaseStatus,
          'SCHEDULED',
        );

        assert.equal(
          result.effectiveStatus,
          'OPEN',
        );
      },
    );

    it(
      'follows contract status from AWARDING onward',
      () => {
        const cases = [
          [
            ContractAuctionStatus.AWARDING,
            'AWARDING',
          ],
          [
            ContractAuctionStatus.COLLECTION,
            'COLLECTION',
          ],
          [
            ContractAuctionStatus.CLAIM_PERIOD,
            'CLAIM_PERIOD',
          ],
          [
            ContractAuctionStatus.SETTLED,
            'SETTLED',
          ],
          [
            ContractAuctionStatus.PASSED_IN,
            'PASSED_IN',
          ],
          [
            ContractAuctionStatus.WITHDRAWN,
            'WITHDRAWN',
          ],
        ] as const;

        for (
          const [
            contractStatus,
            expectedStatus,
          ] of cases
        ) {
          const result =
            resolveEffectiveAuctionStatus({
              databaseStatus:
                expectedStatus,
              contractStatus,
              openAt:
                OPEN_AT,
              closeAt:
                CLOSE_AT,
              now:
                new Date(
                  '2026-12-01T00:00:00.000Z',
                ),
            });

          assert.equal(
            result.effectiveStatus,
            expectedStatus,
          );

          assert.equal(
            result.isTimeDerived,
            false,
          );

          assert.equal(
            result.isRegistered,
            true,
          );
        }
      },
    );

    it(
      'maps every contract status to its canonical name',
      () => {
        assert.equal(
          contractStatusToName(
            ContractAuctionStatus.SCHEDULED,
          ),
          'SCHEDULED',
        );

        assert.equal(
          contractStatusToName(
            ContractAuctionStatus.OPEN,
          ),
          'OPEN',
        );

        assert.equal(
          contractStatusToName(
            ContractAuctionStatus.CLOSED,
          ),
          'CLOSED',
        );

        assert.equal(
          contractStatusToName(
            ContractAuctionStatus.AWARDING,
          ),
          'AWARDING',
        );

        assert.equal(
          contractStatusToName(
            ContractAuctionStatus.COLLECTION,
          ),
          'COLLECTION',
        );

        assert.equal(
          contractStatusToName(
            ContractAuctionStatus.CLAIM_PERIOD,
          ),
          'CLAIM_PERIOD',
        );

        assert.equal(
          contractStatusToName(
            ContractAuctionStatus.SETTLED,
          ),
          'SETTLED',
        );

        assert.equal(
          contractStatusToName(
            ContractAuctionStatus.PASSED_IN,
          ),
          'PASSED_IN',
        );

        assert.equal(
          contractStatusToName(
            ContractAuctionStatus.WITHDRAWN,
          ),
          'WITHDRAWN',
        );
      },
    );

    it(
      'throws PROJECTION_PENDING when registered status has no contract status',
      () => {
        expectDomainError(
          () =>
            resolveEffectiveAuctionStatus({
              databaseStatus:
                'SCHEDULED',
              openAt:
                OPEN_AT,
              closeAt:
                CLOSE_AT,
              now:
                new Date(
                  '2026-11-10T12:00:00.000Z',
                ),
            }),
          'PROJECTION_PENDING',
        );
      },
    );

    it(
      'throws PROJECTION_PENDING when openAt is missing',
      () => {
        expectDomainError(
          () =>
            resolveEffectiveAuctionStatus({
              databaseStatus:
                'SCHEDULED',
              contractStatus:
                ContractAuctionStatus.SCHEDULED,
              closeAt:
                CLOSE_AT,
              now:
                new Date(
                  '2026-11-10T12:00:00.000Z',
                ),
            }),
          'PROJECTION_PENDING',
        );
      },
    );

    it(
      'throws PROJECTION_PENDING when closeAt is missing',
      () => {
        expectDomainError(
          () =>
            resolveEffectiveAuctionStatus({
              databaseStatus:
                'SCHEDULED',
              contractStatus:
                ContractAuctionStatus.SCHEDULED,
              openAt:
                OPEN_AT,
              now:
                new Date(
                  '2026-11-10T12:00:00.000Z',
                ),
            }),
          'PROJECTION_PENDING',
        );
      },
    );

    it(
      'throws INVALID_INPUT when closeAt is not later than openAt',
      () => {
        expectDomainError(
          () =>
            resolveEffectiveAuctionStatus({
              databaseStatus:
                'SCHEDULED',
              contractStatus:
                ContractAuctionStatus.SCHEDULED,
              openAt:
                OPEN_AT,
              closeAt:
                new Date(
                  OPEN_AT.getTime(),
                ),
              now:
                new Date(
                  '2026-11-10T12:00:00.000Z',
                ),
            }),
          'INVALID_INPUT',
        );
      },
    );

    it(
      'throws INVALID_INPUT for invalid now timestamp',
      () => {
        expectDomainError(
          () =>
            resolveEffectiveAuctionStatus({
              databaseStatus:
                'CREATED',
              now:
                new Date(
                  Number.NaN,
                ),
            }),
          'INVALID_INPUT',
        );
      },
    );

    it(
      'throws INVALID_INPUT for unknown contract status',
      () => {
        expectDomainError(
          () =>
            resolveEffectiveAuctionStatus({
              databaseStatus:
                'SCHEDULED',
              contractStatus:
                999,
              openAt:
                OPEN_AT,
              closeAt:
                CLOSE_AT,
              now:
                new Date(
                  '2026-11-10T12:00:00.000Z',
                ),
            }),
          'INVALID_INPUT',
        );
      },
    );

    it(
      'returns only the effective status name through the convenience wrapper',
      () => {
        const status =
          resolveEffectiveStatusName({
            databaseStatus:
              'SCHEDULED',
            contractStatus:
              ContractAuctionStatus.SCHEDULED,
            openAt:
              OPEN_AT,
            closeAt:
              CLOSE_AT,
            now:
              new Date(
                '2026-11-10T12:00:00.000Z',
              ),
          });

        assert.equal(
          status,
          'OPEN',
        );
      },
    );

    it(
      'classifies public auction statuses',
      () => {
        for (
          const hiddenStatus
          of [
            'CREATED',
            'PENDING',
            'REJECTED',
            'CANCELED',
            'REGISTERING',
            'REGISTRATION_FAILED',
          ] as const
        ) {
          assert.equal(
            isPublicAuctionStatus(
              hiddenStatus,
            ),
            false,
          );
        }

        for (
          const publicStatus
          of [
            'SCHEDULED',
            'OPEN',
            'CLOSED',
            'AWAITING_KEEPER',
            'AWARDING',
            'COLLECTION',
            'CLAIM_PERIOD',
            'SETTLED',
            'PASSED_IN',
            'WITHDRAWN',
          ] as const
        ) {
          assert.equal(
            isPublicAuctionStatus(
              publicStatus,
            ),
            true,
          );
        }
      },
    );

    it(
      'classifies only SCHEDULED and OPEN as biddable',
      () => {
        assert.equal(
          isBiddableEffectiveStatus(
            'SCHEDULED',
          ),
          true,
        );

        assert.equal(
          isBiddableEffectiveStatus(
            'OPEN',
          ),
          true,
        );

        assert.equal(
          isBiddableEffectiveStatus(
            'CLOSED',
          ),
          false,
        );

        assert.equal(
          isBiddableEffectiveStatus(
            'AWARDING',
          ),
          false,
        );
      },
    );

    it(
      'classifies lifecycle terminal statuses',
      () => {
        for (
          const terminalStatus
          of [
            'REJECTED',
            'CANCELED',
            'SETTLED',
            'WITHDRAWN',
          ] as const
        ) {
          assert.equal(
            isTerminalAuctionStatus(
              terminalStatus,
            ),
            true,
          );
        }

        for (
          const nonTerminalStatus
          of [
            'CREATED',
            'PENDING',
            'SCHEDULED',
            'OPEN',
            'CLOSED',
            'AWARDING',
            'COLLECTION',
            'CLAIM_PERIOD',
            'PASSED_IN',
          ] as const
        ) {
          assert.equal(
            isTerminalAuctionStatus(
              nonTerminalStatus,
            ),
            false,
          );
        }
      },
    );

    it(
      'returns defensive Date copies in the result',
      () => {
        const now =
          new Date(
            '2026-11-10T12:00:00.000Z',
          );

        const result =
          resolveEffectiveAuctionStatus({
            databaseStatus:
              'SCHEDULED',
            contractStatus:
              ContractAuctionStatus.SCHEDULED,
            openAt:
              OPEN_AT,
            closeAt:
              CLOSE_AT,
            now,
          });

        assert.notEqual(
          result.openAt,
          OPEN_AT,
        );

        assert.notEqual(
          result.closeAt,
          CLOSE_AT,
        );

        assert.notEqual(
          result.evaluatedAt,
          now,
        );

        assert.equal(
          result.openAt?.getTime(),
          OPEN_AT.getTime(),
        );

        assert.equal(
          result.closeAt?.getTime(),
          CLOSE_AT.getTime(),
        );

        assert.equal(
          result.evaluatedAt.getTime(),
          now.getTime(),
        );
      },
    );
  },
);
