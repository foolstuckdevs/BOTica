ALTER TABLE "purchase_orders" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "purchase_orders" ALTER COLUMN "status" SET DEFAULT 'draft'::text;--> statement-breakpoint
DROP TYPE "public"."purchase_order_status";--> statement-breakpoint
CREATE TYPE "public"."purchase_order_status" AS ENUM('draft', 'exported', 'submitted', 'partially_received', 'received', 'cancelled');--> statement-breakpoint
ALTER TABLE "purchase_orders" ALTER COLUMN "status" SET DEFAULT 'draft'::"public"."purchase_order_status";--> statement-breakpoint
ALTER TABLE "purchase_orders" ALTER COLUMN "status" SET DATA TYPE "public"."purchase_order_status" USING "status"::"public"."purchase_order_status";--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "min_stock_level" SET DEFAULT 10;--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "min_stock_level" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "purchase_order_items" ADD COLUMN "received_quantity" integer DEFAULT 0 NOT NULL;