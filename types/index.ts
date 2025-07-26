export interface Pharmacy {
  id: number;
  name: string;
  address?: string;
  phone?: string;
  createdAt?: string | Date;
}
export interface AuthCredentials {
  fullName: string;
  email: string;
  password: string;
}

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

export type UnitType = 'PIECE' | 'BOTTLE' | 'BOX' | 'VIAL' | 'SACHET' | 'TUBE';

export type DosageFormType =
  | 'TABLET'
  | 'CAPSULE'
  | 'SYRUP'
  | 'SUSPENSION'
  | 'LOZENGE'
  | 'INJECTION'
  | 'CREAM'
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
}

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

export interface Adjustment {
  id: number;
  productId: number;
  name: string;
  quantityChange: number;
  reason: 'DAMAGED' | 'EXPIRED' | 'LOST' | 'THEFT' | 'CORRECTION' | 'RESTOCK';
  createdAt: string | Date;
  currentStock?: number;
  pharmacyId?: number;
  notes?: string;
}

export type PurchaseOrderStatus =
  | 'DRAFT'
  | 'EXPORTED'
  | 'SUBMITTED'
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
    unitCost: string;
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
  supplierName?: string;
  totalItems?: number;
  totalQuantity?: number;
  totalCost: number;
}

export interface PurchaseOrderItem {
  id: number;
  purchaseOrderId: number;
  productId: number;
  quantity: number;
  unitCost: string; // Drizzle decimal => string
  totalCost: string;
  productName?: string;
  productUnit?: string;
}

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
