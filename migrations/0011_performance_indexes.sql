-- Performance indexes for frequently-queried columns
-- Addresses full-table scans on every page load

-- Products: nearly every query filters by pharmacy_id + deleted_at
CREATE INDEX IF NOT EXISTS idx_products_pharmacy_deleted
  ON products (pharmacy_id, deleted_at);

-- Products: expiry-based reports and notifications
CREATE INDEX IF NOT EXISTS idx_products_pharmacy_expiry
  ON products (pharmacy_id, expiry_date)
  WHERE deleted_at IS NULL;

-- Products: low-stock / out-of-stock queries
CREATE INDEX IF NOT EXISTS idx_products_pharmacy_quantity
  ON products (pharmacy_id, quantity)
  WHERE deleted_at IS NULL;

-- Products: category filtering
CREATE INDEX IF NOT EXISTS idx_products_category
  ON products (category_id)
  WHERE deleted_at IS NULL;

-- Sales: dashboard/report queries always filter by pharmacy + date range
CREATE INDEX IF NOT EXISTS idx_sales_pharmacy_created
  ON sales (pharmacy_id, created_at);

-- Sale Items: every transaction detail fetches items by sale_id
CREATE INDEX IF NOT EXISTS idx_sale_items_sale
  ON sale_items (sale_id);

-- Sale Items: top-selling products, cost aggregations
CREATE INDEX IF NOT EXISTS idx_sale_items_product
  ON sale_items (product_id);

-- Notifications: unread count badge (queried on every page via header)
CREATE INDEX IF NOT EXISTS idx_notifications_pharmacy_read
  ON notifications (pharmacy_id, is_read);

-- Notifications: dedupe check (product + type combo)
CREATE INDEX IF NOT EXISTS idx_notifications_pharmacy_product_type
  ON notifications (pharmacy_id, product_id, type);

-- Activity Logs: recent activity list, dashboard widget
CREATE INDEX IF NOT EXISTS idx_activity_logs_pharmacy_created
  ON activity_logs (pharmacy_id, created_at);

-- Inventory Adjustments: list by product
CREATE INDEX IF NOT EXISTS idx_inv_adjustments_product
  ON inventory_adjustments (product_id);

-- Inventory Adjustments: list by pharmacy + date
CREATE INDEX IF NOT EXISTS idx_inv_adjustments_pharmacy_created
  ON inventory_adjustments (pharmacy_id, created_at);

-- Stock In Items: detail view by stock_in_id
CREATE INDEX IF NOT EXISTS idx_stock_in_items_stock_in
  ON stock_in_items (stock_in_id);

-- Stock Ins: list by pharmacy + date
CREATE INDEX IF NOT EXISTS idx_stock_ins_pharmacy_created
  ON stock_ins (pharmacy_id, created_at);

-- Refresh Tokens: auth token lookup by user
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_active
  ON refresh_tokens (user_id)
  WHERE revoked_at IS NULL;

-- Users: login lookup by email
CREATE INDEX IF NOT EXISTS idx_users_email
  ON users (email);

-- Users: pharmacy member listing
CREATE INDEX IF NOT EXISTS idx_users_pharmacy
  ON users (pharmacy_id);
