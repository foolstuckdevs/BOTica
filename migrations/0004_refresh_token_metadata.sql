ALTER TABLE "refresh_tokens"
  ADD COLUMN IF NOT EXISTS "created_user_agent" text,
  ADD COLUMN IF NOT EXISTS "created_ip" varchar(45),
  ADD COLUMN IF NOT EXISTS "last_used_at" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "last_used_ip" varchar(45),
  ADD COLUMN IF NOT EXISTS "last_used_user_agent" text;
