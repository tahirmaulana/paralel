// @file packages/domain/src/effective-status.ts

/**
 * Canonical effective auction status resolver.
 *
 * Resolver ini menggabungkan:
 *
 * - status pre-chain dari database;
 * - status immutable contract;
 * - openAt dan closeAt;
 * - waktu evaluasi.
 *
 * File ini murni dan tidak bergantung pada database, RPC, React,
 * Next.js, atau Cloudflare Workers.
 */

import {
  ContractAuctionStatus,
} from '@paralel/contracts';

import {
  DomainError,
  assertDomain,
} from './errors';

export const DATABASE_AUCTION_STATUSES = [
  'CREATED',
  'PENDING',
  'REJECTED',
  'CANCELED',
  'REGISTERING',
  'REGISTRATION_FAILED',
  'SCHEDULED',
  'OPEN',
  'CLOSED',
  'AWARDING',
  'COLLECTION',
  'CLAIM_PERIOD',
  'SETTLED',
  'PASSED_IN',
  'WITHDRAWN',
] as const;

export type DatabaseAuctionStatus =
  (typeof DATABASE_AUCTION_STATUSES)[number];

export const PRE_CHAIN_AUCTION_STATUSES = [
  'CREATED',
  'PENDING',
  'REJECTED',
  'CANCELED',
  'REGISTERING',
  'REGISTRATION_FAILED',
] as const;

export type PreChainAuctionStatus =
  (typeof PRE_CHAIN_AUCTION_STATUSES)[number];

export const REGISTERED_AUCTION_STATUSES = [
  'SCHEDULED',
  'OPEN',
  'CLOSED',
  'AWARDING',
  'COLLECTION',
  'CLAIM_PERIOD',
  'SETTLED',
  'PASSED_IN',
  'WITHDRAWN',
] as const;

export type RegisteredAuctionStatus =
  (typeof REGISTERED_AUCTION_STATUSES)[number];

export const EFFECTIVE_AUCTION_STATUSES = [
  ...DATABASE_AUCTION_STATUSES,
  'AWAITING_KEEPER',
] as const;

export type EffectiveAuctionStatus =
  (typeof EFFECTIVE_AUCTION_STATUSES)[number];

export type EffectiveAuctionStatusInput = {
  databaseStatus: DatabaseAuctionStatus;

  /**
   * Status hasil read `statusOf(auctionKey)`.
   *
   * Wajib tersedia setelah auction terdaftar on-chain.
   */
  contractStatus?:
    | ContractAuctionStatus
    | number
    | null;

  openAt?: Date | null;
  closeAt?: Date | null;

  /**
   * Gunakan waktu eksplisit agar resolver deterministik dan mudah diuji.
   */
  now: Date;

  /**
   * Jika true, status waktu setelah closeAt tetapi sebelum keeper
   * mengeksekusi awarding ditampilkan sebagai AWAITING_KEEPER.
   *
   * Jika false atau tidak diberikan, hasilnya CLOSED.
   */
  exposeAwaitingKeeper?: boolean;
};

export type EffectiveAuctionStatusResult = {
  effectiveStatus: EffectiveAuctionStatus;
  databaseStatus: DatabaseAuctionStatus;
  contractStatus:
    | ContractAuctionStatus
    | null;

  isPreChain: boolean;
  isRegistered: boolean;
  isTimeDerived: boolean;

  openAt: Date | null;
  closeAt: Date | null;
  evaluatedAt: Date;
};

const DATABASE_STATUS_SET =
  new Set<string>(
    DATABASE_AUCTION_STATUSES,
  );

const PRE_CHAIN_STATUS_SET =
  new Set<string>(
    PRE_CHAIN_AUCTION_STATUSES,
  );

const REGISTERED_STATUS_SET =
  new Set<string>(
    REGISTERED_AUCTION_STATUSES,
  );

const CONTRACT_STATUS_VALUES =
  new Set<number>([
    ContractAuctionStatus.SCHEDULED,
    ContractAuctionStatus.OPEN,
    ContractAuctionStatus.CLOSED,
    ContractAuctionStatus.AWARDING,
    ContractAuctionStatus.COLLECTION,
    ContractAuctionStatus.CLAIM_PERIOD,
    ContractAuctionStatus.SETTLED,
    ContractAuctionStatus.PASSED_IN,
    ContractAuctionStatus.WITHDRAWN,
  ]);

