-- Add helpful indexes for notifications queries
-- Composite index to speed up fetching unread recent notifications per pharmacy
CREATE INDEX IF NOT EXISTS idx_notifications_pharmacy_isread_created
ON notifications (pharmacy_id, is_read, created_at DESC);

-- Composite index to dedupe existence checks per (pharmacy, product, type, unread)
CREATE INDEX IF NOT EXISTS idx_notifications_pharmacy_product_type_unread
ON notifications (pharmacy_id, product_id, type, is_read);
