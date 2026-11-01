// @file packages/db/src/schema.ts — Drizzle database schema for Paralel
import { 
  pgTable, uuid, text, timestamp, boolean, bigint, 
  smallint, jsonb, customType, integer, bigserial, index, uniqueIndex 
} from 'drizzle-orm/pg-core';

// Custom type untuk bytea (karena Drizzle belum punya bawaan)
const bytea = customType<{ data: Buffer; notNull: false; default: false }>({
  dataType() {
    return 'bytea';
  },
});

// ==========================================
// D1. PENGGUNA & MITRA
// ==========================================
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  wallet: text('wallet').notNull().unique(),
  userType: text('user_type').notNull().default('PUBLIC'), // PUBLIC, NOTARY, GUARANTOR, PLATFORM
  email: text('email'),
  preferredLanguage: text('preferred_language').notNull().default('EN'),
  telegramChatId: bigint('telegram_chat_id', { mode: 'number' }).unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const kycProfiles = pgTable('kyc_profiles', {
  userId: uuid('user_id').primaryKey().references(() => users.id),
  fullName: text('full_name').notNull(),
  nik: text('nik').notNull(),
  address: text('address').notNull(),
  faceVerified: boolean('face_verified').notNull().default(false),
  idExtractedByAi: boolean('id_extracted_by_ai').notNull(),
  status: text('status').notNull(), // PENDING, VERIFIED, FAILED
  verifiedAt: timestamp('verified_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const partners = pgTable('partners', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id).unique(),
  type: text('type').notNull(), // NOTARY, GUARANTOR
  name: text('name').notNull(),
  category: text('category'),
  city: text('city'),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ==========================================
// D2. LELANG
// ==========================================
export const feeConfig = pgTable('fee_config', {
  id: uuid('id').defaultRandom().primaryKey(),
  platformBps: integer('platform_bps').notNull(),
  guarantorBps: integer('guarantor_bps').notNull(),
  notaryBps: integer('notary_bps').notNull(),
  taxBps: integer('tax_bps').notNull(),
  withdrawFee: bigint('withdraw_fee', { mode: 'number' }).notNull(),
  effectiveFrom: timestamp('effective_from', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const auctions = pgTable('auctions', {
  id: uuid('id').defaultRandom().primaryKey(),
  auctionCode: text('auction_code').notNull().unique(),
  consignorId: uuid('consignor_id').notNull().references(() => users.id),
  guarantorId: uuid('guarantor_id').notNull().references(() => partners.id),
  notaryId: uuid('notary_id').notNull().references(() => partners.id),
  category: text('category').notNull(),
  currency: text('currency').notNull().default('USDC'),
  tokenDecimals: smallint('token_decimals').notNull().default(6),
  status: text('status').notNull(),
  currentRound: smallint('current_round').notNull().default(1),
  pendingAt: timestamp('pending_at', { withTimezone: true }),
  pendingDeadline: timestamp('pending_deadline', { withTimezone: true }),
  feeConfigId: uuid('fee_config_id').references(() => feeConfig.id),
  onchainTxHash: text('onchain_tx_hash'),
  onchainRegisteredAt: timestamp('onchain_registered_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => {
  return {
    statusIdx: index('idx_auctions_status').on(table.status),
    consignorIdx: index('idx_auctions_consignor').on(table.consignorId),
    guarantorIdx: index('idx_auctions_guarantor').on(table.guarantorId),
    catStatusIdx: index('idx_auctions_cat_status').on(table.category, table.status),
  };
});

export const auctionRounds = pgTable('auction_rounds', {
  auctionId: uuid('auction_id').notNull().references(() => auctions.id),
  roundNo: smallint('round_no').notNull(),
  startingBid: bigint('starting_bid', { mode: 'number' }).notNull(),
  bidIncrement: bigint('bid_increment', { mode: 'number' }).notNull(),
  scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
  openAt: timestamp('open_at', { withTimezone: true }).notNull(),
  durationHours: smallint('duration_hours').notNull(),
  closeAt: timestamp('close_at', { withTimezone: true }).notNull(),
  outcome: text('outcome'), // AWARDED, PASSED_IN
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => {
  return {
    pk: uniqueIndex('pk_auction_rounds').on(table.auctionId, table.roundNo),
  };
});

export const auctionAssets = pgTable('auction_assets', {
  auctionId: uuid('auction_id').primaryKey().references(() => auctions.id),
  title: text('title').notNull(),
  description: text('description').notNull(),
  condition: text('condition').notNull(),
  conditionNotes: text('condition_notes'),
  documentType: text('document_type').notNull(),
  documentNumber: text('document_number').notNull(),
  chassisNumber: text('chassis_number'),
  serialNumber: text('serial_number'),
  spec: jsonb('spec').notNull(),
  specHash: bytea('spec_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const auctionFiles = pgTable('auction_files', {
  id: uuid('id').defaultRandom().primaryKey(),
  auctionId: uuid('auction_id').notNull().references(() => auctions.id),
  kind: text('kind').notNull(),
  position: smallint('position'),
  filename: text('filename').notNull(),
  extension: text('extension').notNull(),
  mime: text('mime').notNull(),
  width: integer('width'),
  height: integer('height'),
  sizeBytes: bigint('size_bytes', { mode: 'number' }).notNull(),
  contentHash: bytea('content_hash').notNull(),
  storageUrl: text('storage_url').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ==========================================
// D3. ALUR, KONFIRMASI & TANDA TANGAN
// ==========================================
export const statusLog = pgTable('status_log', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  auctionId: uuid('auction_id').notNull().references(() => auctions.id),
  roundNo: smallint('round_no'),
  fromStatus: text('from_status'),
  toStatus: text('to_status').notNull(),
  actorUserId: uuid('actor_user_id').references(() => users.id),
  reason: text('reason'),
  txHash: text('tx_hash'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const confirmationCodes = pgTable('confirmation_codes', {
  auctionId: uuid('auction_id').primaryKey().references(() => auctions.id),
  codeHash: bytea('code_hash').notNull(),
  issuedByNotary: uuid('issued_by_notary').notNull().references(() => partners.id),
  signature: bytea('signature').notNull(),
  emailedAt: timestamp('emailed_at', { withTimezone: true }),
  usedAt: timestamp('used_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const attestations = pgTable('attestations', {
  id: uuid('id').defaultRandom().primaryKey(),
  auctionId: uuid('auction_id').notNull().references(() => auctions.id),
  roundNo: smallint('round_no'),
  type: text('type').notNull(),
  signerWallet: text('signer_wallet').notNull(),
  payload: jsonb('payload').notNull(),
  signature: bytea('signature').notNull(),
  submittedTxHash: text('submitted_tx_hash'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const receipts = pgTable('receipts', {
  id: uuid('id').defaultRandom().primaryKey(),
  auctionId: uuid('auction_id').notNull().references(() => auctions.id),
  roundNo: smallint('round_no').notNull(),
  type: text('type').notNull(),
  issuedAt: timestamp('issued_at', { withTimezone: true }).notNull(),
  autoIssued: boolean('auto_issued').notNull().default(false),
  fileUrl: text('file_url').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ==========================================
// D4. BID DAN AWARDING
// ==========================================
export const bids = pgTable('bids', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  auctionId: uuid('auction_id').notNull().references(() => auctions.id),
  roundNo: smallint('round_no').notNull(),
  phase: text('phase').notNull(),
  bidderWallet: text('bidder_wallet').notNull(),
  amountAdded: bigint('amount_added', { mode: 'number' }).notNull(),
  myBidAfter: bigint('my_bid_after', { mode: 'number' }).notNull(),
  currentBidAfter: bigint('current_bid_after', { mode: 'number' }).notNull(),
  seq: bigint('seq', { mode: 'number' }).notNull(),
  blockNumber: bigint('block_number', { mode: 'number' }).notNull(),
  txIndex: integer('tx_index').notNull(),
  logIndex: integer('log_index').notNull(),
  blockTs: timestamp('block_ts', { withTimezone: true }).notNull(),
  txHash: text('tx_hash').notNull(),
  clientMs: bigint('client_ms', { mode: 'number' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => {
  return {
    txLogIdx: uniqueIndex('idx_bids_tx_log').on(table.txHash, table.logIndex),
  };
});

export const bidderStakes = pgTable('bidder_stakes', {
  auctionId: uuid('auction_id').notNull().references(() => auctions.id),
  roundNo: smallint('round_no').notNull(),
  bidderWallet: text('bidder_wallet').notNull(),
  myBid: bigint('my_bid', { mode: 'number' }).notNull(),
  reachedSeq: bigint('reached_seq', { mode: 'number' }).notNull(),
  rank: smallint('rank'),
  status: text('status').notNull(),
  refundClaimedTx: text('refund_claimed_tx'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => {
  return {
    pk: uniqueIndex('pk_bidder_stakes').on(table.auctionId, table.roundNo, table.bidderWallet),
  };
});

export const awardingAttempts = pgTable('awarding_attempts', {
  auctionId: uuid('auction_id').notNull().references(() => auctions.id),
  roundNo: smallint('round_no').notNull(),
  rank: smallint('rank').notNull(),
  bidderWallet: text('bidder_wallet').notNull(),
  requestSentAt: timestamp('request_sent_at', { withTimezone: true }).notNull(),
  deadlineAt: timestamp('deadline_at', { withTimezone: true }).notNull(),
  result: text('result').notNull(),
  signedAt: timestamp('signed_at', { withTimezone: true }),
  defaultFee: bigint('default_fee', { mode: 'number' }),
  attestationId: uuid('attestation_id').references(() => attestations.id),
}, (table) => {
  return {
    pk: uniqueIndex('pk_awarding_attempts').on(table.auctionId, table.roundNo, table.rank),
  };
});

// ==========================================
// D5. UANG
// ==========================================
export const payouts = pgTable('payouts', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  auctionId: uuid('auction_id').notNull().references(() => auctions.id),
  roundNo: smallint('round_no').notNull(),
  kind: text('kind').notNull(),
  recipientRole: text('recipient_role').notNull(),
  recipientWallet: text('recipient_wallet').notNull(),
  amount: bigint('amount', { mode: 'number' }).notNull(),
  txHash: text('tx_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const withdrawals = pgTable('withdrawals', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  auctionId: uuid('auction_id').references(() => auctions.id),
  roundNo: smallint('round_no'),
  wallet: text('wallet').notNull(),
  kind: text('kind').notNull(),
  grossAmount: bigint('gross_amount', { mode: 'number' }).notNull(),
  withdrawFee: bigint('withdraw_fee', { mode: 'number' }).notNull(),
  netAmount: bigint('net_amount', { mode: 'number' }).notNull(),
  relayed: boolean('relayed').notNull(),
  txHash: text('tx_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ==========================================
// D6. FEED DAN NOTIFIKASI
// ==========================================
export const notifications = pgTable('notifications', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id),
  auctionId: uuid('auction_id').references(() => auctions.id),
  channel: text('channel').notNull(),
  type: text('type').notNull(),
  payload: jsonb('payload').notNull(),
  status: text('status').notNull(),
  sentAt: timestamp('sent_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const feedPosts = pgTable('feed_posts', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  auctionId: uuid('auction_id').notNull().references(() => auctions.id),
  roundNo: smallint('round_no').notNull(),
  kind: text('kind').notNull(),
  channel: text('channel').notNull(),
  externalId: text('external_id'),
  postedAt: timestamp('posted_at', { withTimezone: true }).notNull(),
});

// ==========================================
// D7. INDEXER
// ==========================================
export const chainEvents = pgTable('chain_events', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  chainId: integer('chain_id').notNull(),
  blockNumber: bigint('block_number', { mode: 'number' }).notNull(),
  blockTs: timestamp('block_ts', { withTimezone: true }).notNull(),
  txHash: text('tx_hash').notNull(),
  logIndex: integer('log_index').notNull(),
  eventName: text('event_name').notNull(),
  args: jsonb('args').notNull(),
  processed: boolean('processed').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => {
  return {
    txLogIdx: uniqueIndex('idx_chain_events_tx_log').on(table.chainId, table.txHash, table.logIndex),
  };
});