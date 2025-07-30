ALTER TABLE "purchase_order_items" ALTER COLUMN "unit_cost" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD COLUMN "total_cost" numeric(10, 2) DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD COLUMN "updated_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "purchase_order_items" DROP COLUMN "total_cost";