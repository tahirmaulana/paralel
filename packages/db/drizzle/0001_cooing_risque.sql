CREATE TABLE "indexer_state" (
	"id" text PRIMARY KEY NOT NULL,
	"last_scanned_block" bigint NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "auctions" ALTER COLUMN "notary_id" DROP NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_attestation_approval" ON "attestations" USING btree ("auction_id","type") WHERE "attestations"."type" IN ('GUARANTOR_APPROVED','NOTARY_APPROVED');