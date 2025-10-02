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
  jsonb,
  vector,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// Enums
export const ROLE_ENUM = pgEnum('role', ['Admin', 'Pharmacist']);
export const PAYMENT_METHOD_ENUM = pgEnum('payment_method', ['CASH', 'GCASH']);
export const DOSAGE_FORM_ENUM = pgEnum('dosage_form', [
  'TABLET',
  'CAPSULE',
  'SYRUP',
  'SUSPENSION',
  'INJECTION',
  'OINTMENT',
  'CREAM',
  'GEL',
  'DROPS',
  'INHALER',
  'SPRAY',
  'PATCH',
  'SUPPOSITORY',
  'SOLUTION',
  'LOTION',
  'POWDER',
  'MOUTHWASH',
  'OTHER',
]);

export const UNIT_ENUM = pgEnum('unit', [
  'PIECE', // tablets, capsules, suppositories
  'BOTTLE', // syrups, suspensions, drops, solutions, mouthwash
  'VIAL', // injections
  'SACHET', // ORS, powders
  'TUBE', // ointments, creams, gels
  'BOX', // bulk packs
  'PACK', // inhalers, patches, strips
  'BLISTER', // blister packaging
]);

export const NOTIFICATION_TYPE_ENUM = pgEnum('notification_type', [
  'LOW_STOCK',
  'OUT_OF_STOCK',
  'EXPIRING',
  'EXPIRED',
]);
export const ADJUSTMENT_REASON_ENUM = pgEnum('adjustment_reason', [
  'DAMAGED',
  'EXPIRED',
  'LOST_OR_STOLEN',
  'STOCK_CORRECTION',
]);

export const PURCHASE_ORDER_STATUS_ENUM = pgEnum('purchase_order_status', [
  'DRAFT',
  'EXPORTED',
  'SUBMITTED',
  'CONFIRMED',
  'PARTIALLY_RECEIVED',
  'RECEIVED',
  'CANCELLED',
]);

// Pharmacies
export const pharmacies = pgTable('pharmacies', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  address: text('address'),
  phone: varchar('phone', { length: 20 }),
  createdAt: timestamp('created_at').defaultNow(),
});

// Users
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  fullName: varchar('full_name', { length: 100 }).notNull(),
  email: varchar('email', { length: 100 }).notNull().unique(),
  password: varchar('password', { length: 100 }).notNull(),
  role: ROLE_ENUM('role').notNull().default('Pharmacist'),
  isActive: boolean('is_active').default(true),
  pharmacyId: integer('pharmacy_id')
    .notNull()
    .references(() => pharmacies.id),

  createdAt: timestamp('created_at').defaultNow(),
});

// Categories
export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  description: text('description'),
  pharmacyId: integer('pharmacy_id')
    .notNull()
    .references(() => pharmacies.id),
});

// Suppliers
export const suppliers = pgTable('suppliers', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  contactPerson: varchar('contact_person', { length: 100 }).notNull(),
  phone: varchar('phone', { length: 20 }),
  email: varchar('email', { length: 100 }),
  address: text('address'),
  pharmacyId: integer('pharmacy_id')
    .notNull()
    .references(() => pharmacies.id),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Products
export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  genericName: varchar('generic_name', { length: 100 }),
  categoryId: integer('category_id').references(() => categories.id),
  barcode: varchar('barcode', { length: 50 }),
  lotNumber: varchar('lot_number', { length: 50 }),
  brandName: varchar('brand_name', { length: 100 }),
  dosageForm: DOSAGE_FORM_ENUM('dosage_form'),
  expiryDate: date('expiry_date'),
  quantity: integer('quantity').notNull(),
  costPrice: decimal('cost_price', { precision: 10, scale: 2 }).notNull(),
  sellingPrice: decimal('selling_price', { precision: 10, scale: 2 }).notNull(),
  minStockLevel: integer('min_stock_level').default(10).notNull(),
  unit: UNIT_ENUM('unit'),
  supplierId: integer('supplier_id').references(() => suppliers.id),
  imageUrl: text('image_url'),
  pharmacyId: integer('pharmacy_id')
    .notNull()
    .references(() => pharmacies.id),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  deletedAt: timestamp('deleted_at'),
});

