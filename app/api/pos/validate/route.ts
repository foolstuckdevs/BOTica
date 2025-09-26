import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/database/drizzle';
import { products } from '@/database/schema';
import { and, eq, sql } from 'drizzle-orm';
import { preflightCartSchema } from '@/lib/validations/sales';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.pharmacyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await req.json();
    const parsed = preflightCartSchema.parse({
      cartItems: body.cartItems,
      pharmacyId: session.user.pharmacyId,
    });

    // Fetch current product states
    const ids = parsed.cartItems.map((c) => c.productId);
    if (ids.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'Empty cart' },
        { status: 400 },
      );
    }

    const rows = await db
      .select({
        id: products.id,
        name: products.name,
        quantity: products.quantity,
        sellingPrice: products.sellingPrice,
        expiryDate: products.expiryDate,
      })
      .from(products)
      .where(
        and(
          sql`${products.deletedAt} IS NULL`,
          eq(products.pharmacyId, parsed.pharmacyId),
          sql`${products.id} = ANY(${ids})`,
        ),
      );

    const issues: Array<{ productId: number; issue: string }> = [];

    for (const item of parsed.cartItems) {
      const prod = rows.find((r) => r.id === item.productId);
      if (!prod) {
        issues.push({ productId: item.productId, issue: 'NOT_FOUND' });
        continue;
      }
      if ((prod.quantity as number) < item.quantity) {
        issues.push({ productId: item.productId, issue: 'INSUFFICIENT_STOCK' });
      }
      // Price mismatch
      if (prod.sellingPrice.toString() !== item.unitPrice) {
        issues.push({ productId: item.productId, issue: 'PRICE_CHANGED' });
      }
      // Expired check (should already be excluded, but double guard)
      if (new Date(prod.expiryDate as string) < new Date()) {
        issues.push({ productId: item.productId, issue: 'EXPIRED' });
      }
    }

    return NextResponse.json({ ok: true, issues, count: issues.length });
  } catch (error) {
    console.error('POS preflight error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    );
  }
}
