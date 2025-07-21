//home/iantristanlandagura/Desktop/SCHOOL/BSIT-4/System/BOT-ica/lib/utils.ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { supabase } from '@/database/supabase';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export async function uploadImageToSupabase(
  file: File,
  bucketName: string = 'product-images',
): Promise<{ url: string; error: string | null }> {
  try {
    // Generate a unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random()
      .toString(36)
      .substring(2)}.${fileExt}`;

    // Upload file to Supabase storage
    const { error } = await supabase.storage
      .from(bucketName)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      return { url: '', error: error.message };
    }

    // Get the public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from(bucketName).getPublicUrl(fileName);

    return { url: publicUrl, error: null };
  } catch {
    return { url: '', error: 'Failed to upload image' };
  }
}

export async function deleteImageFromSupabase(
  imageUrl: string,
  bucketName: string = 'product-images',
): Promise<{ error: string | null }> {
  try {
    // Extract filename from URL
    const urlParts = imageUrl.split('/');
    const fileName = urlParts[urlParts.length - 1];

    const { error } = await supabase.storage
      .from(bucketName)
      .remove([fileName]);

    return { error: error?.message || null };
  } catch {
    return { error: 'Failed to delete image' };
  }
}
