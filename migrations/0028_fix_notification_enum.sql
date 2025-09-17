-- Ensure OUT_OF_STOCK value exists in notification_type enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'notification_type' AND e.enumlabel = 'OUT_OF_STOCK'
  ) THEN
    ALTER TYPE notification_type ADD VALUE 'OUT_OF_STOCK';
  END IF;
END$$;