DO $$
BEGIN
	-- dosage_form enum additions (idempotent)
	IF NOT EXISTS (
		SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid=t.oid
		WHERE t.typname='dosage_form' AND e.enumlabel='CREAM') THEN
		ALTER TYPE dosage_form ADD VALUE 'CREAM';
	END IF;
	IF NOT EXISTS (
		SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid=t.oid
		WHERE t.typname='dosage_form' AND e.enumlabel='GEL') THEN
		ALTER TYPE dosage_form ADD VALUE 'GEL';
	END IF;
	IF NOT EXISTS (
		SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid=t.oid
		WHERE t.typname='dosage_form' AND e.enumlabel='DROPS') THEN
		ALTER TYPE dosage_form ADD VALUE 'DROPS';
	END IF;
	IF NOT EXISTS (
		SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid=t.oid
		WHERE t.typname='dosage_form' AND e.enumlabel='INHALER') THEN
		ALTER TYPE dosage_form ADD VALUE 'INHALER';
	END IF;
	IF NOT EXISTS (
		SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid=t.oid
		WHERE t.typname='dosage_form' AND e.enumlabel='SPRAY') THEN
		ALTER TYPE dosage_form ADD VALUE 'SPRAY';
	END IF;
	IF NOT EXISTS (
		SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid=t.oid
		WHERE t.typname='dosage_form' AND e.enumlabel='PATCH') THEN
		ALTER TYPE dosage_form ADD VALUE 'PATCH';
	END IF;
	IF NOT EXISTS (
		SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid=t.oid
		WHERE t.typname='dosage_form' AND e.enumlabel='SUPPOSITORY') THEN
		ALTER TYPE dosage_form ADD VALUE 'SUPPOSITORY';
	END IF;
	IF NOT EXISTS (
		SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid=t.oid
		WHERE t.typname='dosage_form' AND e.enumlabel='SOLUTION') THEN
		ALTER TYPE dosage_form ADD VALUE 'SOLUTION';
	END IF;
	IF NOT EXISTS (
		SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid=t.oid
		WHERE t.typname='dosage_form' AND e.enumlabel='LOTION') THEN
		ALTER TYPE dosage_form ADD VALUE 'LOTION';
	END IF;
	IF NOT EXISTS (
		SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid=t.oid
		WHERE t.typname='dosage_form' AND e.enumlabel='POWDER') THEN
		ALTER TYPE dosage_form ADD VALUE 'POWDER';
	END IF;
	IF NOT EXISTS (
		SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid=t.oid
		WHERE t.typname='dosage_form' AND e.enumlabel='MOUTHWASH') THEN
		ALTER TYPE dosage_form ADD VALUE 'MOUTHWASH';
	END IF;
	IF NOT EXISTS (
		SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid=t.oid
		WHERE t.typname='dosage_form' AND e.enumlabel='OTHER') THEN
		ALTER TYPE dosage_form ADD VALUE 'OTHER';
	END IF;

	-- notification_type enum addition (idempotent)
	IF NOT EXISTS (
		SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid=t.oid
		WHERE t.typname='notification_type' AND e.enumlabel='OUT_OF_STOCK') THEN
		ALTER TYPE notification_type ADD VALUE 'OUT_OF_STOCK';
	END IF;

	-- unit enum additions (idempotent)
	IF NOT EXISTS (
		SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid=t.oid
		WHERE t.typname='unit' AND e.enumlabel='BOX') THEN
		ALTER TYPE unit ADD VALUE 'BOX';
	END IF;
	IF NOT EXISTS (
		SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid=t.oid
		WHERE t.typname='unit' AND e.enumlabel='PACK') THEN
		ALTER TYPE unit ADD VALUE 'PACK';
	END IF;
	IF NOT EXISTS (
		SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid=t.oid
		WHERE t.typname='unit' AND e.enumlabel='BLISTER') THEN
		ALTER TYPE unit ADD VALUE 'BLISTER';
	END IF;
END$$;

DO $$
BEGIN
	-- Rename activity_logs.details -> description only if needed
	IF EXISTS (
		SELECT 1 FROM information_schema.columns
		WHERE table_schema='public' AND table_name='activity_logs' AND column_name='details'
	) AND NOT EXISTS (
		SELECT 1 FROM information_schema.columns
		WHERE table_schema='public' AND table_name='activity_logs' AND column_name='description'
	) THEN
		ALTER TABLE activity_logs RENAME COLUMN details TO description;
	END IF;
END$$;