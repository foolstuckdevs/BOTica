'use server';

import { db } from '@/database/drizzle';
import { users } from '@/database/schema';
import { eq, ne, and } from 'drizzle-orm';
import { hash } from 'bcryptjs';
import { z } from 'zod';
import { StaffMember } from '@/types';
import {
  staffMemberParamsSchema,
  createStaffSchema,
  updateStaffStatusSchema,
} from '@/lib/validations';
import { canEditMasterData } from '@/lib/helpers/rbac';

// Get staff members (pharmacists only, exclude current admin)
export const getStaffMembers = async (
  currentUserId: string,
  pharmacyId: number,
): Promise<StaffMember[]> => {
  try {
    const validatedParams = staffMemberParamsSchema.parse({
      currentUserId,
      pharmacyId,
    });

    const userList = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        role: users.role,
        isActive: users.isActive,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(
        and(
          eq(users.pharmacyId, validatedParams.pharmacyId),
          eq(users.role, 'Pharmacist'),
          ne(users.id, validatedParams.currentUserId),
        ),
      )
      .orderBy(users.createdAt);

    return userList.map((user) => ({
      ...user,
      isActive: user.isActive ?? true,
    }));
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Validation error in getStaffMembers:', error.issues);
      throw new Error('Invalid parameters provided');
    }
    console.error('Error fetching staff members:', error);
    throw new Error('Failed to fetch staff members');
  }
};

// Create staff member with pharmacy assignment (admin only)
export const createStaffMember = async (
  data: { fullName: string; email: string; password: string },
  adminPharmacyId: number,
) => {
  try {
    // RBAC: Admin-only for staff management mutations
    if (!(await canEditMasterData())) {
      return { success: false, error: 'Unauthorized' } as const;
    }

    const validatedInput = createStaffSchema.parse({
      data,
      adminPharmacyId,
    });

    const { data: validatedData, adminPharmacyId: validatedPharmacyId } =
      validatedInput;

    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, validatedData.email))
      .limit(1);

    if (existingUser.length > 0) {
      return {
        success: false,
        error: 'Staff member with this email already exists',
      } as const;
    }

    const hashedPassword = await hash(validatedData.password, 10);

    await db.insert(users).values({
      fullName: validatedData.fullName,
      email: validatedData.email,
      password: hashedPassword,
      role: 'Pharmacist',
      pharmacyId: validatedPharmacyId,
    });

    return { success: true } as const;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Validation error in createStaffMember:', error.issues);
      const firstIssue = error.issues[0];
      return {
        success: false,
        error: firstIssue?.message || 'Invalid input data',
      } as const;
    }
    console.error('Error creating staff member:', error);
    return { success: false, error: 'Failed to create staff member' } as const;
  }
};

// Update staff member status (admin only)
export const updateStaffStatus = async (userId: string, isActive: boolean) => {
  try {
    // RBAC: Admin-only for staff management mutations
    if (!(await canEditMasterData())) {
      return { success: false, error: 'Unauthorized' } as const;
    }

    const validatedInput = updateStaffStatusSchema.parse({ userId, isActive });

    await db
      .update(users)
      .set({ isActive: validatedInput.isActive })
      .where(eq(users.id, validatedInput.userId));

    return { success: true } as const;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Validation error in updateStaffStatus:', error.issues);
      return {
        success: false,
        error: 'Invalid input provided',
      } as const;
    }
    console.error('Error updating staff status:', error);
    return { success: false, error: 'Failed to update staff status' } as const;
  }
};
