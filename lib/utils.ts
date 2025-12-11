import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { supabase } from '@/database/supabase';

const UNIT_LABEL_MAP: Record<string, string> = {
  PIECE: 'PC',
  BOX: 'BOX',
};

const UNIT_WORD_MAP: Record<string, { singular: string; plural: string }> = {
  PIECE: { singular: 'pc', plural: 'pcs' },
  PC: { singular: 'pc', plural: 'pcs' },
  BOX: { singular: 'box', plural: 'boxes' },
};

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatUnitLabel(
  unit?: string | null,
  fallback: string = '-',
): string {
  if (!unit) return fallback;
  const normalized = unit.toUpperCase();
  const label = UNIT_LABEL_MAP[normalized];
  return label ?? unit;
}

type QuantityLabelOptions = {
  fallbackSingular?: string;
  fallbackPlural?: string;
};

export function formatQuantityWithUnit(
  quantity: number | string,
  unit?: string | null,
  options: QuantityLabelOptions = {},
): string {
  const numericValue =
    typeof quantity === 'string' ? Number(quantity) : Number(quantity);
  const safeQuantity = Number.isFinite(numericValue) ? numericValue : 0;
  const normalizedUnit = unit ? unit.toUpperCase() : '';
  const normalizedLabel = formatUnitLabel(normalizedUnit, '').toUpperCase();
  const fallbackSingular = options.fallbackSingular ?? 'unit';
  const fallbackPlural = options.fallbackPlural ?? 'units';
  const defaultForms = {
    singular: normalizedUnit ? normalizedUnit.toLowerCase() : fallbackSingular,
    plural: normalizedUnit
      ? `${normalizedUnit.toLowerCase()}s`
      : fallbackPlural,
  };
  const labels =
    UNIT_WORD_MAP[normalizedUnit] ??
    UNIT_WORD_MAP[normalizedLabel] ??
    defaultForms;
  const isPlural = Math.abs(safeQuantity) > 1;
  const label = isPlural ? labels.plural : labels.singular;
  const quantityText = Number.isFinite(numericValue)
    ? `${safeQuantity}`
    : `${quantity}`;
  return `${quantityText} ${label}`.trim();
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

export async function uploadReceiptToSupabase(
  file: File,
): Promise<{ url: string; error: string | null }> {
  try {
    const bucketName = 'stock-in-receipts';
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    const fileName = `${Date.now()}-${Math.random()
      .toString(36)
      .substring(2)}.${fileExt}`;

    const { error } = await supabase.storage
      .from(bucketName)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      return { url: '', error: error.message };
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(bucketName).getPublicUrl(fileName);

    return { url: publicUrl, error: null };
  } catch {
    return { url: '', error: 'Failed to upload receipt' };
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
