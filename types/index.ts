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

export type UnitType = 'TABLET' | 'CAPSULE' | 'ML' | 'GM' | 'UNIT' | 'VIAL';

export interface Product {
  id: number;
  name: string;
  genericName: string | null;
  categoryId: number | null;
  categoryName: string | null;
  barcode: string | null;
  batchNumber: string;
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

export interface ProductParams {
  name: string;
  genericName?: string;
  categoryId?: number;
  barcode?: string;
  batchNumber: string;
  expiryDate: string;
  quantity: number;
  costPrice: string; // Drizzle expects decimal values as string
  sellingPrice: string;
  minStockLevel?: number;
  unit: UnitType;
  supplierId?: number;
  imageUrl?: string;
  pharmacyId?: number;
}

export interface Adjustment {
  id: number;
  productId: number;
  productName: string;
  quantityChange: number;
  reason: 'DAMAGED' | 'EXPIRED' | 'LOST' | 'THEFT' | 'CORRECTION' | 'RESTOCK';
  createdAt: string | Date;
  currentStock?: number;
  pharmacyId?: number;
}
