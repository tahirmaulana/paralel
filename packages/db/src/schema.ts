// @file packages/db/src/schema.ts — Drizzle database schema for Paralel
// ref: PARALEL.md Lampiran D1–D7, §D0, §5.1, §6, §7, D11
//    ; CONTRACT_SPEC.md §1
import {
  pgTable, uuid, text, timestamp, boolean, bigint, smallint, jsonb,
  customType, integer, bigserial, index, uniqueIndex, primaryKey, check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

const bytea = customType<{ data: Buffer; notNull: true; default: false }>({
  dataType() { return 'bytea'; },
});

// ─── D1. PENGGUNA & MITRA ──────────────────────────────────

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  wallet: text('wallet').notNull().unique(),
  userType: text('user_type').notNull().default('PUBLIC'),
  email: text('email'),
  preferredLanguage: text('preferred_language').notNull().default('EN'),
  telegramChatId: bigint('telegram_chat_id', { mode: 'bigint' }).unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  check('chk_users_wallet', sql`${t.wallet} ~ '^0x[0-9a-f]{40}$'`),
  check('chk_users_user_type', sql`${t.userType} IN ('PUBLIC','NOTARY','GUARANTOR','PLATFORM')`),
  check('chk_users_pref_lang', sql`${t.preferredLanguage} IN ('EN','ID')`),
]);

export const kycProfiles = pgTable('kyc_profiles', {
  userId: uuid('user_id').primaryKey().references(() => users.id),
  fullName: text('full_name').notNull(),
  nik: text('nik').notNull(),
  address: text('address').notNull(),
  ktpPhoto: text('ktp_photo'),
  adminComment: text('admin_comment'),
  faceVerified: boolean('face_verified').notNull().default(false),
  idExtractedByAi: boolean('id_extracted_by_ai').notNull(),
  status: text('status').notNull(),
  verifiedAt: timestamp('verified_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  check('chk_kyc_nik', sql`${t.nik} ~ '^[0-9]{16}$'`),
  check('chk_kyc_status', sql`${t.status} IN ('UNVERIFIED','VERIFIED')`),
]);

export const partners = pgTable('partners', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id).unique(),
  type: text('type').notNull(),
  name: text('name').notNull(),
  category: text('category'),
  city: text('city'),
  documentNumber: text('document_number'),
  address: text('address'),
  photo: text('photo'),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  check('chk_partners_type', sql`${t.type} IN ('NOTARY','GUARANTOR')`),
  check('chk_partners_category_val', sql`${t.category} IS NULL OR ${t.category} IN ('ALL','OTOMOTIF','PROPERTI','ELEKTRONIK','AKSESORIS_HOBI','PERHIASAN')`),
  check('chk_partners_role_shape', sql`
    (${t.type} = 'GUARANTOR' AND ${t.category} IS NOT NULL AND ${t.city} IS NOT NULL)
    OR (${t.type} = 'NOTARY' AND ${t.category} IS NULL)
  `),
]);

// ─── D5. FEE CONFIG (sebelum auctions karena FK) ─────────

