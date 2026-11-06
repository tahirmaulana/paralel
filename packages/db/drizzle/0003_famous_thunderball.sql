ALTER TABLE "kyc_profiles" DROP CONSTRAINT "chk_kyc_status";--> statement-breakpoint
ALTER TABLE "kyc_profiles" ADD COLUMN "ktp_photo" text;--> statement-breakpoint
ALTER TABLE "kyc_profiles" ADD COLUMN "admin_comment" text;--> statement-breakpoint
ALTER TABLE "kyc_profiles" ADD CONSTRAINT "chk_kyc_status" CHECK ("kyc_profiles"."status" IN ('UNVERIFIED','VERIFIED'));