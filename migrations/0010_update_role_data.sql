-- Step 2: Update existing records from 'Pharmacist' to 'Pharmacy Assistant'
UPDATE "users" SET "role" = 'Pharmacy Assistant' WHERE "role" = 'Pharmacist';

-- Step 3: Update the default value
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'Pharmacy Assistant'::"public"."role";
