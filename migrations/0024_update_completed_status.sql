-- Update any existing COMPLETED orders to RECEIVED status before applying the enum change
UPDATE "purchase_orders" SET "status" = 'RECEIVED' WHERE "status" = 'COMPLETED';
