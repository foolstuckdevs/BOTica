CREATE TYPE "public"."stock_in_status" AS ENUM('DRAFT', 'POSTED', 'VOID');--> statement-breakpoint
CREATE TABLE "stock_in_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"stock_in_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"quantity" integer NOT NULL,
	"unit_cost" numeric(10, 2) NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"lot_number" varchar(120),
	"expiry_date" date,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "stock_ins" (
	"id" serial PRIMARY KEY NOT NULL,
	"reference_number" varchar(120) NOT NULL,
	"supplier_id" integer,
	"pharmacy_id" integer NOT NULL,
	"created_by" uuid NOT NULL,
	"delivery_date" date NOT NULL,
	"status" "stock_in_status" DEFAULT 'POSTED' NOT NULL,
	"payment_terms" varchar(120),
	"received_by" varchar(120),
	"prepared_by" varchar(120),
	"notes" text,
	"attachment_url" text,
	"subtotal" numeric(12, 2) DEFAULT '0.00',
	"discount" numeric(12, 2) DEFAULT '0.00',
	"total" numeric(12, 2) DEFAULT '0.00',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "purchase_order_items" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "purchase_orders" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "purchase_order_items" CASCADE;--> statement-breakpoint
DROP TABLE "purchase_orders" CASCADE;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" DROP CONSTRAINT IF EXISTS "password_reset_tokens_token_hash_unique";--> statement-breakpoint
ALTER TABLE "stock_in_items" ADD CONSTRAINT "stock_in_items_stock_in_id_stock_ins_id_fk" FOREIGN KEY ("stock_in_id") REFERENCES "public"."stock_ins"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_in_items" ADD CONSTRAINT "stock_in_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_ins" ADD CONSTRAINT "stock_ins_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_ins" ADD CONSTRAINT "stock_ins_pharmacy_id_pharmacies_id_fk" FOREIGN KEY ("pharmacy_id") REFERENCES "public"."pharmacies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_ins" ADD CONSTRAINT "stock_ins_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
DROP TYPE "public"."purchase_order_status";