export const feeConfig = pgTable('fee_config', {
  id: uuid('id').defaultRandom().primaryKey(),
  platformBps: integer('platform_bps').notNull(),
  guarantorBps: integer('guarantor_bps').notNull(),
  notaryBps: integer('notary_bps').notNull(),
  taxBps: integer('tax_bps').notNull(),
  defaultFeeBps: integer('default_fee_bps').notNull(),
  withdrawFee: bigint('withdraw_fee', { mode: 'bigint' }).notNull(),
  effectiveFrom: timestamp('effective_from', { withTimezone: true }).notNull(),
  sourceTxHash: text('source_tx_hash'),
  sourceLogIndex: integer('source_log_index'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('uq_fee_config_source_event').on(t.sourceTxHash, t.sourceLogIndex),
]);

// ─── D2. LELANG ─────────────────────────────────────────────

export const auctions = pgTable('auctions', {
  id: uuid('id').defaultRandom().primaryKey(),
  auctionCode: text('auction_code').notNull().unique(),
  consignorId: uuid('consignor_id').notNull().references(() => users.id),
  guarantorId: uuid('guarantor_id').notNull().references(() => partners.id),
  notaryId: uuid('notary_id').references(() => partners.id),
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
}, (t) => [
  index('idx_auctions_status').on(t.status),
  index('idx_auctions_consignor').on(t.consignorId),
  index('idx_auctions_guarantor').on(t.guarantorId),
  index('idx_auctions_cat_status').on(t.category, t.status),
  check('chk_auctions_category', sql`${t.category} IN ('OTOMOTIF','PROPERTI','ELEKTRONIK','AKSESORIS_HOBI','PERHIASAN')`),
  check('chk_auctions_currency', sql`${t.currency} IN ('USDC')`),
  check(
    'chk_auctions_status',
    sql`
      ${t.status} IN (
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
        'WITHDRAWN'
      )
    `,
  ),
  check('chk_auctions_current_round', sql`${t.currentRound} >= 1`),
]);

export const auctionRounds = pgTable('auction_rounds', {
  auctionId: uuid('auction_id').notNull().references(() => auctions.id),
  roundNo: smallint('round_no').notNull(),
  startingBid: bigint('starting_bid', { mode: 'bigint' }).notNull(),
  bidIncrement: bigint('bid_increment', { mode: 'bigint' }).notNull(),
  scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
  openAt: timestamp('open_at', { withTimezone: true }).notNull(),
  durationHours: smallint('duration_hours').notNull(),
  closeAt: timestamp('close_at', { withTimezone: true }).notNull(),
  collectionDeadline: timestamp('collection_deadline', { withTimezone: true }),
  claimPeriodEnd: timestamp('claim_period_end', { withTimezone: true }),
  outcome: text('outcome'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  primaryKey({ name: 'pk_auction_rounds', columns: [t.auctionId, t.roundNo] }),
  check('chk_rounds_starting_bid', sql`${t.startingBid} > 0`),
  check('chk_rounds_bid_increment', sql`${t.bidIncrement} > 0`),
  check('chk_rounds_duration', sql`${t.durationHours} > 0`),
  check('chk_rounds_outcome', sql`${t.outcome} IS NULL OR ${t.outcome} IN ('AWARDED','PASSED_IN')`),
]);

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
}, (t) => [
  check('chk_assets_condition', sql`${t.condition} IN ('NEW','LIKE_NEW','GOOD','FAIR','DAMAGED')`),
  check('chk_assets_doc_type', sql`${t.documentType} IN ('CERTIFICATE','INVOICE')`),
  check('chk_assets_damaged_notes', sql`${t.condition} <> 'DAMAGED' OR ${t.conditionNotes} IS NOT NULL`),
  check('chk_assets_docnum_nul', sql`${t.documentNumber} <> 'NUL' OR ${t.documentType} = 'INVOICE'`),
  check('chk_assets_chassis_not_nul', sql`${t.chassisNumber} IS NULL OR ${t.chassisNumber} <> 'NUL'`),
]);

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
  sizeBytes: bigint('size_bytes', { mode: 'bigint' }).notNull(),
  contentHash: bytea('content_hash').notNull(),
  storageUrl: text('storage_url').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  check('chk_files_kind', sql`${t.kind} IN ('PHOTO','DOCUMENT_SCAN')`),
  check('chk_files_photo_position', sql`${t.kind} <> 'PHOTO' OR ${t.position} BETWEEN 1 AND 5`),
  uniqueIndex('uq_auction_photo_slot').on(t.auctionId, t.position).where(sql`kind = 'PHOTO'`),
]);

// ─── D3. ALUR, KONFIRMASI & TANDA TANGAN ────────────────────

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
}, (t) => [
  check('chk_att_type', sql`${t.type} IN ('GUARANTOR_APPROVED','GUARANTOR_REJECTED','NOTARY_APPROVED','BIDDER_AWARD_SIGN','GUARANTOR_COLLECTED','GUARANTOR_WITHDRAWN','CONSIGNOR_CONFIRM','WITHDRAW_REQUEST')`),
  check('chk_att_signer_wallet', sql`${t.signerWallet} ~ '^0x[0-9a-f]{40}$'`),
  uniqueIndex('uq_attestation_approval')
    .on(t.auctionId, t.type)
    .where(sql`${t.type} IN ('GUARANTOR_APPROVED','NOTARY_APPROVED')`),
]);

export const receipts = pgTable('receipts', {
  id: uuid('id').defaultRandom().primaryKey(),
  auctionId: uuid('auction_id').notNull().references(() => auctions.id),
  roundNo: smallint('round_no').notNull(),
  type: text('type').notNull(),
  issuedAt: timestamp('issued_at', { withTimezone: true }).notNull(),
  autoIssued: boolean('auto_issued').notNull().default(false),
  fileUrl: text('file_url').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  check('chk_receipts_type', sql`${t.type} IN ('CONSIGNMENT','COLLECTION','WITHDRAWAL')`),
]);

// ─── D4. BID DAN AWARDING ───────────────────────────────────

