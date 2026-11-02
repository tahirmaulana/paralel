CREATE TABLE "attestations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auction_id" uuid NOT NULL,
	"round_no" smallint,
	"type" text NOT NULL,
	"signer_wallet" text NOT NULL,
	"payload" jsonb NOT NULL,
	"signature" "bytea" NOT NULL,
	"submitted_tx_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_att_type" CHECK ("attestations"."type" IN ('GUARANTOR_APPROVED','GUARANTOR_REJECTED','NOTARY_APPROVED','BIDDER_AWARD_SIGN','GUARANTOR_COLLECTED','GUARANTOR_WITHDRAWN','CONSIGNOR_CONFIRM','WITHDRAW_REQUEST')),
	CONSTRAINT "chk_att_signer_wallet" CHECK ("attestations"."signer_wallet" ~ '^0x[0-9a-f]{40}$')
);
--> statement-breakpoint
CREATE TABLE "auction_assets" (
	"auction_id" uuid PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"condition" text NOT NULL,
	"condition_notes" text,
	"document_type" text NOT NULL,
	"document_number" text NOT NULL,
	"chassis_number" text,
	"serial_number" text,
	"spec" jsonb NOT NULL,
	"spec_hash" "bytea" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_assets_condition" CHECK ("auction_assets"."condition" IN ('NEW','LIKE_NEW','GOOD','FAIR','DAMAGED')),
	CONSTRAINT "chk_assets_doc_type" CHECK ("auction_assets"."document_type" IN ('CERTIFICATE','INVOICE')),
	CONSTRAINT "chk_assets_damaged_notes" CHECK ("auction_assets"."condition" <> 'DAMAGED' OR "auction_assets"."condition_notes" IS NOT NULL),
	CONSTRAINT "chk_assets_docnum_nul" CHECK ("auction_assets"."document_number" <> 'NUL' OR "auction_assets"."document_type" = 'INVOICE'),
	CONSTRAINT "chk_assets_chassis_not_nul" CHECK ("auction_assets"."chassis_number" IS NULL OR "auction_assets"."chassis_number" <> 'NUL')
);
--> statement-breakpoint
CREATE TABLE "auction_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auction_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"position" smallint,
	"filename" text NOT NULL,
	"extension" text NOT NULL,
	"mime" text NOT NULL,
	"width" integer,
	"height" integer,
	"size_bytes" bigint NOT NULL,
	"content_hash" "bytea" NOT NULL,
	"storage_url" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_files_kind" CHECK ("auction_files"."kind" IN ('PHOTO','DOCUMENT_SCAN')),
	CONSTRAINT "chk_files_photo_position" CHECK ("auction_files"."kind" <> 'PHOTO' OR "auction_files"."position" BETWEEN 1 AND 5)
);
--> statement-breakpoint
CREATE TABLE "auction_rounds" (
	"auction_id" uuid NOT NULL,
	"round_no" smallint NOT NULL,
	"starting_bid" bigint NOT NULL,
	"bid_increment" bigint NOT NULL,
	"scheduled_at" timestamp with time zone,
	"open_at" timestamp with time zone NOT NULL,
	"duration_hours" smallint NOT NULL,
	"close_at" timestamp with time zone NOT NULL,
	"outcome" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pk_auction_rounds" PRIMARY KEY("auction_id","round_no"),
	CONSTRAINT "chk_rounds_starting_bid" CHECK ("auction_rounds"."starting_bid" > 0),
	CONSTRAINT "chk_rounds_bid_increment" CHECK ("auction_rounds"."bid_increment" IN (50000, 500000, 5000000, 50000000, 500000000, 5000000000)),
	CONSTRAINT "chk_rounds_increment_ratio" CHECK ("auction_rounds"."bid_increment" * 20 <= "auction_rounds"."starting_bid"),
	CONSTRAINT "chk_rounds_duration" CHECK ("auction_rounds"."duration_hours" BETWEEN 12 AND 48),
	CONSTRAINT "chk_rounds_outcome" CHECK ("auction_rounds"."outcome" IS NULL OR "auction_rounds"."outcome" IN ('AWARDED','PASSED_IN'))
);
--> statement-breakpoint
CREATE TABLE "auctions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auction_code" text NOT NULL,
	"consignor_id" uuid NOT NULL,
	"guarantor_id" uuid NOT NULL,
	"notary_id" uuid NOT NULL,
	"category" text NOT NULL,
	"currency" text DEFAULT 'USDC' NOT NULL,
	"token_decimals" smallint DEFAULT 6 NOT NULL,
	"status" text NOT NULL,
	"current_round" smallint DEFAULT 1 NOT NULL,
	"pending_at" timestamp with time zone,
	"pending_deadline" timestamp with time zone,
	"fee_config_id" uuid,
	"onchain_tx_hash" text,
	"onchain_registered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "auctions_auction_code_unique" UNIQUE("auction_code"),
	CONSTRAINT "chk_auctions_category" CHECK ("auctions"."category" IN ('OTOMOTIF','PROPERTI','ELEKTRONIK','AKSESORIS_HOBI','PERHIASAN')),
	CONSTRAINT "chk_auctions_currency" CHECK ("auctions"."currency" IN ('USDC')),
	CONSTRAINT "chk_auctions_status" CHECK ("auctions"."status" IN ('CREATED','PENDING','REJECTED','CANCELED','SCHEDULED','OPEN','CLOSED','AWARDING','COLLECTION','CLAIM_PERIOD','SETTLED','PASSED_IN','WITHDRAWN')),
	CONSTRAINT "chk_auctions_current_round" CHECK ("auctions"."current_round" >= 1)
);
--> statement-breakpoint
CREATE TABLE "awarding_attempts" (
	"auction_id" uuid NOT NULL,
	"round_no" smallint NOT NULL,
	"rank" smallint NOT NULL,
	"bidder_wallet" text NOT NULL,
	"request_sent_at" timestamp with time zone NOT NULL,
	"deadline_at" timestamp with time zone NOT NULL,
	"result" text NOT NULL,
	"signed_at" timestamp with time zone,
	"default_fee" bigint,
	"attestation_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pk_awarding_attempts" PRIMARY KEY("auction_id","round_no","rank"),
	CONSTRAINT "chk_awd_rank" CHECK ("awarding_attempts"."rank" BETWEEN 1 AND 10),
	CONSTRAINT "chk_awd_result" CHECK ("awarding_attempts"."result" IN ('PENDING','SIGNED','DEFAULTED'))
);
--> statement-breakpoint
CREATE TABLE "bidder_stakes" (
	"auction_id" uuid NOT NULL,
	"round_no" smallint NOT NULL,
	"bidder_wallet" text NOT NULL,
	"my_bid" bigint NOT NULL,
	"reached_seq" bigint NOT NULL,
	"rank" smallint,
	"status" text NOT NULL,
	"refund_claimed_tx" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pk_bidder_stakes" PRIMARY KEY("auction_id","round_no","bidder_wallet"),
	CONSTRAINT "chk_stakes_rank" CHECK ("bidder_stakes"."rank" IS NULL OR "bidder_stakes"."rank" BETWEEN 1 AND 10),
	CONSTRAINT "chk_stakes_status" CHECK ("bidder_stakes"."status" IN ('ACTIVE','PROVISIONAL','DEFAULTED','WINNER','REFUNDABLE','REFUNDED')),
	CONSTRAINT "chk_stakes_bidder_wallet" CHECK ("bidder_stakes"."bidder_wallet" ~ '^0x[0-9a-f]{40}$')
);
--> statement-breakpoint
CREATE TABLE "bids" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"auction_id" uuid NOT NULL,
	"round_no" smallint NOT NULL,
	"phase" text NOT NULL,
	"bidder_wallet" text NOT NULL,
	"amount_added" bigint NOT NULL,
	"my_bid_after" bigint NOT NULL,
	"current_bid_after" bigint NOT NULL,
	"seq" bigint NOT NULL,
	"block_number" bigint NOT NULL,
	"tx_index" integer NOT NULL,
	"log_index" integer NOT NULL,
	"block_ts" timestamp with time zone NOT NULL,
	"tx_hash" text NOT NULL,
	"client_ms" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_bids_phase" CHECK ("bids"."phase" IN ('PRE_BID','LIVE_BID')),
	CONSTRAINT "chk_bids_bidder_wallet" CHECK ("bids"."bidder_wallet" ~ '^0x[0-9a-f]{40}$')
);
--> statement-breakpoint
CREATE TABLE "chain_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"chain_id" integer NOT NULL,
	"block_number" bigint NOT NULL,
	"block_ts" timestamp with time zone NOT NULL,
	"tx_hash" text NOT NULL,
	"log_index" integer NOT NULL,
	"event_name" text NOT NULL,
	"args" jsonb NOT NULL,
	"processed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "confirmation_codes" (
	"auction_id" uuid PRIMARY KEY NOT NULL,
	"code_hash" "bytea" NOT NULL,
	"issued_by_notary" uuid NOT NULL,
	"signature" "bytea" NOT NULL,
	"emailed_at" timestamp with time zone,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fee_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"platform_bps" integer NOT NULL,
	"guarantor_bps" integer NOT NULL,
	"notary_bps" integer NOT NULL,
	"tax_bps" integer NOT NULL,
	"withdraw_fee" bigint NOT NULL,
	"effective_from" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feed_posts" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"auction_id" uuid NOT NULL,
	"round_no" smallint NOT NULL,
	"kind" text NOT NULL,
	"channel" text NOT NULL,
	"external_id" text,
	"posted_at" timestamp with time zone NOT NULL,
	CONSTRAINT "chk_feed_kind" CHECK ("feed_posts"."kind" IN ('UPCOMING','OPEN','CLOSED')),
	CONSTRAINT "chk_feed_channel" CHECK ("feed_posts"."channel" IN ('APP','X','TELEGRAM'))
);
--> statement-breakpoint
CREATE TABLE "kyc_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"full_name" text NOT NULL,
	"nik" text NOT NULL,
	"address" text NOT NULL,
	"face_verified" boolean DEFAULT false NOT NULL,
	"id_extracted_by_ai" boolean NOT NULL,
	"status" text NOT NULL,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_kyc_nik" CHECK ("kyc_profiles"."nik" ~ '^[0-9]{16}$'),
	CONSTRAINT "chk_kyc_status" CHECK ("kyc_profiles"."status" IN ('PENDING','VERIFIED','FAILED'))
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"auction_id" uuid,
	"channel" text NOT NULL,
	"type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"status" text NOT NULL,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_notif_channel" CHECK ("notifications"."channel" IN ('TELEGRAM','EMAIL','WEB')),
	CONSTRAINT "chk_notif_status" CHECK ("notifications"."status" IN ('QUEUED','SENT','FAILED'))
);
--> statement-breakpoint
CREATE TABLE "partners" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"name" text NOT NULL,
	"category" text,
	"city" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "partners_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "chk_partners_type" CHECK ("partners"."type" IN ('NOTARY','GUARANTOR')),
	CONSTRAINT "chk_partners_category_val" CHECK ("partners"."category" IS NULL OR "partners"."category" IN ('ALL','OTOMOTIF','PROPERTI','ELEKTRONIK','AKSESORIS_HOBI','PERHIASAN')),
	CONSTRAINT "chk_partners_role_shape" CHECK (
    ("partners"."type" = 'GUARANTOR' AND "partners"."category" IS NOT NULL AND "partners"."city" IS NOT NULL)
    OR ("partners"."type" = 'NOTARY' AND "partners"."category" IS NULL)
  )
);
--> statement-breakpoint
CREATE TABLE "payouts" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"auction_id" uuid NOT NULL,
	"round_no" smallint NOT NULL,
	"kind" text NOT NULL,
	"recipient_role" text NOT NULL,
	"recipient_wallet" text NOT NULL,
	"amount" bigint NOT NULL,
	"tx_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_payout_kind" CHECK ("payouts"."kind" IN ('SETTLED','DEFAULT_FEE')),
	CONSTRAINT "chk_payout_role" CHECK ("payouts"."recipient_role" IN ('PLATFORM','GUARANTOR','NOTARY','TAX','CONSIGNOR')),
	CONSTRAINT "chk_payout_wallet" CHECK ("payouts"."recipient_wallet" ~ '^0x[0-9a-f]{40}$')
);
--> statement-breakpoint
CREATE TABLE "receipts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auction_id" uuid NOT NULL,
	"round_no" smallint NOT NULL,
	"type" text NOT NULL,
	"issued_at" timestamp with time zone NOT NULL,
	"auto_issued" boolean DEFAULT false NOT NULL,
	"file_url" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_receipts_type" CHECK ("receipts"."type" IN ('CONSIGNMENT','COLLECTION','WITHDRAWAL'))
);
--> statement-breakpoint
CREATE TABLE "status_log" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"auction_id" uuid NOT NULL,
	"round_no" smallint,
	"from_status" text,
	"to_status" text NOT NULL,
	"actor_user_id" uuid,
	"reason" text,
	"tx_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet" text NOT NULL,
	"user_type" text DEFAULT 'PUBLIC' NOT NULL,
	"email" text,
	"preferred_language" text DEFAULT 'EN' NOT NULL,
	"telegram_chat_id" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_wallet_unique" UNIQUE("wallet"),
	CONSTRAINT "users_telegram_chat_id_unique" UNIQUE("telegram_chat_id"),
	CONSTRAINT "chk_users_wallet" CHECK ("users"."wallet" ~ '^0x[0-9a-f]{40}$'),
	CONSTRAINT "chk_users_user_type" CHECK ("users"."user_type" IN ('PUBLIC','NOTARY','GUARANTOR','PLATFORM')),
	CONSTRAINT "chk_users_pref_lang" CHECK ("users"."preferred_language" IN ('EN','ID'))
);
--> statement-breakpoint
CREATE TABLE "withdrawals" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"auction_id" uuid,
	"round_no" smallint,
	"wallet" text NOT NULL,
	"kind" text NOT NULL,
	"gross_amount" bigint NOT NULL,
	"withdraw_fee" bigint NOT NULL,
	"net_amount" bigint NOT NULL,
	"relayed" boolean NOT NULL,
	"tx_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_wd_kind" CHECK ("withdrawals"."kind" IN ('REFUND','CONSIGNOR_PAYOUT','FEE_BALANCE')),
	CONSTRAINT "chk_wd_wallet" CHECK ("withdrawals"."wallet" ~ '^0x[0-9a-f]{40}$'),
	CONSTRAINT "chk_wd_fee_le_gross" CHECK ("withdrawals"."withdraw_fee" <= "withdrawals"."gross_amount"),
	CONSTRAINT "chk_wd_net_eq" CHECK ("withdrawals"."net_amount" = "withdrawals"."gross_amount" - "withdrawals"."withdraw_fee")
);
--> statement-breakpoint
ALTER TABLE "attestations" ADD CONSTRAINT "attestations_auction_id_auctions_id_fk" FOREIGN KEY ("auction_id") REFERENCES "public"."auctions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auction_assets" ADD CONSTRAINT "auction_assets_auction_id_auctions_id_fk" FOREIGN KEY ("auction_id") REFERENCES "public"."auctions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auction_files" ADD CONSTRAINT "auction_files_auction_id_auctions_id_fk" FOREIGN KEY ("auction_id") REFERENCES "public"."auctions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auction_rounds" ADD CONSTRAINT "auction_rounds_auction_id_auctions_id_fk" FOREIGN KEY ("auction_id") REFERENCES "public"."auctions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auctions" ADD CONSTRAINT "auctions_consignor_id_users_id_fk" FOREIGN KEY ("consignor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auctions" ADD CONSTRAINT "auctions_guarantor_id_partners_id_fk" FOREIGN KEY ("guarantor_id") REFERENCES "public"."partners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auctions" ADD CONSTRAINT "auctions_notary_id_partners_id_fk" FOREIGN KEY ("notary_id") REFERENCES "public"."partners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auctions" ADD CONSTRAINT "auctions_fee_config_id_fee_config_id_fk" FOREIGN KEY ("fee_config_id") REFERENCES "public"."fee_config"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "awarding_attempts" ADD CONSTRAINT "awarding_attempts_auction_id_auctions_id_fk" FOREIGN KEY ("auction_id") REFERENCES "public"."auctions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "awarding_attempts" ADD CONSTRAINT "awarding_attempts_attestation_id_attestations_id_fk" FOREIGN KEY ("attestation_id") REFERENCES "public"."attestations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bidder_stakes" ADD CONSTRAINT "bidder_stakes_auction_id_auctions_id_fk" FOREIGN KEY ("auction_id") REFERENCES "public"."auctions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bids" ADD CONSTRAINT "bids_auction_id_auctions_id_fk" FOREIGN KEY ("auction_id") REFERENCES "public"."auctions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "confirmation_codes" ADD CONSTRAINT "confirmation_codes_auction_id_auctions_id_fk" FOREIGN KEY ("auction_id") REFERENCES "public"."auctions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "confirmation_codes" ADD CONSTRAINT "confirmation_codes_issued_by_notary_partners_id_fk" FOREIGN KEY ("issued_by_notary") REFERENCES "public"."partners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feed_posts" ADD CONSTRAINT "feed_posts_auction_id_auctions_id_fk" FOREIGN KEY ("auction_id") REFERENCES "public"."auctions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kyc_profiles" ADD CONSTRAINT "kyc_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_auction_id_auctions_id_fk" FOREIGN KEY ("auction_id") REFERENCES "public"."auctions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partners" ADD CONSTRAINT "partners_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_auction_id_auctions_id_fk" FOREIGN KEY ("auction_id") REFERENCES "public"."auctions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_auction_id_auctions_id_fk" FOREIGN KEY ("auction_id") REFERENCES "public"."auctions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "status_log" ADD CONSTRAINT "status_log_auction_id_auctions_id_fk" FOREIGN KEY ("auction_id") REFERENCES "public"."auctions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "status_log" ADD CONSTRAINT "status_log_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "withdrawals" ADD CONSTRAINT "withdrawals_auction_id_auctions_id_fk" FOREIGN KEY ("auction_id") REFERENCES "public"."auctions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_auction_photo_slot" ON "auction_files" USING btree ("auction_id","position") WHERE kind = 'PHOTO';--> statement-breakpoint
CREATE INDEX "idx_auctions_status" ON "auctions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_auctions_consignor" ON "auctions" USING btree ("consignor_id");--> statement-breakpoint
CREATE INDEX "idx_auctions_guarantor" ON "auctions" USING btree ("guarantor_id");--> statement-breakpoint
CREATE INDEX "idx_auctions_cat_status" ON "auctions" USING btree ("category","status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_bids_tx_log" ON "bids" USING btree ("tx_hash","log_index");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_chain_events_tx_log" ON "chain_events" USING btree ("chain_id","tx_hash","log_index");