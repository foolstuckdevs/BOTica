export const runtime = 'nodejs'; // needed for Supabase file handling

import { NextRequest, NextResponse } from 'next/server';
import { uploadImageToSupabase, uploadReceiptToSupabase } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string; // 'image' or 'receipt'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Handle receipt uploads (images + PDFs)
    if (type === 'receipt') {
      const allowedTypes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp',
        'application/pdf',
      ];
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json(
          {
            error:
              'Invalid file type. Only JPEG, PNG, WebP, and PDF are allowed.',
          },
          { status: 400 },
        );
      }

      const maxSize = 10 * 1024 * 1024; // 10MB for receipts
      if (file.size > maxSize) {
        return NextResponse.json(
          { error: 'File size too large. Maximum size is 10MB.' },
          { status: 400 },
        );
      }

      const { url, error } = await uploadReceiptToSupabase(file);

      if (error) {
        return NextResponse.json(
          { error: `Upload failed: ${error}` },
          { status: 500 },
        );
      }

      return NextResponse.json({ url });
    }

    // Default: Handle image uploads
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed.' },
        { status: 400 },
      );
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size too large. Maximum size is 5MB.' },
        { status: 400 },
      );
    }

    const { url, error } = await uploadImageToSupabase(file);

    if (error) {
      return NextResponse.json(
        { error: `Upload failed: ${error}` },
        { status: 500 },
      );
    }

    return NextResponse.json({ url });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
