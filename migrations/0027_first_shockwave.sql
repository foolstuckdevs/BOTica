ALTER TYPE "public"."dosage_form" ADD VALUE 'CREAM';--> statement-breakpoint
ALTER TYPE "public"."dosage_form" ADD VALUE 'GEL';--> statement-breakpoint
ALTER TYPE "public"."dosage_form" ADD VALUE 'DROPS';--> statement-breakpoint
ALTER TYPE "public"."dosage_form" ADD VALUE 'INHALER';--> statement-breakpoint
ALTER TYPE "public"."dosage_form" ADD VALUE 'SPRAY';--> statement-breakpoint
ALTER TYPE "public"."dosage_form" ADD VALUE 'PATCH';--> statement-breakpoint
ALTER TYPE "public"."dosage_form" ADD VALUE 'SUPPOSITORY';--> statement-breakpoint
ALTER TYPE "public"."dosage_form" ADD VALUE 'SOLUTION';--> statement-breakpoint
ALTER TYPE "public"."dosage_form" ADD VALUE 'LOTION';--> statement-breakpoint
ALTER TYPE "public"."dosage_form" ADD VALUE 'POWDER';--> statement-breakpoint
ALTER TYPE "public"."dosage_form" ADD VALUE 'MOUTHWASH';--> statement-breakpoint
ALTER TYPE "public"."dosage_form" ADD VALUE 'OTHER';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'OUT_OF_STOCK' BEFORE 'EXPIRING';--> statement-breakpoint
ALTER TYPE "public"."unit" ADD VALUE 'BOX';--> statement-breakpoint
ALTER TYPE "public"."unit" ADD VALUE 'PACK';--> statement-breakpoint
ALTER TYPE "public"."unit" ADD VALUE 'BLISTER';--> statement-breakpoint
ALTER TABLE "activity_logs" RENAME COLUMN "details" TO "description";