// @file apps/web/src/lib/auction/create-input.ts
//
// Strict deterministic input boundary for POST /api/auction.
// No database, RPC, object-storage, session, or environment access.
import {
  isHex,
  type Hex,
} from 'viem';

import {
  createDomainError,
} from '@paralel/domain';

import {
  isCategory,
  validateSpec,
  type Category,
} from './spec-schema';

const CONDITIONS = ['NEW', 'LIKE_NEW', 'GOOD', 'FAIR', 'DAMAGED'] as const;
const SLOTS = ['photo1', 'photo2', 'photo3', 'photo4', 'photo5', 'doc'] as const;
const PHOTO_MIMES = ['image/jpeg', 'image/png', 'image/webp'] as const;
const DOC_MIMES = ['application/pdf', 'image/jpeg', 'image/png'] as const;
const EXTENSION_BY_MIME: Readonly<Record<string, string>> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
};
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const MAX_DOC_BYTES = 10 * 1024 * 1024;
const TOP_LEVEL_KEYS = new Set([
  'category', 'guarantorId', 'title', 'description', 'condition',
  'conditionNotes', 'documentNumber', 'chassisNumber', 'serialNumber',
  'spec', 'startingBid', 'bidIncrement', 'openAt', 'durationHours', 'files',
]);
const FILE_KEYS = new Set([
  'slot', 'key', 'contentHash', 'sizeBytes', 'mime', 'filename',
  'extension', 'width', 'height',
]);

