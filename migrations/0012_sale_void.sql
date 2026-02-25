-- Add sale void support: status, voided_at, voided_by, void_reason

-- Create enums
DO $$ BEGIN
  CREATE TYPE "public"."sale_status" AS ENUM('COMPLETED', 'VOIDED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."void_reason" AS ENUM('WRONG_DRUG', 'WRONG_STRENGTH', 'WRONG_QUANTITY');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Add columns to sales table
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "status" "sale_status" NOT NULL DEFAULT 'COMPLETED';
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "voided_at" timestamp;
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "voided_by" uuid;
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "void_reason" "void_reason";

-- Add foreign key for voided_by
DO $$ BEGIN
  ALTER TABLE "sales" ADD CONSTRAINT "sales_voided_by_users_id_fk" FOREIGN KEY ("voided_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Index for filtering by status (most queries will filter COMPLETED)
CREATE INDEX IF NOT EXISTS "sales_status_idx" ON "sales" ("status");
