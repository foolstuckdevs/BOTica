// PHARMACY & AUTHENTICATION TYPES

export interface Pharmacy {
  id: number;
  name: string;
  address?: string | null;
  phone?: string;
  createdAt?: string | Date;
}

export interface AuthCredentials {
  fullName: string;
  email: string;
  password: string;
}

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: 'Admin' | 'Pharmacist';
  pharmacyId: number;
  createdAt: Date | null;
}

export interface StaffMember {
  id: string;
  fullName: string;
  email: string;
  role: 'Admin' | 'Pharmacist';
  isActive: boolean;
  createdAt: Date | null;
}

// CATEGORY TYPES

export interface Category {
  id: number;
  name: string;
  description: string | null;
  pharmacyId?: number; // optional for now
}

export type CategoryParams = {
  name: string;
  description: string;
  pharmacyId?: number;
};

// SUPPLIER TYPES

export interface Supplier {
  id: number;
  name: string;
  contactPerson: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  createdAt: Date | string | null;
  updatedAt: Date | string | null;
  pharmacyId?: number;
}

export interface SupplierParams {
  name: string;
  contactPerson: string;
  phone?: string;
  email?: string;
  address?: string;
  pharmacyId?: number;
}

// PRODUCT TYPES & ENUMS

export type UnitType = 'PIECE' | 'BOTTLE' | 'VIAL' | 'SACHET' | 'TUBE';

export type DosageFormType =
  | 'TABLET'
  | 'CAPSULE'
  | 'SYRUP'
  | 'SUSPENSION'
  | 'INJECTION'
  | 'OINTMENT';

export interface Product {
  id: number;
  name: string;
  genericName: string | null;
  categoryId: number | null;
  categoryName: string | null;
  barcode: string | null;
  lotNumber: string;
  brandName?: string | null;
  dosageForm: DosageFormType;
  expiryDate: string; // ISO format if coming from JSON or DB
  quantity: number;
  costPrice: string; // Drizzle decimal maps to string
  sellingPrice: string;
  minStockLevel: number | null;
  unit: UnitType;
  supplierId: number | null;
  supplierName?: string | null;
  imageUrl: string | null;
  createdAt: Date | string | null;
  updatedAt: Date | string | null;
  pharmacyId?: number;
  // Computed field: indicates product has references (sales/adjustments/receipts)
  hasReferences?: boolean;
  deletedAt?: string | Date | null;
}

export interface ProductPOS {
  // Core sales essentials
  id: number;
  name: string;
  sellingPrice: string;
  quantity: number;
  // Batch/expiry tracking (FEFO)
  lotNumber: string;
  expiryDate: string;
  // Enhanced UX
  imageUrl: string | null;
  unit: UnitType;
  brandName: string | null;
}

export interface ProductParams {
  name: string;
  genericName?: string;
  categoryId?: number;
  barcode?: string;
  lotNumber: string;
  brandName?: string;
  dosageForm: DosageFormType;
  expiryDate: string;
  quantity: number;
  costPrice: string; // Drizzle expects decimal values as string
  sellingPrice: string;
  minStockLevel: number;
  unit: UnitType;
  supplierId?: number;
  imageUrl?: string;
  pharmacyId?: number;
}

// INVENTORY & STOCK MANAGEMENT TYPES

export type ProductStockSummary = {
  id: number;
  quantity: number;
  minStockLevel: number;
  expiryDate: string | null;
};

export type LowStockProduct = {
  id: number;
  product: string;
  genericName: string | null;
  currentStock: number;
  minThreshold: number;
  category: string;
};

export interface Adjustment {
  id: number;
  productId: number;
  name: string;
  brandName?: string | null;
  genericName?: string | null;
  lotNumber?: string | null;
  unit?: string | null;
  supplierName?: string | null;
  expiryDate?: string | null;
  quantityChange: number;
  reason: 'DAMAGED' | 'EXPIRED' | 'LOST_OR_STOLEN' | 'STOCK_CORRECTION';
  createdAt: string | Date;
  currentStock?: number;
  pharmacyId?: number;
  notes?: string;
}

// PURCHASE ORDER TYPES

export type PurchaseOrderStatus =
  | 'DRAFT'
  | 'EXPORTED'
  | 'SUBMITTED'
  | 'CONFIRMED'
  | 'PARTIALLY_RECEIVED'
  | 'RECEIVED'
  | 'CANCELLED';

