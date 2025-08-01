ALTER TABLE "inventory_adjustments" ALTER COLUMN "reason" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."adjustment_reason";--> statement-breakpoint
CREATE TYPE "public"."adjustment_reason" AS ENUM('DAMAGED', 'EXPIRED', 'LOST_OR_STOLEN', 'STOCK_CORRECTION');--> statement-breakpoint
ALTER TABLE "inventory_adjustments" ALTER COLUMN "reason" SET DATA TYPE "public"."adjustment_reason" USING "reason"::"public"."adjustment_reason";