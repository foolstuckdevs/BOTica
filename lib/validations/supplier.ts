import { z } from 'zod';
import { SupplierParams } from '@/types';
import { pharmacyIdSchema } from './common';

export const supplierSchema = z.object({
  name: z.string().min(1, 'Supplier name is required'),
  contactPerson: z.string().min(1, 'Contact person is required'),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
}) satisfies z.ZodType<SupplierParams>;

export const createSupplierSchema = supplierSchema.extend({
  pharmacyId: pharmacyIdSchema,
});

export const updateSupplierSchema = z.object({
  id: z.number().min(1, 'Valid supplier ID is required'),
  pharmacyId: pharmacyIdSchema,
  name: z.string().min(1, 'Supplier name is required'),
  contactPerson: z.string().min(1, 'Contact person is required'),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
});

export const deleteSupplierSchema = z.object({
  id: z.number().min(1, 'Valid supplier ID is required'),
  pharmacyId: pharmacyIdSchema,
});

export const getSuppliersSchema = z.object({
  pharmacyId: pharmacyIdSchema,
});
