CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
    "id" serial PRIMARY KEY NOT NULL,
    "user_id" uuid NOT NULL,
    "token_hash" varchar(128) NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "used_at" timestamp with time zone,
    "created_at" timestamp DEFAULT now()
);

ALTER TABLE "password_reset_tokens"
    ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

CREATE UNIQUE INDEX IF NOT EXISTS "password_reset_tokens_token_hash_idx"
    ON "password_reset_tokens" ("token_hash");

CREATE INDEX IF NOT EXISTS "password_reset_tokens_user_id_idx"
    ON "password_reset_tokens" ("user_id");
