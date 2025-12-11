ALTER TABLE stock_ins
  DROP COLUMN IF EXISTS transaction_number,
  DROP COLUMN IF EXISTS order_number,
  DROP COLUMN IF EXISTS due_date,
  DROP COLUMN IF EXISTS payment_instruction,
  DROP COLUMN IF EXISTS sales_agent,
  DROP COLUMN IF EXISTS packing_boxes,
  DROP COLUMN IF EXISTS packing_plastic,
  DROP COLUMN IF EXISTS received_by,
  DROP COLUMN IF EXISTS prepared_by;

ALTER TABLE stock_in_items
  DROP COLUMN IF EXISTS notes;
