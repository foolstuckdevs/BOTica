CREATE TYPE "public"."dosage_form" AS ENUM('TABLET', 'CAPSULE', 'SYRUP', 'SUSPENSION', 'LOZENGE', 'INJECTION', 'CREAM', 'OINTMENT');--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "unit" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."unit";--> statement-breakpoint
CREATE TYPE "public"."unit" AS ENUM('PIECE', 'BOTTLE', 'BOX', 'VIAL', 'SACHET', 'TUBE');--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "unit" SET DATA TYPE "public"."unit" USING "unit"::"public"."unit";--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "dosage_form" "dosage_form" NOT NULL;