type Condition = (typeof CONDITIONS)[number];
type Slot = (typeof SLOTS)[number];
export type AuctionFileInput = Readonly<{
  slot: Slot;
  key: string;
  contentHash: Hex;
  sizeBytes: number;
  mime: string;
  filename: string;
  extension: string;
  width: number | null;
  height: number | null;
}>;
export type AuctionCreateInput = Readonly<{
  category: Category;
  guarantorId: string;
  title: string;
  description: string;
  condition: Condition;
  conditionNotes: string | null;
  documentType: 'CERTIFICATE' | 'INVOICE';
  documentNumber: string;
  chassisNumber: string | null;
  serialNumber: string | null;
  spec: Record<string, unknown>;
  startingBid: bigint;
  bidIncrement: bigint;
  openAt: Date;
  durationHours: number;
  closeAt: Date;
  files: readonly AuctionFileInput[];
}>;
export type AuctionCreationPolicy = Readonly<{
  allowedIncrements: readonly bigint[];
  maxIncrementBps: number;
  minDurationHours: number;
  maxDurationHours: number;
  minOpenDelay: number;
  maxOpenDelay: number;
  blockTimestamp: bigint;
}>;
function invalid(message: string, details: Record<string, unknown> = {}): never {
  throw createDomainError('INVALID_INPUT', message, { details });
}
function object(value: unknown, field: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    invalid(`${field} must be an object.`, { field });
  }
  return value as Record<string, unknown>;
}
function rejectUnknown(value: Record<string, unknown>, allowed: ReadonlySet<string>, field: string): void {
  const unknown = Object.keys(value).filter((key) => !allowed.has(key));
  if (unknown.length) invalid(`${field} contains unknown fields.`, { field, fields: unknown });
}
function text(value: unknown, field: string, max = 10_000): string {
  if (typeof value !== 'string') invalid(`${field} must be a string.`, { field });
  const normalized = value.trim();
  if (!normalized || normalized.length > max) invalid(`${field} is invalid.`, { field });
  return normalized;
}
function nullableText(value: unknown, field: string, max = 10_000): string | null {
  if (value === null || value === undefined || value === '') return null;
  return text(value, field, max);
}
function integer(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) {
    invalid(`${field} must be a safe integer.`, { field });
  }
  return value;
}
function money(value: unknown, field: string): bigint {
  if (typeof value !== 'string' || !/^[0-9]+$/.test(value)) {
    invalid(`${field} must be an unsigned decimal integer string.`, { field });
  }
  const result = BigInt(value);
  if (result > 9_223_372_036_854_775_807n) invalid(`${field} exceeds BIGINT range.`, { field });
  return result;
}
function parseFile(value: unknown): AuctionFileInput {
  const row = object(value, 'files[]');
  rejectUnknown(row, FILE_KEYS, 'files[]');
  const slot = text(row.slot, 'slot', 6);
  if (!(SLOTS as readonly string[]).includes(slot)) invalid('slot is invalid.', { field: 'slot' });
  const mime = text(row.mime, 'mime', 100);
  const isDoc = slot === 'doc';
  const allowed = isDoc ? DOC_MIMES : PHOTO_MIMES;
  if (!(allowed as readonly string[]).includes(mime)) invalid('mime is invalid for slot.', { slot, mime });
  const extension = text(row.extension, 'extension', 10).toLowerCase();
  if (EXTENSION_BY_MIME[mime] !== extension) invalid('extension does not match mime.', { slot });
  const contentHash = text(row.contentHash, 'contentHash', 66);
  if (!isHex(contentHash) || contentHash.length !== 66) invalid('contentHash must be 32-byte hex.', { slot });
  const sizeBytes = integer(row.sizeBytes, 'sizeBytes');
  const max = isDoc ? MAX_DOC_BYTES : MAX_PHOTO_BYTES;
  if (sizeBytes <= 0 || sizeBytes > max) invalid('sizeBytes is outside allowed range.', { slot });
  const width = row.width === null || row.width === undefined ? null : integer(row.width, 'width');
  const height = row.height === null || row.height === undefined ? null : integer(row.height, 'height');
  const isImage = mime.startsWith('image/');
  if (isImage && (!(width && width > 0) || !(height && height > 0))) invalid('Image dimensions are required.', { slot });
  if (!isImage && (width !== null || height !== null)) invalid('Non-image files must not include dimensions.', { slot });
  const key = text(row.key, 'key', 512);
  const expectedPrefix =
    isDoc
      ? 'auctions-item-documents'
      : 'auctions-item-photos';
  const expectedKeyPattern =
    new RegExp(
      `^${expectedPrefix}/[0-9a-f-]{36}\\.${extension}$`,
    );
  if (!expectedKeyPattern.test(key)) {
    invalid('Object key is invalid.', { slot });
  }
  return {
    slot: slot as Slot,
    key,
    contentHash: contentHash as Hex,
    sizeBytes,
    mime,
    filename: text(row.filename, 'filename', 255),
    extension,
    width,
    height,
  };
}
export function parseAuctionCreateInput(
  value: unknown,
  now: Date,
  policy?: AuctionCreationPolicy,
): AuctionCreateInput {
  if (
    !Number.isFinite(
      now.getTime(),
    )
  ) {
    invalid(
      'Evaluation time is invalid.',
    );
  }
  const body = object(value, 'body');
  rejectUnknown(body, TOP_LEVEL_KEYS, 'body');
  if ('wallet' in body) invalid('wallet is not accepted; actor comes from the signed session.', { field: 'wallet' });
  if (!isCategory(body.category)) invalid('category is invalid.', { field: 'category' });
  const category = body.category;
  const condition = text(body.condition, 'condition', 20);
  if (!(CONDITIONS as readonly string[]).includes(condition)) invalid('condition is invalid.', { field: 'condition' });
  let conditionNotes = nullableText(body.conditionNotes, 'conditionNotes', 2_000);
  if (condition === 'DAMAGED' && !conditionNotes) invalid('conditionNotes is required for DAMAGED.', { field: 'conditionNotes' });
  if (condition !== 'DAMAGED') conditionNotes = null;
  const documentType = category === 'OTOMOTIF' || category === 'PROPERTI' ? 'CERTIFICATE' : 'INVOICE';
  const documentNumber = text(body.documentNumber, 'documentNumber', 255);
  if (documentNumber === 'NUL' && documentType !== 'INVOICE') invalid('NUL is allowed only for INVOICE documentNumber.');
  let chassisNumber = nullableText(body.chassisNumber, 'chassisNumber', 255);
  let serialNumber = nullableText(body.serialNumber, 'serialNumber', 255);
  if (category === 'OTOMOTIF') {
    if (!chassisNumber || chassisNumber === 'NUL') invalid('Valid chassisNumber is required for OTOMOTIF.');
    if (serialNumber) invalid('serialNumber is not valid for OTOMOTIF.');
    serialNumber = null;
  } else if (category === 'PROPERTI') {
    if (chassisNumber || serialNumber) invalid('PROPERTI must not include chassisNumber or serialNumber.');
    chassisNumber = null;
    serialNumber = null;
  } else {
    if (chassisNumber) invalid('chassisNumber is valid only for OTOMOTIF.');
    if (!serialNumber) invalid('serialNumber is required for this category.');
    chassisNumber = null;
  }
  const specResult = validateSpec(category, body.spec);
  if (!specResult.ok) invalid('spec is invalid.', { errors: specResult.errors });
  const startingBid = money(body.startingBid, 'startingBid');
  const bidIncrement = money(body.bidIncrement, 'bidIncrement');
  if (startingBid <= 0n) invalid('startingBid must be positive.');
  if (bidIncrement <= 0n) invalid('bidIncrement must be positive.');
  const durationHours = integer(body.durationHours, 'durationHours');
  if (durationHours < 1 || durationHours > 65_535) invalid('durationHours is outside the contract range.');
  if (typeof body.openAt !== 'string') invalid('openAt must be an ISO timestamp.');
  const openAt = new Date(body.openAt);
  if (!Number.isFinite(openAt.getTime()) || openAt.toISOString() !== body.openAt) invalid('openAt must be canonical ISO-8601 UTC.');
  if (policy) {
    if (
      !Number.isInteger(policy.maxIncrementBps) ||
      policy.maxIncrementBps < 0 ||
      !Number.isInteger(policy.minDurationHours) ||
      !Number.isInteger(policy.maxDurationHours) ||
      policy.minDurationHours < 1 ||
      policy.minDurationHours > policy.maxDurationHours ||
      !Number.isInteger(policy.minOpenDelay) ||
      !Number.isInteger(policy.maxOpenDelay) ||
      policy.minOpenDelay < 0 ||
      policy.minOpenDelay > policy.maxOpenDelay
    ) {
      throw new Error('On-chain auction policy is invalid.');
    }
    if (!policy.allowedIncrements.includes(bidIncrement)) {
      invalid('bidIncrement is not allowed by the current contract configuration.');
    }
    if (bidIncrement * 10_000n > startingBid * BigInt(policy.maxIncrementBps)) {
      invalid('bidIncrement exceeds the current contract maximum.');
    }
    if (
      durationHours < policy.minDurationHours ||
      durationHours > policy.maxDurationHours
    ) {
      invalid('durationHours is outside the current contract configuration.');
    }
    const openAtSeconds = BigInt(Math.floor(openAt.getTime() / 1_000));
    if (
      openAtSeconds < policy.blockTimestamp + BigInt(policy.minOpenDelay) ||
      openAtSeconds > policy.blockTimestamp + BigInt(policy.maxOpenDelay)
    ) {
      invalid('openAt is outside the current contract configuration.');
    }
  } else if (openAt.getTime() <= now.getTime()) {
    invalid('openAt must be in the future.');
  }
  const closeAt = new Date(openAt.getTime() + durationHours * 3_600_000);
  if (!Array.isArray(body.files) || body.files.length !== 6) invalid('Exactly five photos and one document are required.');
  const files = body.files.map(parseFile);
  if (new Set(files.map((file) => file.slot)).size !== 6) invalid('Every file slot must occur exactly once.');
  return {
    category,
    guarantorId: text(body.guarantorId, 'guarantorId', 36),
    title: text(body.title, 'title', 255),
    description: text(body.description, 'description', 10_000),
    condition: condition as Condition,
    conditionNotes,
    documentType,
    documentNumber,
    chassisNumber,
    serialNumber,
    spec: specResult.value,
    startingBid,
    bidIncrement,
    openAt,
    durationHours,
    closeAt,
    files,
  };
}