export const bids = pgTable('bids', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  auctionId: uuid('auction_id').notNull().references(() => auctions.id),
  roundNo: smallint('round_no').notNull(),
  phase: text('phase').notNull(),
  bidderWallet: text('bidder_wallet').notNull(),
  amountAdded: bigint('amount_added', { mode: 'bigint' }).notNull(),
  myBidAfter: bigint('my_bid_after', { mode: 'bigint' }).notNull(),
  currentBidAfter: bigint('current_bid_after', { mode: 'bigint' }).notNull(),
  seq: bigint('seq', { mode: 'bigint' }).notNull(),
  blockNumber: bigint('block_number', { mode: 'bigint' }).notNull(),
  txIndex: integer('tx_index').notNull(),
  logIndex: integer('log_index').notNull(),
  blockTs: timestamp('block_ts', { withTimezone: true }).notNull(),
  txHash: text('tx_hash').notNull(),
  clientMs: bigint('client_ms', { mode: 'bigint' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('idx_bids_tx_log').on(t.txHash, t.logIndex),
  check('chk_bids_phase', sql`${t.phase} IN ('PRE_BID','LIVE_BID')`),
  check('chk_bids_bidder_wallet', sql`${t.bidderWallet} ~ '^0x[0-9a-f]{40}$'`),
]);

export const bidderStakes = pgTable('bidder_stakes', {
  auctionId: uuid('auction_id').notNull().references(() => auctions.id),
  roundNo: smallint('round_no').notNull(),
  bidderWallet: text('bidder_wallet').notNull(),
  myBid: bigint('my_bid', { mode: 'bigint' }).notNull(),
  reachedSeq: bigint('reached_seq', { mode: 'bigint' }).notNull(),
  rank: smallint('rank'),
  status: text('status').notNull(),
  refundClaimedTx: text('refund_claimed_tx'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  primaryKey({ name: 'pk_bidder_stakes', columns: [t.auctionId, t.roundNo, t.bidderWallet] }),
  check('chk_stakes_rank', sql`${t.rank} IS NULL OR ${t.rank} BETWEEN 1 AND 10`),
  check('chk_stakes_status', sql`${t.status} IN ('ACTIVE','PROVISIONAL','DEFAULTED','WINNER','REFUNDABLE','REFUNDED')`),
  check('chk_stakes_bidder_wallet', sql`${t.bidderWallet} ~ '^0x[0-9a-f]{40}$'`),
]);

export const awardingAttempts = pgTable('awarding_attempts', {
  auctionId: uuid('auction_id').notNull().references(() => auctions.id),
  roundNo: smallint('round_no').notNull(),
  rank: smallint('rank').notNull(),
  bidderWallet: text('bidder_wallet').notNull(),
  requestSentAt: timestamp('request_sent_at', { withTimezone: true }).notNull(),
  deadlineAt: timestamp('deadline_at', { withTimezone: true }).notNull(),
  result: text('result').notNull(),
  signedAt: timestamp('signed_at', { withTimezone: true }),
  defaultFee: bigint('default_fee', { mode: 'bigint' }),
  attestationId: uuid('attestation_id').references(() => attestations.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  primaryKey({ name: 'pk_awarding_attempts', columns: [t.auctionId, t.roundNo, t.rank] }),
  check('chk_awd_rank', sql`${t.rank} BETWEEN 1 AND 10`),
  check('chk_awd_result', sql`${t.result} IN ('PENDING','SIGNED','DEFAULTED')`),
]);

// ─── D5. UANG ───────────────────────────────────────────────

export const payouts = pgTable('payouts', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),

  auctionId:
    uuid('auction_id')
      .references(
        () =>
          auctions.id,
      ),

  roundNo:
    smallint('round_no'),

  kind:
    text('kind'),

  recipientRole:
    text('recipient_role'),

  recipientWallet:
    text('recipient_wallet')
      .notNull(),

  amount:
    bigint(
      'amount',
      {
        mode:
          'bigint',
      },
    )
      .notNull(),

  txHash:
    text('tx_hash')
      .notNull(),

  sourceLogIndex:
    integer('source_log_index')
      .notNull(),

  resolutionStatus:
    text('resolution_status')
      .notNull(),

  resolutionError:
    text('resolution_error'),

  createdAt:
    timestamp(
      'created_at',
      {
        withTimezone:
          true,
      },
    )
      .notNull()
      .defaultNow(),
}, (t) => [
  uniqueIndex(
    'idx_payouts_tx_log',
  ).on(
    t.txHash,
    t.sourceLogIndex,
  ),

  check(
    'chk_payout_kind',
    sql`
      ${t.kind} IS NULL
      OR ${t.kind} IN (
        'SETTLED',
        'DEFAULT_FEE'
      )
    `,
  ),

  check(
    'chk_payout_role',
    sql`
      ${t.recipientRole} IS NULL
      OR ${t.recipientRole} IN (
        'PLATFORM',
        'GUARANTOR',
        'NOTARY',
        'TAX',
        'CONSIGNOR'
      )
    `,
  ),

  check(
    'chk_payout_wallet',
    sql`
      ${t.recipientWallet}
        ~ '^0x[0-9a-f]{40}$'
    `,
  ),

  check(
    'chk_payout_source_log_index',
    sql`
      ${t.sourceLogIndex} >= 0
    `,
  ),

  check(
    'chk_payout_resolution_status',
    sql`
      ${t.resolutionStatus} IN (
        'RESOLVED',
        'UNRESOLVED'
      )
    `,
  ),

  check(
    'chk_payout_resolution_shape',
    sql`
      (
        ${t.resolutionStatus} =
          'RESOLVED'
        AND ${t.auctionId}
          IS NOT NULL
        AND ${t.roundNo}
          IS NOT NULL
        AND ${t.kind}
          IS NOT NULL
        AND ${t.recipientRole}
          IS NOT NULL
        AND ${t.resolutionError}
          IS NULL
      )
      OR
      (
        ${t.resolutionStatus} =
          'UNRESOLVED'
        AND ${t.auctionId}
          IS NULL
        AND ${t.roundNo}
          IS NULL
        AND ${t.kind}
          IS NULL
        AND ${t.recipientRole}
          IS NULL
        AND ${t.resolutionError}
          IS NOT NULL
        AND length(
          btrim(
            ${t.resolutionError}
          )
        ) > 0
      )
    `,
  ),
]);

export const withdrawals = pgTable('withdrawals', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),

  auctionId:
    uuid('auction_id')
      .references(
        () =>
          auctions.id,
      ),

  roundNo:
    smallint('round_no'),

  wallet:
    text('wallet')
      .notNull(),

  kind:
    text('kind')
      .notNull(),

  grossAmount:
    bigint(
      'gross_amount',
      {
        mode:
          'bigint',
      },
    )
      .notNull(),

  withdrawFee:
    bigint(
      'withdraw_fee',
      {
        mode:
          'bigint',
      },
    )
      .notNull(),

  netAmount:
    bigint(
      'net_amount',
      {
        mode:
          'bigint',
      },
    )
      .notNull(),

  relayed:
    boolean('relayed')
      .notNull(),

  txHash:
    text('tx_hash')
      .notNull(),

  sourceLogIndex:
    integer('source_log_index')
      .notNull(),

  createdAt:
    timestamp(
      'created_at',
      {
        withTimezone:
          true,
      },
    )
      .notNull()
      .defaultNow(),
}, (t) => [
  uniqueIndex(
    'idx_withdrawals_tx_log',
  ).on(
    t.txHash,
    t.sourceLogIndex,
  ),

  check(
    'chk_wd_kind',
    sql`
      ${t.kind} IN (
        'REFUND',
        'CONSIGNOR_PAYOUT',
        'FEE_BALANCE'
      )
    `,
  ),

  check(
    'chk_wd_wallet',
    sql`
      ${t.wallet}
        ~ '^0x[0-9a-f]{40}$'
    `,
  ),

  check(
    'chk_wd_fee_le_gross',
    sql`
      ${t.withdrawFee}
        <=
      ${t.grossAmount}
    `,
  ),

  check(
    'chk_wd_net_eq',
    sql`
      ${t.netAmount}
        =
      ${t.grossAmount}
        -
      ${t.withdrawFee}
    `,
  ),

  check(
    'chk_withdrawals_source_log_index',
    sql`
      ${t.sourceLogIndex} >= 0
    `,
  ),
]);

