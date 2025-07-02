import {
  pgTable,
  serial,
  varchar,
  timestamp,
  boolean,
  integer,
  date,
  text,
  decimal,
  uuid,
  pgEnum,
} from 'drizzle-orm/pg-core';

// Note: add indexes in the future when data retrieval is slow to optimize query performance.

// Enums
export const ROLE_ENUM = pgEnum('role', ['Admin', 'Pharmacist']);
export const PAYMENT_METHOD_ENUM = pgEnum('payment_method', ['CASH', 'GCASH']);
export const UNIT_ENUM = pgEnum('unit', [
  'TABLET',
  'CAPSULE',
  'ML',
  'GM',
  'UNIT',
  'VIAL',
]);
export const NOTIFICATION_TYPE_ENUM = pgEnum('notification_type', [
  'LOW_STOCK',
  'EXPIRING',
  'EXPIRED',
]);

export const ADJUSTMENT_REASON_ENUM = pgEnum('adjustment_reason', [
  'DAMAGED',
  'EXPIRED',
  'LOST',
  'THEFT',
  'CORRECTION',
  'RESTOCK',
]);

// Users
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  fullName: varchar('full_name', { length: 100 }).notNull(),
  email: varchar('email', { length: 100 }).notNull().unique(),
  password: varchar('password', { length: 100 }).notNull(),
  role: ROLE_ENUM('role').notNull().default('Pharmacist'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

// Categories
export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  description: text('description'),
});

// Suppliers
export const suppliers = pgTable('suppliers', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  contactPerson: varchar('contact_person', { length: 100 }).notNull(),
  phone: varchar('phone', { length: 20 }),
  email: varchar('email', { length: 100 }),
  address: text('address'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Products
export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  genericName: varchar('generic_name', { length: 100 }),
  categoryId: integer('category_id').references(() => categories.id),
  barcode: varchar('barcode', { length: 50 }).unique(),
  batchNumber: varchar('batch_number', { length: 50 }).notNull(),
  expiryDate: date('expiry_date').notNull(),
  quantity: integer('quantity').notNull(),
  costPrice: decimal('cost_price', { precision: 10, scale: 2 }).notNull(),
  sellingPrice: decimal('selling_price', { precision: 10, scale: 2 }).notNull(),
  minStockLevel: integer('min_stock_level').default(5),
  unit: UNIT_ENUM('unit').notNull(),
  supplierId: integer('supplier_id').references(() => suppliers.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Sales
export const sales = pgTable('sales', {
  id: serial('id').primaryKey(),
  invoiceNumber: varchar('invoice_number', { length: 20 }).notNull().unique(),
  totalAmount: decimal('total_amount', { precision: 10, scale: 2 }).notNull(),
  discount: decimal('discount', { precision: 10, scale: 2 }).default('0.00'),
  paymentMethod: PAYMENT_METHOD_ENUM('payment_method')
    .notNull()
    .default('CASH'),
  userId: uuid('user_id')
    .references(() => users.id)
    .notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Sale Items
export const saleItems = pgTable('sale_items', {
  id: serial('id').primaryKey(),
  saleId: integer('sale_id')
    .references(() => sales.id)
    .notNull(),
  productId: integer('product_id')
    .references(() => products.id)
    .notNull(),
  quantity: integer('quantity').notNull(),
  unitPrice: decimal('unit_price', { precision: 10, scale: 2 }).notNull(),
  subtotal: decimal('subtotal', { precision: 10, scale: 2 }).notNull(),
});

// Notifications For stock alerts
export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  type: NOTIFICATION_TYPE_ENUM('type').notNull(),
  productId: integer('product_id').references(() => products.id),
  message: text('message').notNull(),
  isRead: boolean('is_read').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

// Activity Logs
export const activityLogs = pgTable('activity_logs', {
  id: serial('id').primaryKey(),
  userId: uuid('user_id')
    .references(() => users.id)
    .notNull(),
  action: varchar('action', { length: 100 }).notNull(), // 'SALE', 'STOCK_UPDATE'
  details: text('details'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const inventoryAdjustments = pgTable('inventory_adjustments', {
  id: serial('id').primaryKey(),
  productId: integer('product_id')
    .references(() => products.id)
    .notNull(),
  userId: uuid('user_id')
    .references(() => users.id)
    .notNull(),
  quantityChange: integer('quantity_change').notNull(),
  reason: ADJUSTMENT_REASON_ENUM('reason').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});
