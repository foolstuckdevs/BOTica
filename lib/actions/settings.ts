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

// Get staff members (pharmacists only, exclude current admin)
export const getStaffMembers = async (
  currentUserId: string,
  pharmacyId: number,
): Promise<StaffMember[]> => {
  try {
    // Validate input parameters
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
          // Only show Pharmacists from the same pharmacy, exclude current admin
          eq(users.pharmacyId, validatedParams.pharmacyId),
          eq(users.role, 'Pharmacist'),
          ne(users.id, validatedParams.currentUserId),
        ),
      )
      .orderBy(users.createdAt);

    // Map to ensure isActive is never null
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
    // Validate input data
    const validatedInput = createStaffSchema.parse({
      data,
      adminPharmacyId,
    });

    const { data: validatedData, adminPharmacyId: validatedPharmacyId } =
      validatedInput;

    // Check if staff member already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, validatedData.email))
      .limit(1);

    if (existingUser.length > 0) {
      return {
        success: false,
        error: 'Staff member with this email already exists',
      };
    }

    // Hash password
    const hashedPassword = await hash(validatedData.password, 10);

    // Create staff member (always Pharmacist role, with admin's pharmacy)
    await db.insert(users).values({
      fullName: validatedData.fullName,
      email: validatedData.email,
      password: hashedPassword,
      role: 'Pharmacist',
      pharmacyId: validatedPharmacyId,
    });

    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Validation error in createStaffMember:', error.issues);
      const firstIssue = error.issues[0];
      return {
        success: false,
        error: firstIssue?.message || 'Invalid input data',
      };
    }
    console.error('Error creating staff member:', error);
    return { success: false, error: 'Failed to create staff member' };
  }
};

// Update staff member status (admin only)
export const updateStaffStatus = async (userId: string, isActive: boolean) => {
  try {
    // Validate input
    const validatedInput = updateStaffStatusSchema.parse({ userId, isActive });

    // Update staff member status
    await db
      .update(users)
      .set({ isActive: validatedInput.isActive })
      .where(eq(users.id, validatedInput.userId));

    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Validation error in updateStaffStatus:', error.issues);
      return {
        success: false,
        error: 'Invalid input provided',
      };
    }
    console.error('Error updating staff status:', error);
    return { success: false, error: 'Failed to update staff status' };
  }
};
