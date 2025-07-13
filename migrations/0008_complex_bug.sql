CREATE TABLE "pharmacies" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"address" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "pharmacies_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "activity_logs" ADD COLUMN "pharmacy_id" integer;--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "pharmacy_id" integer;--> statement-breakpoint
ALTER TABLE "inventory_adjustments" ADD COLUMN "pharmacy_id" integer;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "pharmacy_id" integer;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "pharmacy_id" integer;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "pharmacy_id" integer;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "pharmacy_id" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "pharmacy_id" integer;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_pharmacy_id_pharmacies_id_fk" FOREIGN KEY ("pharmacy_id") REFERENCES "public"."pharmacies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_pharmacy_id_pharmacies_id_fk" FOREIGN KEY ("pharmacy_id") REFERENCES "public"."pharmacies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_adjustments" ADD CONSTRAINT "inventory_adjustments_pharmacy_id_pharmacies_id_fk" FOREIGN KEY ("pharmacy_id") REFERENCES "public"."pharmacies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_pharmacy_id_pharmacies_id_fk" FOREIGN KEY ("pharmacy_id") REFERENCES "public"."pharmacies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_pharmacy_id_pharmacies_id_fk" FOREIGN KEY ("pharmacy_id") REFERENCES "public"."pharmacies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_pharmacy_id_pharmacies_id_fk" FOREIGN KEY ("pharmacy_id") REFERENCES "public"."pharmacies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_pharmacy_id_pharmacies_id_fk" FOREIGN KEY ("pharmacy_id") REFERENCES "public"."pharmacies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_pharmacy_id_pharmacies_id_fk" FOREIGN KEY ("pharmacy_id") REFERENCES "public"."pharmacies"("id") ON DELETE no action ON UPDATE no action;