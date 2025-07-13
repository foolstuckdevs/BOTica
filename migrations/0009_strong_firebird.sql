ALTER TABLE "activity_logs" ALTER COLUMN "pharmacy_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "categories" ALTER COLUMN "pharmacy_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "inventory_adjustments" ALTER COLUMN "pharmacy_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "notifications" ALTER COLUMN "pharmacy_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "pharmacy_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "sales" ALTER COLUMN "pharmacy_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "suppliers" ALTER COLUMN "pharmacy_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "pharmacy_id" SET NOT NULL;