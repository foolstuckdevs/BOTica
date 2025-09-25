-- Additional indexes for sales & activity performance patterns
-- Focus: time-range reports, per-pharmacy dashboards, user activity filtering, and product performance aggregation.

-- =====================
-- Sales
-- =====================
-- Recent sales per pharmacy (dashboard & date range queries)
CREATE INDEX IF NOT EXISTS idx_sales_pharmacy_created_at
  ON sales (pharmacy_id, created_at DESC);

-- Sales filtered by user (e.g., cashier performance) within a pharmacy
CREATE INDEX IF NOT EXISTS idx_sales_pharmacy_user_created_at
  ON sales (pharmacy_id, user_id, created_at DESC);

-- =====================
-- Sale Items
-- =====================
-- Product performance aggregation (SUM quantity WHERE product_id IN ...)
CREATE INDEX IF NOT EXISTS idx_sale_items_product_id
  ON sale_items (product_id);

-- Fast lookup of items per sale when expanding invoice details
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id
  ON sale_items (sale_id);

-- =====================
-- Activity Logs
-- =====================
-- Timeline of actions per pharmacy
CREATE INDEX IF NOT EXISTS idx_activity_logs_pharmacy_created_at
  ON activity_logs (pharmacy_id, created_at DESC);

-- User-specific activity filtering in a pharmacy context
CREATE INDEX IF NOT EXISTS idx_activity_logs_pharmacy_user_created_at
  ON activity_logs (pharmacy_id, user_id, created_at DESC);

-- =====================
-- Notes:
-- 1. Evaluate need for partial index on recent sales (e.g., last 90 days) if table grows large:
--    CREATE INDEX CONCURRENTLY idx_sales_recent ON sales (pharmacy_id, created_at) WHERE created_at > now() - interval '90 days';
-- 2. After deployment, run EXPLAIN ANALYZE on frequent report queries to validate planner usage.
-- 3. Drop redundant single-column indexes if added automatically by an ORM in the future to keep bloat low.
