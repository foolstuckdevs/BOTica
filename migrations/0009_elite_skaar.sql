-- Step 1: Add the new enum value to existing enum
-- This needs to be committed before the value can be used
ALTER TYPE "public"."role" ADD VALUE IF NOT EXISTS 'Pharmacy Assistant';