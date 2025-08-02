import { z } from 'zod';

// Staff member creation validation
export const createStaffMemberSchema = z.object({
  fullName: z
    .string()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name too long')
    .trim(),
  email: z
    .string()
    .email('Invalid email address')
    .max(255, 'Email too long')
    .toLowerCase()
    .trim(),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters')
    .max(100, 'Password too long'),
});

// Staff member parameters validation
export const staffMemberParamsSchema = z.object({
  currentUserId: z.string().uuid('Invalid user ID'),
  pharmacyId: z.number().positive('Invalid pharmacy ID'),
});

// Update staff member status validation
export const updateStaffStatusSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  isActive: z.boolean(),
});

// Staff member creation with pharmacy ID validation
export const createStaffSchema = z.object({
  data: createStaffMemberSchema,
  adminPharmacyId: z.number().positive('Invalid pharmacy ID'),
});