// ─── D6. FEED DAN NOTIFIKASI ────────────────────────────────

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
}, (t) => [
  check('chk_notif_channel', sql`${t.channel} IN ('TELEGRAM','EMAIL','WEB')`),
  check('chk_notif_status', sql`${t.status} IN ('QUEUED','SENT','FAILED')`),
]);

export const feedPosts = pgTable('feed_posts', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  auctionId: uuid('auction_id').notNull().references(() => auctions.id),
  roundNo: smallint('round_no').notNull(),
  kind: text('kind').notNull(),
  channel: text('channel').notNull(),
  externalId: text('external_id'),
  postedAt: timestamp('posted_at', { withTimezone: true }).notNull(),
}, (t) => [
  check('chk_feed_kind', sql`${t.kind} IN ('UPCOMING','OPEN','CLOSED')`),
  check('chk_feed_channel', sql`${t.channel} IN ('APP','X','TELEGRAM')`),
]);

// ─── D7. INDEXER ────────────────────────────────────────────

export const chainEvents = pgTable('chain_events', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  chainId: integer('chain_id').notNull(),
  contractAddress: text('contract_address').notNull(),
  blockNumber: bigint('block_number', { mode: 'bigint' }).notNull(),
  blockHash: text('block_hash').notNull(),
  blockTs: timestamp('block_ts', { withTimezone: true }).notNull(),
  transactionIndex: integer('transaction_index').notNull(),
  txHash: text('tx_hash').notNull(),
  logIndex: integer('log_index').notNull(),
  eventName: text('event_name').notNull(),
  args: jsonb('args').notNull(),
  canonical: boolean('canonical').notNull().default(true),
  projectionVersion: integer('projection_version').notNull().default(1),
  processed: boolean('processed').notNull().default(false),
  processingError: text('processing_error'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('idx_chain_events_tx_log').on(
    t.chainId,
    t.txHash,
    t.logIndex,
  ),
  index('idx_chain_events_canonical_order').on(
    t.chainId,
    t.canonical,
    t.blockNumber,
    t.transactionIndex,
    t.logIndex,
  ),
  index('idx_chain_events_block_hash').on(
    t.chainId,
    t.blockNumber,
    t.blockHash,
  ),
  index('idx_chain_events_pending_order')
    .on(
      t.chainId,
      t.blockNumber,
      t.transactionIndex,
      t.logIndex,
    )
    .where(sql`${t.canonical} = TRUE AND ${t.processed} = FALSE`),
  check(
    'chk_chain_events_contract_address',
    sql`${t.contractAddress} ~ '^0x[0-9a-f]{40}$'`,
  ),
  check(
    'chk_chain_events_block_hash',
    sql`${t.blockHash} ~ '^0x[0-9a-f]{64}$'`,
  ),
  check(
    'chk_chain_events_tx_hash',
    sql`${t.txHash} ~ '^0x[0-9a-f]{64}$'`,
  ),
  check(
    'chk_chain_events_transaction_index',
    sql`${t.transactionIndex} >= 0`,
  ),
  check(
    'chk_chain_events_log_index_nonnegative',
    sql`${t.logIndex} >= 0`,
  ),
  check(
    'chk_chain_events_projection_version',
    sql`${t.projectionVersion} >= 1`,
  ),
  check(
    'chk_chain_events_processing_state',
    sql`
      (
        ${t.processed} = TRUE
        AND ${t.processingError} IS NULL
      )
      OR
      (
        ${t.processed} = FALSE
      )
    `,
  ),
]);

