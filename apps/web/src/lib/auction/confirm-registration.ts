// @file apps/web/src/lib/auction/confirm-registration.ts
//
// Pure construction of the immutable registerAuction payload.
// No database, session, RPC, environment, or relay side effects.
import {
  GUARANTOR_COMPATIBILITY_CATEGORY,
  type RegisterAuctionInput,
} from '@paralel/contracts';

import {
  createDomainError,
} from '@paralel/domain';

import {
  isAddress,
  isHex,
  type Address,
  type Hex,
} from 'viem';

type ByteProjection =
  | Uint8Array
  | Buffer;

export type ConfirmRegistrationFacts =
  Readonly<{
    auctionKey:
      RegisterAuctionInput['auctionKey'];
    consignorWallet: string;
    guarantorWallet: string;
    notaryWallet: string;
    specHash:
      ByteProjection;
    startingBid: bigint;
    bidIncrement: bigint;
    openAt: Date;
    durationHours: number;
    confirmationCodeHash:
      ByteProjection;
    notarySignature:
      ByteProjection;
    notaryPayload: unknown;
    consignorSignature: Hex;
    consignorNonce: bigint;
    consignorExpiry: bigint;
  }>;

type NotarySigningPayload =
  Readonly<{
    nonce: bigint;
    expiry: bigint;
  }>;

function normalizeAddress(
  value: string,
  field: string,
): Address {
  if (
    !isAddress(value)
  ) {
    throw new Error(
      `Invalid ${field} projection.`,
    );
  }

  return value
    .toLowerCase() as Address;
}

function byteLength(
  value:
    ByteProjection,
): number {
  return value.byteLength;
}

function bytesToHex(
  value:
    ByteProjection,
  expectedLength:
    number,
  field:
    string,
): Hex {
  if (
    byteLength(value) !==
      expectedLength
  ) {
    throw new Error(
      `Invalid ${field} byte length.`,
    );
  }

  return `0x${Buffer
    .from(value)
    .toString('hex')}`;
}

function parseUnsignedDecimal(
  value: unknown,
  field: string,
): bigint {
  if (
    typeof value !==
      'string' ||
    !/^(0|[1-9][0-9]*)$/.test(
      value,
    )
  ) {
    throw new Error(
      `Invalid ${field} projection.`,
    );
  }

  return BigInt(value);
}

export function parseNotarySigningPayload(
  value: unknown,
): NotarySigningPayload {
  if (
    typeof value !==
      'object' ||
    value === null ||
    Array.isArray(value)
  ) {
    throw new Error(
      'Invalid Notary signing payload projection.',
    );
  }

  const payload =
    value as
      Record<string, unknown>;

  return Object.freeze({
    nonce:
      parseUnsignedDecimal(
        payload.nonce,
        'Notary nonce',
      ),
    expiry:
      parseUnsignedDecimal(
        payload.expiry,
        'Notary expiry',
      ),
  });
}

export function dateToUnixSeconds(
  value: Date,
): bigint {
  if (
    !Number.isFinite(
      value.getTime(),
    )
  ) {
    throw createDomainError(
      'INVALID_INPUT',
      'Auction opening time is invalid.',
    );
  }

  return BigInt(
    Math.floor(
      value.getTime() /
      1_000,
    ),
  );
}

export function buildRegisterAuctionInput(
  facts:
    ConfirmRegistrationFacts,
): RegisterAuctionInput {
  if (
    !isHex(
      facts.consignorSignature,
    ) ||
    facts.consignorSignature
      .length !== 132
  ) {
    throw createDomainError(
      'INVALID_SIGNATURE',
      'Consignor confirmation signature is invalid.',
    );
  }

  const notary =
    parseNotarySigningPayload(
      facts.notaryPayload,
    );

  return Object.freeze({
    auctionKey:
      facts.auctionKey,

    consignor:
      normalizeAddress(
        facts.consignorWallet,
        'Consignor wallet',
      ),

    guarantor:
      normalizeAddress(
        facts.guarantorWallet,
        'Guarantor wallet',
      ),

    notary:
      normalizeAddress(
        facts.notaryWallet,
        'Notary wallet',
      ),

    category:
      GUARANTOR_COMPATIBILITY_CATEGORY,

    specHash:
      bytesToHex(
        facts.specHash,
        32,
        'spec hash',
      ),

    startingBid:
      facts.startingBid,

    bidIncrement:
      facts.bidIncrement,

    openAt:
      dateToUnixSeconds(
        facts.openAt,
      ),

    durationHours:
      facts.durationHours,

    confirmationCodeHash:
      bytesToHex(
        facts
          .confirmationCodeHash,
        32,
        'confirmation code hash',
      ),

    notarySig:
      bytesToHex(
        facts.notarySignature,
        65,
        'Notary signature',
      ),

    consignorSig:
      facts.consignorSignature,

    notaryNonce:
      notary.nonce,

    notaryExpiry:
      notary.expiry,

    consignorNonce:
      facts.consignorNonce,

    consignorExpiry:
      facts.consignorExpiry,
  });
}

export type SerializedRegisterAuctionInput =
  Readonly<{
    auctionKey: Hex;
    consignor: Address;
    guarantor: Address;
    notary: Address;
    category: number;
    specHash: Hex;
    startingBid: string;
    bidIncrement: string;
    openAt: string;
    durationHours: number;
    confirmationCodeHash: Hex;
    notarySig: Hex;
    consignorSig: Hex;
    notaryNonce: string;
    notaryExpiry: string;
    consignorNonce: string;
    consignorExpiry: string;
  }>;

export function serializeRegisterAuctionInput(
  input:
    RegisterAuctionInput,
): SerializedRegisterAuctionInput {
  return Object.freeze({
    auctionKey:
      input.auctionKey,
    consignor:
      input.consignor,
    guarantor:
      input.guarantor,
    notary:
      input.notary,
    category:
      input.category,
    specHash:
      input.specHash,
    startingBid:
      input.startingBid
        .toString(),
    bidIncrement:
      input.bidIncrement
        .toString(),
    openAt:
      input.openAt
        .toString(),
    durationHours:
      input.durationHours,
    confirmationCodeHash:
      input.confirmationCodeHash,
    notarySig:
      input.notarySig,
    consignorSig:
      input.consignorSig,
    notaryNonce:
      input.notaryNonce
        .toString(),
    notaryExpiry:
      input.notaryExpiry
        .toString(),
    consignorNonce:
      input.consignorNonce
        .toString(),
    consignorExpiry:
      input.consignorExpiry
        .toString(),
  });
}
