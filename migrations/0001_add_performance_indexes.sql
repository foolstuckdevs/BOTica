-- Performance-oriented composite indexes
-- Rationale: accelerate per-pharmacy filtered + ordered queries used in notifications UI,
-- low-stock / expiring stock scans, and report generation.

-- =====================
-- Notifications
-- =====================
-- Recent notifications per pharmacy (ordered by newest first)
CREATE INDEX IF NOT EXISTS idx_notifications_pharmacy_created_at
  ON notifications (pharmacy_id, created_at DESC);

-- Unread/read filtering per pharmacy
CREATE INDEX IF NOT EXISTS idx_notifications_pharmacy_is_read
  ON notifications (pharmacy_id, is_read);

-- Pattern: WHERE pharmacy_id=? AND product_id=? AND type=? ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_notifications_pharmacy_product_type_created_at
  ON notifications (pharmacy_id, product_id, type, created_at DESC);

-- =====================
-- Products
-- =====================
-- Generic per-pharmacy product lookups
CREATE INDEX IF NOT EXISTS idx_products_pharmacy
  ON products (pharmacy_id);

-- Soft-delete support (filter active vs deleted)
CREATE INDEX IF NOT EXISTS idx_products_pharmacy_deleted_at
  ON products (pharmacy_id, deleted_at);

-- Low / out-of-stock scans (quantity compared against min_stock_level); quantity first helps range scans
CREATE INDEX IF NOT EXISTS idx_products_pharmacy_quantity
  ON products (pharmacy_id, quantity);

-- Expiring products (date range queries)
CREATE INDEX IF NOT EXISTS idx_products_pharmacy_expiry_date
  ON products (pharmacy_id, expiry_date);

-- Threshold comparisons & reporting on configured minimums
CREATE INDEX IF NOT EXISTS idx_products_pharmacy_min_stock_level
  ON products (pharmacy_id, min_stock_level);

-- =====================
-- (Optional Future) Consider partial index for only active (non-deleted) products:
-- CREATE INDEX IF NOT EXISTS idx_products_active_pharmacy ON products (pharmacy_id) WHERE deleted_at IS NULL;
-- Not added now to avoid redundant overlap; evaluate after analyzing query plans.

-- NOTE: Run ANALYZE after deployment or allow autovacuum to update stats.
