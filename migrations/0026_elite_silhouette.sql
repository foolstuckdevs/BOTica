ALTER TABLE "products" ALTER COLUMN "dosage_form" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."dosage_form";--> statement-breakpoint
CREATE TYPE "public"."dosage_form" AS ENUM('TABLET', 'CAPSULE', 'SYRUP', 'SUSPENSION', 'INJECTION', 'OINTMENT');--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "dosage_form" SET DATA TYPE "public"."dosage_form" USING "dosage_form"::"public"."dosage_form";--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "unit" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."unit";--> statement-breakpoint
CREATE TYPE "public"."unit" AS ENUM('PIECE', 'BOTTLE', 'VIAL', 'SACHET', 'TUBE');--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "unit" SET DATA TYPE "public"."unit" USING "unit"::"public"."unit";--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "deleted_at" timestamp;