export function isDatabaseAuctionStatus(
  value: unknown,
): value is DatabaseAuctionStatus {
  return (
    typeof value === 'string' &&
    DATABASE_STATUS_SET.has(value)
  );
}

export function isPreChainAuctionStatus(
  value: DatabaseAuctionStatus,
): value is PreChainAuctionStatus {
  return PRE_CHAIN_STATUS_SET.has(
    value,
  );
}

export function isRegisteredAuctionStatus(
  value: DatabaseAuctionStatus,
): value is RegisteredAuctionStatus {
  return REGISTERED_STATUS_SET.has(
    value,
  );
}

export function isContractAuctionStatus(
  value: unknown,
): value is ContractAuctionStatus {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    CONTRACT_STATUS_VALUES.has(value)
  );
}

function assertValidDate(
  value: Date,
  field: string,
): void {
  assertDomain(
    value instanceof Date &&
      !Number.isNaN(value.getTime()),
    'INVALID_INPUT',
    `${field} must be a valid Date.`,
    {
      details: {
        field,
      },
    },
  );
}

function normalizeOptionalDate(
  value: Date | null | undefined,
  field: string,
): Date | null {
  if (value === null || value === undefined) {
    return null;
  }

  assertValidDate(
    value,
    field,
  );

  return new Date(
    value.getTime(),
  );
}

function normalizeContractStatus(
  value:
    | ContractAuctionStatus
    | number
    | null
    | undefined,
): ContractAuctionStatus | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (!isContractAuctionStatus(value)) {
    throw new DomainError(
      'INVALID_INPUT',
      `Unknown contract auction status: ${value}`,
      {
        details: {
          contractStatus: value,
        },
      },
    );
  }

  return value;
}

export function contractStatusToName(
  status: ContractAuctionStatus,
): RegisteredAuctionStatus {
  switch (status) {
    case ContractAuctionStatus.SCHEDULED:
      return 'SCHEDULED';

    case ContractAuctionStatus.OPEN:
      return 'OPEN';

    case ContractAuctionStatus.CLOSED:
      return 'CLOSED';

    case ContractAuctionStatus.AWARDING:
      return 'AWARDING';

    case ContractAuctionStatus.COLLECTION:
      return 'COLLECTION';

    case ContractAuctionStatus.CLAIM_PERIOD:
      return 'CLAIM_PERIOD';

    case ContractAuctionStatus.SETTLED:
      return 'SETTLED';

    case ContractAuctionStatus.PASSED_IN:
      return 'PASSED_IN';

    case ContractAuctionStatus.WITHDRAWN:
      return 'WITHDRAWN';

    default: {
      const exhaustiveCheck: never =
        status;

      throw new DomainError(
        'INVALID_INPUT',
        `Unknown contract auction status: ${exhaustiveCheck}`,
      );
    }
  }
}

function resolveScheduledByTime(
  input: {
    openAt: Date;
    closeAt: Date;
    now: Date;
    exposeAwaitingKeeper: boolean;
  },
): {
  status:
    | 'SCHEDULED'
    | 'OPEN'
    | 'CLOSED'
    | 'AWAITING_KEEPER';
  timeDerived: boolean;
} {
  const {
    openAt,
    closeAt,
    now,
    exposeAwaitingKeeper,
  } = input;

  assertDomain(
    closeAt.getTime() >
      openAt.getTime(),
    'INVALID_INPUT',
    'closeAt must be later than openAt.',
    {
      details: {
        openAt:
          openAt.toISOString(),
        closeAt:
          closeAt.toISOString(),
      },
    },
  );

  if (
    now.getTime() <
    openAt.getTime()
  ) {
    return {
      status: 'SCHEDULED',
      timeDerived: false,
    };
  }

  if (
    now.getTime() <
    closeAt.getTime()
  ) {
    return {
      status: 'OPEN',
      timeDerived: true,
    };
  }

  return {
    status: exposeAwaitingKeeper
      ? 'AWAITING_KEEPER'
      : 'CLOSED',
    timeDerived: true,
  };
}

/**
 * Menentukan status efektif auction secara deterministik.
 *
 * Pre-chain status selalu berasal dari database.
 *
 * Setelah registration:
 *
 * - Contract SCHEDULED masih perlu diturunkan dengan waktu menjadi
 *   SCHEDULED, OPEN, atau CLOSED/AWAITING_KEEPER.
 * - Contract OPEN juga diperiksa terhadap closeAt agar UI tidak tetap
 *   menampilkan OPEN ketika keeper belum mengeksekusi transisi.
 * - Status AWARDING dan setelahnya mengikuti contract.
 */
