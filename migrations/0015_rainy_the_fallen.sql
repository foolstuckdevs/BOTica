ALTER TABLE "products" RENAME COLUMN "batch_number" TO "lot_number";--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "brand_name" varchar(100);