export interface PurchaseOrderParams {
  supplierId: number;
  orderDate: string;
  notes?: string;
  pharmacyId?: number;
  items: {
    productId: number;
    quantity: number;
    unitCost?: string;
  }[];
}

export interface PurchaseOrder {
  id: number;
  orderNumber: string;
  supplierId: number;
  userId: string;
  orderDate: string;
  status: PurchaseOrderStatus;
  notes?: string | null;
  pharmacyId: number;
  createdAt: string;
  updatedAt?: string;
  totalCost: string; // Changed from number to string (decimal from DB)
  // Computed fields (not stored in DB)
  supplierName?: string; // From JOIN with suppliers table
  totalItems?: number; // COUNT of items
  totalQuantity?: number; // SUM of quantities
  userName?: string; // From JOIN with users table
}

export interface PurchaseOrderItem {
  id: number;
  purchaseOrderId: number;
  productId: number;
  quantity: number;
  receivedQuantity?: number;
  unitCost?: string | null; // NULL until confirmed by supplier
  // Computed fields (not stored in DB)
  totalCost?: number; // Calculated: unitCost * quantity
  productName?: string; // From JOIN with products table
  productUnit?: string; // From JOIN with products table
}

// SALES & TRANSACTION

export type PaymentMethod = 'CASH' | 'GCASH';

export interface TransactionItem {
  id: number;
  productName: string;
  quantity: number;
  unitPrice: string;
  subtotal: string;
}

export interface Transaction {
  id: number;
  invoiceNumber: string;
  totalAmount: string;
  discount: string;
  paymentMethod: PaymentMethod;
  createdAt: string | Date;
  amountReceived?: string | number;
  changeDue?: string | number;
  user: {
    id?: number;
    fullName: string;
  };
  items: TransactionItem[];
}

// SALES REPORTS & ANALYTICS

export type PeriodType = 'today' | 'week' | 'month' | 'quarter';

export interface SalesOverviewData {
  totalSales: number;
  totalCost: number;
  profit: number;
  transactions: number;
  totalItems: number;
}

export interface ProductPerformanceData {
  name: string;
  category: string;
  quantity: number;
  revenue: number;
  profit: number;
}

export interface BatchProfitData {
  id: string;
  productName: string;
  batch: string;
  expiry: string;
  qtySold: number;
  qtyRemaining?: number; // Optional for backward compatibility
  cost: number;
  revenue: number;
  profit: number;
  margin: number;
}

export interface ChartDataPoint {
  date: string;
  sales: number;
  purchases: number; // Cost of goods sold
  grossProfit: number;
  transactionCount: number;
}

export interface ChartMetrics {
  totalSales: number;
  totalCost: number;
  totalProfit: number;
  totalTransactions: number;
  profitMargin: number;
  avgDailySales: number;
  avgDailyTransactions: number;
  daysWithSales: number;
}

// INVENTORY REPORTS
export interface InventoryOverviewData {
  totalProducts: number;
  totalValue: number;
  lowStockCount: number;
  expiringCount: number;
  outOfStockCount: number;
}

export interface ExpiringProductData {
  id: number;
  name: string;
  brandName?: string | null;
  lotNumber: string;
  expiryDate: string;
  daysRemaining: number;
  quantity: number;
  value: number;
  sellingPrice: number;
  costPrice: number;
  unit?: string | null;
  categoryId?: number | null;
  categoryName: string;
  urgency: 'critical' | 'warning' | 'normal';
}

export interface LowStockProductData {
  id: number;
  name: string;
  brandName?: string | null;
  lotNumber: string;
  quantity: number;
  reorderPoint: number;
  supplierId?: number | null;
  supplierName: string;
  lastRestockDate: Date | null;
  value: number;
  unit?: string | null;
  categoryId?: number | null;
  categoryName: string;
  status: 'out_of_stock' | 'critical' | 'low';
}

export interface CategoryDistributionData {
  categoryId: number;
  categoryName: string;
  productCount: number;
  totalValue: number;
  totalQuantity: number;
  percentage: number;
}

export interface InventoryValueData {
  range: string;
  count: number;
  totalValue: number;
}