export const indexerCheckpoint = pgTable(
  'indexer_checkpoint',
  {
    chainId: integer('chain_id').primaryKey(),
    blockNumber: bigint('block_number', { mode: 'bigint' }).notNull(),
    blockHash: text('block_hash').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    check(
      'chk_indexer_checkpoint_chain_id',
      sql`${t.chainId} > 0`,
    ),
    check(
      'chk_indexer_checkpoint_block_number',
      sql`${t.blockNumber} >= 0`,
    ),
    check(
      'chk_indexer_checkpoint_block_hash',
      sql`${t.blockHash} ~ '^0x[0-9a-f]{64}$'`,
    ),
  ],
);

/*
 * Legacy cursor retained until the repaired indexer establishes a verified
 * finalized checkpoint from RPC evidence.
 */
export const indexerState = pgTable('indexer_state', {
  id: text('id').primaryKey(),
  lastScannedBlock: bigint(
    'last_scanned_block',
    { mode: 'bigint' },
  ).notNull(),
  updatedAt: timestamp(
    'updated_at',
    { withTimezone: true },
  ).notNull().defaultNow(),
});

// ─── RUNTIME USER-ADMIN REGISTRY ───────────────────────────
// Sumber kebenaran runtime untuk grant akses KYC admin (PARALEL.md §16).
// Env USER_ADMIN_WALLET tetap berfungsi sebagai bootstrap/emergency fallback.
// Soft delete (active=false) → privilege dicabut, history tetap.

export const userAdmins = pgTable('user_admins', {
  id: uuid('id').defaultRandom().primaryKey(),
  wallet: text('wallet').notNull().unique(),
  active: boolean('active').notNull().default(true),
  addedBy: text('added_by').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  check('chk_user_admins_wallet', sql`${t.wallet} ~ '^0x[0-9a-f]{40}$'`),
  check('chk_user_admins_added_by', sql`${t.addedBy} ~ '^0x[0-9a-f]{40}$'`),
]);
// ─── AUTHENTICATED WALLET SESSIONS ────────────────────────────────────────────