// Sales
export const sales = pgTable('sales', {
  id: serial('id').primaryKey(),
  invoiceNumber: varchar('invoice_number', { length: 20 }).notNull().unique(),
  totalAmount: decimal('total_amount', { precision: 10, scale: 2 }).notNull(),
  discount: decimal('discount', { precision: 10, scale: 2 }).default('0.00'),
  amountReceived: decimal('amount_received', {
    precision: 10,
    scale: 2,
  }).notNull(),
  changeDue: decimal('change_due', { precision: 10, scale: 2 }).notNull(),

  paymentMethod: PAYMENT_METHOD_ENUM('payment_method')
    .notNull()
    .default('CASH'),
  userId: uuid('user_id')
    .references(() => users.id)
    .notNull(),
  pharmacyId: integer('pharmacy_id')
    .notNull()
    .references(() => pharmacies.id),

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

// Notifications
export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  type: NOTIFICATION_TYPE_ENUM('type').notNull(),
  productId: integer('product_id').references(() => products.id),
  message: text('message').notNull(),
  isRead: boolean('is_read').default(false),
  pharmacyId: integer('pharmacy_id')
    .notNull()
    .references(() => pharmacies.id),

  createdAt: timestamp('created_at').defaultNow(),
});

// Activity Logs
export const activityLogs = pgTable('activity_logs', {
  id: serial('id').primaryKey(),
  userId: uuid('user_id')
    .references(() => users.id)
    .notNull(),
  action: varchar('action', { length: 100 }).notNull(),
  description: text('description'),
  pharmacyId: integer('pharmacy_id')
    .notNull()
    .references(() => pharmacies.id),

  createdAt: timestamp('created_at').defaultNow(),
});

// Inventory Adjustments
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
  notes: text('notes'),
  pharmacyId: integer('pharmacy_id')
    .notNull()
    .references(() => pharmacies.id),

  createdAt: timestamp('created_at').defaultNow(),
});

export const purchaseOrders = pgTable('purchase_orders', {
  id: serial('id').primaryKey(),
  orderNumber: varchar('order_number', { length: 20 }).notNull().unique(),
  supplierId: integer('supplier_id')
    .references(() => suppliers.id)
    .notNull(),
  userId: uuid('user_id')
    .references(() => users.id)
    .notNull(),
  orderDate: date('order_date').notNull(),
  status: PURCHASE_ORDER_STATUS_ENUM('status').notNull().default('DRAFT'),
  notes: text('notes'),
  totalCost: decimal('total_cost', { precision: 10, scale: 2 }).default('0.00'), // Only set after confirmation
  pharmacyId: integer('pharmacy_id')
    .notNull()
    .references(() => pharmacies.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const purchaseOrderItems = pgTable('purchase_order_items', {
  id: serial('id').primaryKey(),
  purchaseOrderId: integer('purchase_order_id')
    .references(() => purchaseOrders.id)
    .notNull(),
  productId: integer('product_id')
    .references(() => products.id)
    .notNull(),
  quantity: integer('quantity').notNull(),
  receivedQuantity: integer('received_quantity').default(0).notNull(),
  unitCost: decimal('unit_cost', { precision: 10, scale: 2 }), // NULL until confirmed, then set by supplier
});

// Refresh Tokens (for session renewal / revocation)
export const refreshTokens = pgTable('refresh_tokens', {
  id: serial('id').primaryKey(),
  userId: uuid('user_id')
    .references(() => users.id)
    .notNull(),
  tokenHash: varchar('token_hash', { length: 128 }).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  createdAt: timestamp('created_at').defaultNow(),
  replacedByTokenHash: varchar('replaced_by_token_hash', { length: 128 }),
});

// PNF RAG tables
export const pnfChunks = pgTable('pnf_chunks', {
  id: uuid('id').defaultRandom().primaryKey(),
  content: text('content').notNull(),
  metadata: jsonb('metadata').notNull(),
  embedding: vector('embedding', { dimensions: 3072 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const pnfChatLogs = pgTable('pnf_chat_logs', {
  id: serial('id').primaryKey(),
  question: text('question').notNull(),
  answer: text('answer').notNull(),
  citations: jsonb('citations')
    .default(sql`'[]'::jsonb`)
    .notNull(),
  latencyMs: integer('latency_ms').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});