export function resolveEffectiveAuctionStatus(
  input: EffectiveAuctionStatusInput,
): EffectiveAuctionStatusResult {
  assertDomain(
    isDatabaseAuctionStatus(
      input.databaseStatus,
    ),
    'INVALID_INPUT',
    `Unknown database auction status: ${String(
      input.databaseStatus,
    )}`,
  );

  assertValidDate(
    input.now,
    'now',
  );

  const now =
    new Date(input.now.getTime());

  const openAt =
    normalizeOptionalDate(
      input.openAt,
      'openAt',
    );

  const closeAt =
    normalizeOptionalDate(
      input.closeAt,
      'closeAt',
    );

  const contractStatus =
    normalizeContractStatus(
      input.contractStatus,
    );

  if (
    isPreChainAuctionStatus(
      input.databaseStatus,
    )
  ) {
    return {
      effectiveStatus:
        input.databaseStatus,
      databaseStatus:
        input.databaseStatus,
      contractStatus: null,
      isPreChain: true,
      isRegistered: false,
      isTimeDerived: false,
      openAt,
      closeAt,
      evaluatedAt: now,
    };
  }

  assertDomain(
    contractStatus !== null,
    'PROJECTION_PENDING',
    'Registered auction does not yet have a confirmed contract status.',
    {
      retryable: true,
      details: {
        databaseStatus:
          input.databaseStatus,
      },
    },
  );

  if (
    contractStatus ===
      ContractAuctionStatus.SCHEDULED ||
    contractStatus ===
      ContractAuctionStatus.OPEN ||
    contractStatus ===
      ContractAuctionStatus.CLOSED
  ) {
    assertDomain(
      openAt !== null,
      'PROJECTION_PENDING',
      'Registered auction is missing openAt.',
      {
        retryable: true,
      },
    );

    assertDomain(
      closeAt !== null,
      'PROJECTION_PENDING',
      'Registered auction is missing closeAt.',
      {
        retryable: true,
      },
    );

    const resolved =
      resolveScheduledByTime({
        openAt,
        closeAt,
        now,
        exposeAwaitingKeeper:
          input.exposeAwaitingKeeper ??
          false,
      });

    return {
      effectiveStatus:
        resolved.status,
      databaseStatus:
        input.databaseStatus,
      contractStatus,
      isPreChain: false,
      isRegistered: true,
      isTimeDerived:
        resolved.timeDerived,
      openAt,
      closeAt,
      evaluatedAt: now,
    };
  }

  return {
    effectiveStatus:
      contractStatusToName(
        contractStatus,
      ),
    databaseStatus:
      input.databaseStatus,
    contractStatus,
    isPreChain: false,
    isRegistered: true,
    isTimeDerived: false,
    openAt,
    closeAt,
    evaluatedAt: now,
  };
}

/**
 * Convenience wrapper bila consumer hanya membutuhkan nama status.
 */
export function resolveEffectiveStatusName(
  input: EffectiveAuctionStatusInput,
): EffectiveAuctionStatus {
  return resolveEffectiveAuctionStatus(
    input,
  ).effectiveStatus;
}

/**
 * Public feed hanya menampilkan auction yang telah terdaftar on-chain.
 */
export function isPublicAuctionStatus(
  status: EffectiveAuctionStatus,
): boolean {
  return (
    status !== 'CREATED' &&
    status !== 'PENDING' &&
    status !== 'REJECTED' &&
    status !== 'CANCELED' &&
    status !== 'REGISTERING' &&
    status !== 'REGISTRATION_FAILED'
  );
}

/**
 * Status yang masih menerima bid melalui kontrak.
 *
 * Final eligibility tetap harus disimulasikan terhadap kontrak.
 */
export function isBiddableEffectiveStatus(
  status: EffectiveAuctionStatus,
): boolean {
  return (
    status === 'SCHEDULED' ||
    status === 'OPEN'
  );
}

/**
 * Status terminal dari perspektif lifecycle auction.
 */
export function isTerminalAuctionStatus(
  status: EffectiveAuctionStatus,
): boolean {
  return (
    status === 'REJECTED' ||
    status === 'CANCELED' ||
    status === 'SETTLED' ||
    status === 'WITHDRAWN'
  );
}
