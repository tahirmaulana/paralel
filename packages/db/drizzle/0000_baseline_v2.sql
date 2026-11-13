CREATE TABLE "api_idempotency" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_wallet" text NOT NULL,
	"http_method" text NOT NULL,
	"route_key" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"request_hash" text NOT NULL,
	"status" text DEFAULT 'PROCESSING' NOT NULL,
	"response_status" integer,
	"response_body" jsonb,
	"correlation_id" text NOT NULL,
	"locked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_api_idempotency_wallet" CHECK ("api_idempotency"."actor_wallet" ~ '^0x[0-9a-f]{40}$'),
	CONSTRAINT "chk_api_idempotency_method" CHECK ("api_idempotency"."http_method" IN ('POST','PUT','PATCH','DELETE')),
	CONSTRAINT "chk_api_idempotency_status" CHECK ("api_idempotency"."status" IN ('PROCESSING','COMPLETED','FAILED')),
	CONSTRAINT "chk_api_idempotency_response" CHECK (
      (
        "api_idempotency"."status" = 'PROCESSING'
        AND "api_idempotency"."response_status" IS NULL
        AND "api_idempotency"."response_body" IS NULL
        AND "api_idempotency"."completed_at" IS NULL
      )
      OR
      (
        "api_idempotency"."status" IN ('COMPLETED','FAILED')
        AND "api_idempotency"."response_status" IS NOT NULL
        AND "api_idempotency"."response_body" IS NOT NULL
        AND "api_idempotency"."completed_at" IS NOT NULL
      )
    ),
	CONSTRAINT "chk_api_idempotency_expiry" CHECK ("api_idempotency"."expires_at" > "api_idempotency"."created_at")
);
--> statement-breakpoint
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
	"collection_deadline" timestamp with time zone,
	"claim_period_end" timestamp with time zone,
	"outcome" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pk_auction_rounds" PRIMARY KEY("auction_id","round_no"),
	CONSTRAINT "chk_rounds_starting_bid" CHECK ("auction_rounds"."starting_bid" > 0),
	CONSTRAINT "chk_rounds_bid_increment" CHECK ("auction_rounds"."bid_increment" > 0),
	CONSTRAINT "chk_rounds_duration" CHECK ("auction_rounds"."duration_hours" > 0),
	CONSTRAINT "chk_rounds_outcome" CHECK ("auction_rounds"."outcome" IS NULL OR "auction_rounds"."outcome" IN ('AWARDED','PASSED_IN'))
);
--> statement-breakpoint
CREATE TABLE "auctions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auction_code" text NOT NULL,
	"consignor_id" uuid NOT NULL,
	"guarantor_id" uuid NOT NULL,
	"notary_id" uuid,
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
	CONSTRAINT "chk_auctions_status" CHECK (
      "auctions"."status" IN (
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
    ),
	CONSTRAINT "chk_auctions_current_round" CHECK ("auctions"."current_round" >= 1)
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"correlation_id" text NOT NULL,
	"session_id" text NOT NULL,
	"actor_wallet" text NOT NULL,
	"actor_roles" jsonb NOT NULL,
	"action" text NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" text,
	"outcome" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_audit_log_wallet" CHECK ("audit_log"."actor_wallet" ~ '^0x[0-9a-f]{40}$'),
	CONSTRAINT "chk_audit_log_outcome" CHECK ("audit_log"."outcome" IN ('SUCCEEDED','REJECTED','FAILED'))
);
--> statement-breakpoint
CREATE TABLE "auth_challenges" (
	"challenge_id" text PRIMARY KEY NOT NULL,
	"wallet" text NOT NULL,
	"chain_id" integer NOT NULL,
	"domain" text NOT NULL,
	"uri" text NOT NULL,
	"statement" text NOT NULL,
	"nonce_hash" text NOT NULL,
	"message_hash" text NOT NULL,
	"issued_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"consumed_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_auth_challenges_wallet" CHECK ("auth_challenges"."wallet" ~ '^0x[0-9a-f]{40}$'),
	CONSTRAINT "chk_auth_challenges_chain_id" CHECK ("auth_challenges"."chain_id" = 421614),
	CONSTRAINT "chk_auth_challenges_status" CHECK ("auth_challenges"."status" IN ('ACTIVE','CONSUMED','REVOKED')),
	CONSTRAINT "chk_auth_challenges_nonce_hash" CHECK ("auth_challenges"."nonce_hash" ~ '^0x[0-9a-f]{64}$'),
	CONSTRAINT "chk_auth_challenges_message_hash" CHECK ("auth_challenges"."message_hash" ~ '^0x[0-9a-f]{64}$'),
	CONSTRAINT "chk_auth_challenges_time_order" CHECK ("auth_challenges"."issued_at" < "auth_challenges"."expires_at"),
	CONSTRAINT "chk_auth_challenges_terminal_state" CHECK (
      (
        "auth_challenges"."status" = 'ACTIVE'
        AND "auth_challenges"."consumed_at" IS NULL
        AND "auth_challenges"."revoked_at" IS NULL
      )
      OR
      (
        "auth_challenges"."status" = 'CONSUMED'
        AND "auth_challenges"."consumed_at" IS NOT NULL
        AND "auth_challenges"."revoked_at" IS NULL
      )
      OR
      (
        "auth_challenges"."status" = 'REVOKED'
        AND "auth_challenges"."consumed_at" IS NULL
        AND "auth_challenges"."revoked_at" IS NOT NULL
      )
    )
);
--> statement-breakpoint
CREATE TABLE "auth_sessions" (
	"session_id" text PRIMARY KEY NOT NULL,
	"token_hash" text NOT NULL,
	"wallet" text NOT NULL,
	"chain_id" integer NOT NULL,
	"issued_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"last_seen_at" timestamp with time zone NOT NULL,
	"generation" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"revoked_at" timestamp with time zone,
	"revocation_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "auth_sessions_token_hash_unique" UNIQUE("token_hash"),
	CONSTRAINT "chk_auth_sessions_wallet" CHECK ("auth_sessions"."wallet" ~ '^0x[0-9a-f]{40}$'),
	CONSTRAINT "chk_auth_sessions_chain_id" CHECK ("auth_sessions"."chain_id" = 421614),
	CONSTRAINT "chk_auth_sessions_generation" CHECK ("auth_sessions"."generation" >= 0),
	CONSTRAINT "chk_auth_sessions_status" CHECK ("auth_sessions"."status" IN ('ACTIVE','EXPIRED','REVOKED')),
	CONSTRAINT "chk_auth_sessions_revocation_reason" CHECK ("auth_sessions"."revocation_reason" IS NULL OR "auth_sessions"."revocation_reason" IN (
      'USER_LOGOUT',
      'SESSION_ROTATED',
      'WALLET_CHANGED',
      'ROLE_CHANGED',
      'ADMIN_REVOKED',
      'SECURITY_EVENT'
    )),
	CONSTRAINT "chk_auth_sessions_time_order" CHECK ("auth_sessions"."issued_at" < "auth_sessions"."expires_at"),
	CONSTRAINT "chk_auth_sessions_revocation_state" CHECK (
      (
        "auth_sessions"."status" = 'REVOKED'
        AND "auth_sessions"."revoked_at" IS NOT NULL
        AND "auth_sessions"."revocation_reason" IS NOT NULL
      )
      OR
      (
        "auth_sessions"."status" IN ('ACTIVE','EXPIRED')
        AND "auth_sessions"."revoked_at" IS NULL
        AND "auth_sessions"."revocation_reason" IS NULL
      )
    )
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
	"contract_address" text NOT NULL,
	"block_number" bigint NOT NULL,
	"block_hash" text NOT NULL,
	"block_ts" timestamp with time zone NOT NULL,
	"transaction_index" integer NOT NULL,
	"tx_hash" text NOT NULL,
	"log_index" integer NOT NULL,
	"event_name" text NOT NULL,
	"args" jsonb NOT NULL,
	"canonical" boolean DEFAULT true NOT NULL,
	"projection_version" integer DEFAULT 1 NOT NULL,
	"processed" boolean DEFAULT false NOT NULL,
	"processing_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_chain_events_contract_address" CHECK ("chain_events"."contract_address" ~ '^0x[0-9a-f]{40}$'),
	CONSTRAINT "chk_chain_events_block_hash" CHECK ("chain_events"."block_hash" ~ '^0x[0-9a-f]{64}$'),
	CONSTRAINT "chk_chain_events_tx_hash" CHECK ("chain_events"."tx_hash" ~ '^0x[0-9a-f]{64}$'),
	CONSTRAINT "chk_chain_events_transaction_index" CHECK ("chain_events"."transaction_index" >= 0),
	CONSTRAINT "chk_chain_events_log_index_nonnegative" CHECK ("chain_events"."log_index" >= 0),
	CONSTRAINT "chk_chain_events_projection_version" CHECK ("chain_events"."projection_version" >= 1),
	CONSTRAINT "chk_chain_events_processing_state" CHECK (
      (
        "chain_events"."processed" = TRUE
        AND "chain_events"."processing_error" IS NULL
      )
      OR
      (
        "chain_events"."processed" = FALSE
      )
    )
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
	"default_fee_bps" integer NOT NULL,
	"withdraw_fee" bigint NOT NULL,
	"effective_from" timestamp with time zone NOT NULL,
	"source_tx_hash" text,
	"source_log_index" integer,
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
CREATE TABLE "indexer_checkpoint" (
	"chain_id" integer PRIMARY KEY NOT NULL,
	"block_number" bigint NOT NULL,
	"block_hash" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_indexer_checkpoint_chain_id" CHECK ("indexer_checkpoint"."chain_id" > 0),
	CONSTRAINT "chk_indexer_checkpoint_block_number" CHECK ("indexer_checkpoint"."block_number" >= 0),
	CONSTRAINT "chk_indexer_checkpoint_block_hash" CHECK ("indexer_checkpoint"."block_hash" ~ '^0x[0-9a-f]{64}$')
);
--> statement-breakpoint
CREATE TABLE "indexer_state" (
	"id" text PRIMARY KEY NOT NULL,
	"last_scanned_block" bigint NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kyc_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"full_name" text NOT NULL,
	"nik" text NOT NULL,
	"address" text NOT NULL,
	"ktp_photo" text,
	"admin_comment" text,
	"face_verified" boolean DEFAULT false NOT NULL,
	"id_extracted_by_ai" boolean NOT NULL,
	"status" text NOT NULL,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_kyc_nik" CHECK ("kyc_profiles"."nik" ~ '^[0-9]{16}$'),
	CONSTRAINT "chk_kyc_status" CHECK ("kyc_profiles"."status" IN ('UNVERIFIED','VERIFIED'))
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
	"document_number" text,
	"address" text,
	"photo" text,
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
	"auction_id" uuid,
	"round_no" smallint,
	"kind" text,
	"recipient_role" text,
	"recipient_wallet" text NOT NULL,
	"amount" bigint NOT NULL,
	"tx_hash" text NOT NULL,
	"source_log_index" integer NOT NULL,
	"resolution_status" text NOT NULL,
	"resolution_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_payout_kind" CHECK (
      "payouts"."kind" IS NULL
      OR "payouts"."kind" IN (
        'SETTLED',
        'DEFAULT_FEE'
      )
    ),
	CONSTRAINT "chk_payout_role" CHECK (
      "payouts"."recipient_role" IS NULL
      OR "payouts"."recipient_role" IN (
        'PLATFORM',
        'GUARANTOR',
        'NOTARY',
        'TAX',
        'CONSIGNOR'
      )
    ),
	CONSTRAINT "chk_payout_wallet" CHECK (
      "payouts"."recipient_wallet"
        ~ '^0x[0-9a-f]{40}$'
    ),
	CONSTRAINT "chk_payout_source_log_index" CHECK (
      "payouts"."source_log_index" >= 0
    ),
	CONSTRAINT "chk_payout_resolution_status" CHECK (
      "payouts"."resolution_status" IN (
        'RESOLVED',
        'UNRESOLVED'
      )
    ),
	CONSTRAINT "chk_payout_resolution_shape" CHECK (
      (
        "payouts"."resolution_status" =
          'RESOLVED'
        AND "payouts"."auction_id"
          IS NOT NULL
        AND "payouts"."round_no"
          IS NOT NULL
        AND "payouts"."kind"
          IS NOT NULL
        AND "payouts"."recipient_role"
          IS NOT NULL
        AND "payouts"."resolution_error"
          IS NULL
      )
      OR
      (
        "payouts"."resolution_status" =
          'UNRESOLVED'
        AND "payouts"."auction_id"
          IS NULL
        AND "payouts"."round_no"
          IS NULL
        AND "payouts"."kind"
          IS NULL
        AND "payouts"."recipient_role"
          IS NULL
        AND "payouts"."resolution_error"
          IS NOT NULL
        AND length(
          btrim(
            "payouts"."resolution_error"
          )
        ) > 0
      )
    )
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
CREATE TABLE "relay_intents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"operation" text NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" uuid NOT NULL,
	"route_key" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"request_hash" text NOT NULL,
	"payload" jsonb NOT NULL,
	"status" text DEFAULT 'PREPARED' NOT NULL,
	"tx_hash" text,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"last_error_code" text,
	"last_error_message" text,
	"prepared_at" timestamp with time zone DEFAULT now() NOT NULL,
	"submitted_at" timestamp with time zone,
	"confirmed_at" timestamp with time zone,
	"failed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_relay_intents_operation" CHECK (
      "relay_intents"."operation" IN (
        'REGISTER_AUCTION',
        'MARK_COLLECTED',
        'MARK_WITHDRAWN',
        'SUBMIT_AWARD',
        'WITHDRAW_REFUND',
        'WITHDRAW_CONSIGNOR',
        'REUSE_ROUND'
      )
    ),
	CONSTRAINT "chk_relay_intents_resource_type" CHECK ("relay_intents"."resource_type" = 'AUCTION'),
	CONSTRAINT "chk_relay_intents_request_hash" CHECK ("relay_intents"."request_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "chk_relay_intents_status" CHECK (
      "relay_intents"."status" IN (
        'PREPARED',
        'SUBMITTED',
        'CONFIRMED',
        'FAILED'
      )
    ),
	CONSTRAINT "chk_relay_intents_tx_hash" CHECK (
      "relay_intents"."tx_hash" IS NULL
      OR
      "relay_intents"."tx_hash" ~ '^0x[0-9a-f]{64}$'
    ),
	CONSTRAINT "chk_relay_intents_attempt_count" CHECK ("relay_intents"."attempt_count" >= 0),
	CONSTRAINT "chk_relay_intents_payload" CHECK (
      jsonb_typeof(
        "relay_intents"."payload"
      ) = 'object'
    ),
	CONSTRAINT "chk_relay_intents_state" CHECK (
      (
        "relay_intents"."status" = 'PREPARED'
        AND "relay_intents"."tx_hash" IS NULL
        AND "relay_intents"."submitted_at" IS NULL
        AND "relay_intents"."confirmed_at" IS NULL
        AND "relay_intents"."failed_at" IS NULL
      )
      OR
      (
        "relay_intents"."status" = 'SUBMITTED'
        AND "relay_intents"."tx_hash" IS NOT NULL
        AND "relay_intents"."submitted_at" IS NOT NULL
        AND "relay_intents"."confirmed_at" IS NULL
        AND "relay_intents"."failed_at" IS NULL
      )
      OR
      (
        "relay_intents"."status" = 'CONFIRMED'
        AND "relay_intents"."tx_hash" IS NOT NULL
        AND "relay_intents"."submitted_at" IS NOT NULL
        AND "relay_intents"."confirmed_at" IS NOT NULL
        AND "relay_intents"."failed_at" IS NULL
      )
      OR
      (
        "relay_intents"."status" = 'FAILED'
        AND "relay_intents"."confirmed_at" IS NULL
        AND "relay_intents"."failed_at" IS NOT NULL
      )
    ),
	CONSTRAINT "chk_relay_intents_timestamps" CHECK (
      "relay_intents"."updated_at" >=
        "relay_intents"."created_at"
      AND "relay_intents"."prepared_at" >=
        "relay_intents"."created_at"
      AND (
        "relay_intents"."submitted_at" IS NULL
        OR "relay_intents"."submitted_at" >=
          "relay_intents"."prepared_at"
      )
      AND (
        "relay_intents"."confirmed_at" IS NULL
        OR (
          "relay_intents"."submitted_at" IS NOT NULL
          AND "relay_intents"."confirmed_at" >=
            "relay_intents"."submitted_at"
        )
      )
      AND (
        "relay_intents"."failed_at" IS NULL
        OR "relay_intents"."failed_at" >=
          "relay_intents"."prepared_at"
      )
    )
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
CREATE TABLE "user_admins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"added_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_admins_wallet_unique" UNIQUE("wallet"),
	CONSTRAINT "chk_user_admins_wallet" CHECK ("user_admins"."wallet" ~ '^0x[0-9a-f]{40}$'),
	CONSTRAINT "chk_user_admins_added_by" CHECK ("user_admins"."added_by" ~ '^0x[0-9a-f]{40}$')
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
	"source_log_index" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_wd_kind" CHECK (
      "withdrawals"."kind" IN (
        'REFUND',
        'CONSIGNOR_PAYOUT',
        'FEE_BALANCE'
      )
    ),
	CONSTRAINT "chk_wd_wallet" CHECK (
      "withdrawals"."wallet"
        ~ '^0x[0-9a-f]{40}$'
    ),
	CONSTRAINT "chk_wd_fee_le_gross" CHECK (
      "withdrawals"."withdraw_fee"
        <=
      "withdrawals"."gross_amount"
    ),
	CONSTRAINT "chk_wd_net_eq" CHECK (
      "withdrawals"."net_amount"
        =
      "withdrawals"."gross_amount"
        -
      "withdrawals"."withdraw_fee"
    ),
	CONSTRAINT "chk_withdrawals_source_log_index" CHECK (
      "withdrawals"."source_log_index" >= 0
    )
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
ALTER TABLE "relay_intents" ADD CONSTRAINT "relay_intents_resource_id_auctions_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."auctions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "status_log" ADD CONSTRAINT "status_log_auction_id_auctions_id_fk" FOREIGN KEY ("auction_id") REFERENCES "public"."auctions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "status_log" ADD CONSTRAINT "status_log_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "withdrawals" ADD CONSTRAINT "withdrawals_auction_id_auctions_id_fk" FOREIGN KEY ("auction_id") REFERENCES "public"."auctions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_api_idempotency_scope" ON "api_idempotency" USING btree ("actor_wallet","http_method","route_key","idempotency_key");--> statement-breakpoint
CREATE INDEX "idx_api_idempotency_expires_at" ON "api_idempotency" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_api_idempotency_processing" ON "api_idempotency" USING btree ("status","locked_at") WHERE "api_idempotency"."status" = 'PROCESSING';--> statement-breakpoint
CREATE UNIQUE INDEX "uq_attestation_approval" ON "attestations" USING btree ("auction_id","type") WHERE "attestations"."type" IN ('GUARANTOR_APPROVED','NOTARY_APPROVED');--> statement-breakpoint
CREATE UNIQUE INDEX "uq_auction_photo_slot" ON "auction_files" USING btree ("auction_id","position") WHERE kind = 'PHOTO';--> statement-breakpoint
CREATE INDEX "idx_auctions_status" ON "auctions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_auctions_consignor" ON "auctions" USING btree ("consignor_id");--> statement-breakpoint
CREATE INDEX "idx_auctions_guarantor" ON "auctions" USING btree ("guarantor_id");--> statement-breakpoint
CREATE INDEX "idx_auctions_cat_status" ON "auctions" USING btree ("category","status");--> statement-breakpoint
CREATE INDEX "idx_audit_log_correlation_id" ON "audit_log" USING btree ("correlation_id");--> statement-breakpoint
CREATE INDEX "idx_audit_log_actor_created" ON "audit_log" USING btree ("actor_wallet","created_at");--> statement-breakpoint
CREATE INDEX "idx_audit_log_resource" ON "audit_log" USING btree ("resource_type","resource_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_auth_challenges_wallet_status" ON "auth_challenges" USING btree ("wallet","status");--> statement-breakpoint
CREATE INDEX "idx_auth_challenges_expires_at" ON "auth_challenges" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_auth_challenges_active_expiry" ON "auth_challenges" USING btree ("status","expires_at") WHERE "auth_challenges"."status" = 'ACTIVE';--> statement-breakpoint
CREATE INDEX "idx_auth_sessions_wallet_status" ON "auth_sessions" USING btree ("wallet","status");--> statement-breakpoint
CREATE INDEX "idx_auth_sessions_expires_at" ON "auth_sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_bids_tx_log" ON "bids" USING btree ("tx_hash","log_index");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_chain_events_tx_log" ON "chain_events" USING btree ("chain_id","tx_hash","log_index");--> statement-breakpoint
CREATE INDEX "idx_chain_events_canonical_order" ON "chain_events" USING btree ("chain_id","canonical","block_number","transaction_index","log_index");--> statement-breakpoint
CREATE INDEX "idx_chain_events_block_hash" ON "chain_events" USING btree ("chain_id","block_number","block_hash");--> statement-breakpoint
CREATE INDEX "idx_chain_events_pending_order" ON "chain_events" USING btree ("chain_id","block_number","transaction_index","log_index") WHERE "chain_events"."canonical" = TRUE AND "chain_events"."processed" = FALSE;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_fee_config_source_event" ON "fee_config" USING btree ("source_tx_hash","source_log_index");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_payouts_tx_log" ON "payouts" USING btree ("tx_hash","source_log_index");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_relay_intents_operation_resource" ON "relay_intents" USING btree ("operation","resource_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_relay_intents_tx_hash" ON "relay_intents" USING btree ("tx_hash") WHERE "relay_intents"."tx_hash" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_relay_intents_status_updated" ON "relay_intents" USING btree ("status","updated_at");--> statement-breakpoint
CREATE INDEX "idx_relay_intents_resource" ON "relay_intents" USING btree ("resource_type","resource_id");--> statement-breakpoint
CREATE INDEX "idx_relay_intents_idempotency" ON "relay_intents" USING btree ("route_key","idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_withdrawals_tx_log" ON "withdrawals" USING btree ("tx_hash","source_log_index");