export const authSessions = pgTable('auth_sessions', {
  sessionId: text('session_id').primaryKey(),
  tokenHash: text('token_hash').notNull().unique(),
  wallet: text('wallet').notNull(),
  chainId: integer('chain_id').notNull(),
  issuedAt: timestamp('issued_at', { withTimezone: true }).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull(),
  generation: integer('generation').notNull().default(0),
  status: text('status').notNull().default('ACTIVE'),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  revocationReason: text('revocation_reason'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('idx_auth_sessions_wallet_status').on(t.wallet, t.status),
  index('idx_auth_sessions_expires_at').on(t.expiresAt),
  check(
    'chk_auth_sessions_wallet',
    sql`${t.wallet} ~ '^0x[0-9a-f]{40}$'`,
  ),
  check(
    'chk_auth_sessions_chain_id',
    sql`${t.chainId} = 421614`,
  ),
  check(
    'chk_auth_sessions_generation',
    sql`${t.generation} >= 0`,
  ),
  check(
    'chk_auth_sessions_status',
    sql`${t.status} IN ('ACTIVE','EXPIRED','REVOKED')`,
  ),
  check(
    'chk_auth_sessions_revocation_reason',
    sql`${t.revocationReason} IS NULL OR ${t.revocationReason} IN (
      'USER_LOGOUT',
      'SESSION_ROTATED',
      'WALLET_CHANGED',
      'ROLE_CHANGED',
      'ADMIN_REVOKED',
      'SECURITY_EVENT'
    )`,
  ),
  check(
    'chk_auth_sessions_time_order',
    sql`${t.issuedAt} < ${t.expiresAt}`,
  ),
  check(
    'chk_auth_sessions_revocation_state',
    sql`
      (
        ${t.status} = 'REVOKED'
        AND ${t.revokedAt} IS NOT NULL
        AND ${t.revocationReason} IS NOT NULL
      )
      OR
      (
        ${t.status} IN ('ACTIVE','EXPIRED')
        AND ${t.revokedAt} IS NULL
        AND ${t.revocationReason} IS NULL
      )
    `,
  ),
]);

// ─── DURABLE RELAY INTENTS ─────────────────────────────────────────────

export const relayIntents = pgTable('relay_intents', {
  id:
    uuid('id')
      .defaultRandom()
      .primaryKey(),

  operation:
    text('operation')
      .notNull(),

  resourceType:
    text('resource_type')
      .notNull(),

  resourceId:
    uuid('resource_id')
      .notNull()
      .references(
        () => auctions.id,
      ),

  routeKey:
    text('route_key')
      .notNull(),

  idempotencyKey:
    text('idempotency_key')
      .notNull(),

  requestHash:
    text('request_hash')
      .notNull(),

  payload:
    jsonb('payload')
      .notNull(),

  status:
    text('status')
      .notNull()
      .default('PREPARED'),

  txHash:
    text('tx_hash'),

  attemptCount:
    integer('attempt_count')
      .notNull()
      .default(0),

  lastErrorCode:
    text('last_error_code'),

  lastErrorMessage:
    text('last_error_message'),

  preparedAt:
    timestamp(
      'prepared_at',
      {
        withTimezone:
          true,
      },
    )
      .notNull()
      .defaultNow(),

  submittedAt:
    timestamp(
      'submitted_at',
      {
        withTimezone:
          true,
      },
    ),

  confirmedAt:
    timestamp(
      'confirmed_at',
      {
        withTimezone:
          true,
      },
    ),

  failedAt:
    timestamp(
      'failed_at',
      {
        withTimezone:
          true,
      },
    ),

  createdAt:
    timestamp(
      'created_at',
      {
        withTimezone:
          true,
      },
    )
      .notNull()
      .defaultNow(),

  updatedAt:
    timestamp(
      'updated_at',
      {
        withTimezone:
          true,
      },
    )
      .notNull()
      .defaultNow(),
}, (t) => [
  uniqueIndex(
    'uq_relay_intents_operation_resource',
  ).on(
    t.operation,
    t.resourceId,
  ),

  uniqueIndex(
    'uq_relay_intents_tx_hash',
  )
    .on(
      t.txHash,
    )
    .where(
      sql`${t.txHash} IS NOT NULL`,
    ),

  index(
    'idx_relay_intents_status_updated',
  ).on(
    t.status,
    t.updatedAt,
  ),

  index(
    'idx_relay_intents_resource',
  ).on(
    t.resourceType,
    t.resourceId,
  ),

  index(
    'idx_relay_intents_idempotency',
  ).on(
    t.routeKey,
    t.idempotencyKey,
  ),

  check(
    'chk_relay_intents_operation',
    sql`
      ${t.operation} IN (
        'REGISTER_AUCTION',
        'MARK_COLLECTED',
        'MARK_WITHDRAWN',
        'SUBMIT_AWARD',
        'WITHDRAW_REFUND',
        'WITHDRAW_CONSIGNOR',
        'REUSE_ROUND'
      )
    `,
  ),

  check(
    'chk_relay_intents_resource_type',
    sql`${t.resourceType} = 'AUCTION'`,
  ),

  check(
    'chk_relay_intents_request_hash',
    sql`${t.requestHash} ~ '^[0-9a-f]{64}$'`,
  ),

  check(
    'chk_relay_intents_status',
    sql`
      ${t.status} IN (
        'PREPARED',
        'SUBMITTED',
        'CONFIRMED',
        'FAILED'
      )
    `,
  ),

  check(
    'chk_relay_intents_tx_hash',
    sql`
      ${t.txHash} IS NULL
      OR
      ${t.txHash} ~ '^0x[0-9a-f]{64}$'
    `,
  ),

  check(
    'chk_relay_intents_attempt_count',
    sql`${t.attemptCount} >= 0`,
  ),

  check(
    'chk_relay_intents_payload',
    sql`
      jsonb_typeof(
        ${t.payload}
      ) = 'object'
    `,
  ),

  check(
    'chk_relay_intents_state',
    sql`
      (
        ${t.status} = 'PREPARED'
        AND ${t.txHash} IS NULL
        AND ${t.submittedAt} IS NULL
        AND ${t.confirmedAt} IS NULL
        AND ${t.failedAt} IS NULL
      )
      OR
      (
        ${t.status} = 'SUBMITTED'
        AND ${t.txHash} IS NOT NULL
        AND ${t.submittedAt} IS NOT NULL
        AND ${t.confirmedAt} IS NULL
        AND ${t.failedAt} IS NULL
      )
      OR
      (
        ${t.status} = 'CONFIRMED'
        AND ${t.txHash} IS NOT NULL
        AND ${t.submittedAt} IS NOT NULL
        AND ${t.confirmedAt} IS NOT NULL
        AND ${t.failedAt} IS NULL
      )
      OR
      (
        ${t.status} = 'FAILED'
        AND ${t.confirmedAt} IS NULL
        AND ${t.failedAt} IS NOT NULL
      )
    `,
  ),

  check(
    'chk_relay_intents_timestamps',
    sql`
      ${t.updatedAt} >=
        ${t.createdAt}
      AND ${t.preparedAt} >=
        ${t.createdAt}
      AND (
        ${t.submittedAt} IS NULL
        OR ${t.submittedAt} >=
          ${t.preparedAt}
      )
      AND (
        ${t.confirmedAt} IS NULL
        OR (
          ${t.submittedAt} IS NOT NULL
          AND ${t.confirmedAt} >=
            ${t.submittedAt}
        )
      )
      AND (
        ${t.failedAt} IS NULL
        OR ${t.failedAt} >=
          ${t.preparedAt}
      )
    `,
  ),
]);

// ─── PRIVILEGED API IDEMPOTENCY ───────────────────────────────────────────────

export const apiIdempotency = pgTable('api_idempotency', {
  id: uuid('id').defaultRandom().primaryKey(),
  actorWallet: text('actor_wallet').notNull(),
  httpMethod: text('http_method').notNull(),
  routeKey: text('route_key').notNull(),
  idempotencyKey: text('idempotency_key').notNull(),
  requestHash: text('request_hash').notNull(),
  status: text('status').notNull().default('PROCESSING'),
  responseStatus: integer('response_status'),
  responseBody: jsonb('response_body'),
  correlationId: text('correlation_id').notNull(),
  lockedAt: timestamp('locked_at', { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('uq_api_idempotency_scope').on(
    t.actorWallet,
    t.httpMethod,
    t.routeKey,
    t.idempotencyKey,
  ),
  index('idx_api_idempotency_expires_at').on(
    t.expiresAt,
  ),
  index('idx_api_idempotency_processing').on(
    t.status,
    t.lockedAt,
  ).where(
    sql`${t.status} = 'PROCESSING'`,
  ),
  check(
    'chk_api_idempotency_wallet',
    sql`${t.actorWallet} ~ '^0x[0-9a-f]{40}$'`,
  ),
  check(
    'chk_api_idempotency_method',
    sql`${t.httpMethod} IN ('POST','PUT','PATCH','DELETE')`,
  ),
  check(
    'chk_api_idempotency_status',
    sql`${t.status} IN ('PROCESSING','COMPLETED','FAILED')`,
  ),
  check(
    'chk_api_idempotency_response',
    sql`
      (
        ${t.status} = 'PROCESSING'
        AND ${t.responseStatus} IS NULL
        AND ${t.responseBody} IS NULL
        AND ${t.completedAt} IS NULL
      )
      OR
      (
        ${t.status} IN ('COMPLETED','FAILED')
        AND ${t.responseStatus} IS NOT NULL
        AND ${t.responseBody} IS NOT NULL
        AND ${t.completedAt} IS NOT NULL
      )
    `,
  ),
  check(
    'chk_api_idempotency_expiry',
    sql`${t.expiresAt} > ${t.createdAt}`,
  ),
]);

// ─── PRIVILEGED API AUDIT LOG ─────────────────────────────────────────────────

export const auditLog = pgTable('audit_log', {
  id: uuid('id').defaultRandom().primaryKey(),
  correlationId: text('correlation_id').notNull(),
  sessionId: text('session_id').notNull(),
  actorWallet: text('actor_wallet').notNull(),
  actorRoles: jsonb('actor_roles').notNull(),
  action: text('action').notNull(),
  resourceType: text('resource_type').notNull(),
  resourceId: text('resource_id'),
  outcome: text('outcome').notNull(),
  metadata: jsonb('metadata').notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('idx_audit_log_correlation_id').on(
    t.correlationId,
  ),
  index('idx_audit_log_actor_created').on(
    t.actorWallet,
    t.createdAt,
  ),
  index('idx_audit_log_resource').on(
    t.resourceType,
    t.resourceId,
    t.createdAt,
  ),
  check(
    'chk_audit_log_wallet',
    sql`${t.actorWallet} ~ '^0x[0-9a-f]{40}$'`,
  ),
  check(
    'chk_audit_log_outcome',
    sql`${t.outcome} IN ('SUCCEEDED','REJECTED','FAILED')`,
  ),
]);

// ─── WALLET AUTHENTICATION CHALLENGES ─────────────────────────────────────────

export const authChallenges = pgTable('auth_challenges', {
  challengeId: text('challenge_id').primaryKey(),
  wallet: text('wallet').notNull(),
  chainId: integer('chain_id').notNull(),
  domain: text('domain').notNull(),
  uri: text('uri').notNull(),
  statement: text('statement').notNull(),
  nonceHash: text('nonce_hash').notNull(),
  messageHash: text('message_hash').notNull(),
  issuedAt: timestamp('issued_at', {
    withTimezone: true,
  }).notNull(),
  expiresAt: timestamp('expires_at', {
    withTimezone: true,
  }).notNull(),
  status: text('status').notNull().default('ACTIVE'),
  consumedAt: timestamp('consumed_at', {
    withTimezone: true,
  }),
  revokedAt: timestamp('revoked_at', {
    withTimezone: true,
  }),
  createdAt: timestamp('created_at', {
    withTimezone: true,
  }).notNull().defaultNow(),
}, (t) => [
  index('idx_auth_challenges_wallet_status').on(
    t.wallet,
    t.status,
  ),
  index('idx_auth_challenges_expires_at').on(
    t.expiresAt,
  ),
  index('idx_auth_challenges_active_expiry')
    .on(
      t.status,
      t.expiresAt,
    )
    .where(
      sql`${t.status} = 'ACTIVE'`,
    ),
  check(
    'chk_auth_challenges_wallet',
    sql`${t.wallet} ~ '^0x[0-9a-f]{40}$'`,
  ),
  check(
    'chk_auth_challenges_chain_id',
    sql`${t.chainId} = 421614`,
  ),
  check(
    'chk_auth_challenges_status',
    sql`${t.status} IN ('ACTIVE','CONSUMED','REVOKED')`,
  ),
  check(
    'chk_auth_challenges_nonce_hash',
    sql`${t.nonceHash} ~ '^0x[0-9a-f]{64}$'`,
  ),
  check(
    'chk_auth_challenges_message_hash',
    sql`${t.messageHash} ~ '^0x[0-9a-f]{64}$'`,
  ),
  check(
    'chk_auth_challenges_time_order',
    sql`${t.issuedAt} < ${t.expiresAt}`,
  ),
  check(
    'chk_auth_challenges_terminal_state',
    sql`
      (
        ${t.status} = 'ACTIVE'
        AND ${t.consumedAt} IS NULL
        AND ${t.revokedAt} IS NULL
      )
      OR
      (
        ${t.status} = 'CONSUMED'
        AND ${t.consumedAt} IS NOT NULL
        AND ${t.revokedAt} IS NULL
      )
      OR
      (
        ${t.status} = 'REVOKED'
        AND ${t.consumedAt} IS NULL
        AND ${t.revokedAt} IS NOT NULL
      )
    `,
  ),
]);
