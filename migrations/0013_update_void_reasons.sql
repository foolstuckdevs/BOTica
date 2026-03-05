-- Migration: Rename drug-specific void reasons to general product reasons
-- and add new general-purpose reasons (CUSTOMER_REQUEST, PRICING_ERROR).
--
-- PostgreSQL does not support renaming enum labels directly,
-- so we: (1) add new values, (2) update existing rows, (3) rebuild the enum.

BEGIN;

-- Step 1 — Add the new labels to the existing enum (safe & idempotent)
DO $$
BEGIN
  -- Add new values if they don't already exist
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'WRONG_PRODUCT'       AND enumtypid = 'void_reason'::regtype) THEN
    ALTER TYPE void_reason ADD VALUE 'WRONG_PRODUCT';
  END IF;
END $$;

-- We must commit the ADD VALUE before we can use it in DML,
-- so we split into a second transaction block.
COMMIT;

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'WRONG_SPECIFICATION' AND enumtypid = 'void_reason'::regtype) THEN
    ALTER TYPE void_reason ADD VALUE 'WRONG_SPECIFICATION';
  END IF;
END $$;

COMMIT;

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'CUSTOMER_REQUEST'    AND enumtypid = 'void_reason'::regtype) THEN
    ALTER TYPE void_reason ADD VALUE 'CUSTOMER_REQUEST';
  END IF;
END $$;

COMMIT;

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'PRICING_ERROR'       AND enumtypid = 'void_reason'::regtype) THEN
    ALTER TYPE void_reason ADD VALUE 'PRICING_ERROR';
  END IF;
END $$;

COMMIT;

-- Step 2 — Migrate existing rows from old values → new values
BEGIN;

UPDATE sales SET void_reason = 'WRONG_PRODUCT'       WHERE void_reason = 'WRONG_DRUG';
UPDATE sales SET void_reason = 'WRONG_SPECIFICATION'  WHERE void_reason = 'WRONG_STRENGTH';
-- WRONG_QUANTITY stays as-is

-- Step 3 — Rebuild enum without the old drug-specific labels
-- (create new type → swap column → drop old type)

ALTER TYPE void_reason RENAME TO void_reason_old;

CREATE TYPE void_reason AS ENUM (
  'WRONG_PRODUCT',
  'WRONG_SPECIFICATION',
  'WRONG_QUANTITY',
  'CUSTOMER_REQUEST',
  'PRICING_ERROR'
);

ALTER TABLE sales
  ALTER COLUMN void_reason TYPE void_reason
  USING void_reason::text::void_reason;

DROP TYPE void_reason_old;

COMMIT;
