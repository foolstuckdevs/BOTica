/**
 * Inventory Search — for the BOTica chatbot
 *
 * Queries the pharmacy's product inventory by drug / product name and
 * returns a formatted context string that the LLM can use to answer
 * stock-availability, pricing, and formulation questions.
 */

import { db } from '@/database/drizzle';
import { products, categories, suppliers } from '@/database/schema';
import { sql, and, eq } from 'drizzle-orm';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface InventoryProduct {
  id: number;
  name: string;
  brandName: string | null;
  genericName: string | null;
  dosageForm: string | null;
  quantity: number;
  sellingPrice: string;
  expiryDate: string | null;
  minStockLevel: number;
  unit: string | null;
  categoryName: string | null;
  supplierName: string | null;
}

/* ------------------------------------------------------------------ */
/*  Search                                                             */
/* ------------------------------------------------------------------ */

/**
 * Fuzzy-search the pharmacy's inventory for products matching the given
 * drug / product name.  Matches against product name, brand name, and
 * generic name (case-insensitive).
 *
 * @param pharmacyId  The pharmacy whose inventory to search.
 * @param drugName    The drug / product name extracted from the user query.
 * @param limit       Maximum number of rows to return (default 10).
 */
export async function searchInventory(
  pharmacyId: number,
  drugName: string,
  limit = 10,
): Promise<InventoryProduct[]> {
  const trimmed = drugName.trim();
  if (!trimmed) return [];

  const selectFields = {
    id: products.id,
    name: products.name,
    brandName: products.brandName,
    genericName: products.genericName,
    dosageForm: products.dosageForm,
    quantity: products.quantity,
    sellingPrice: products.sellingPrice,
    expiryDate: products.expiryDate,
    minStockLevel: products.minStockLevel,
    unit: products.unit,
    categoryName: categories.name,
    supplierName: suppliers.name,
  };

  const baseWhere = and(
    eq(products.pharmacyId, pharmacyId),
    sql`${products.deletedAt} IS NULL`,
  );

  // --- Attempt 1: full-phrase ILIKE ---
  const pattern = `%${trimmed}%`;
  const rows = await db
    .select(selectFields)
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .leftJoin(suppliers, eq(products.supplierId, suppliers.id))
    .where(
      and(
        baseWhere,
        sql`(
          ${products.name} ILIKE ${pattern}
          OR ${products.brandName} ILIKE ${pattern}
          OR ${products.genericName} ILIKE ${pattern}
        )`,
      ),
    )
    .orderBy(products.name)
    .limit(limit);

  if (rows.length > 0) return rows as InventoryProduct[];

  // --- Attempt 2: word-by-word fallback (any individual word ≥ 3 chars) ---
  const words = trimmed.split(/\s+/).filter((w) => w.length >= 3);
  if (words.length > 1) {
    // Build: (name ILIKE '%word1%' OR brand ILIKE '%word1%' OR generic ILIKE '%word1%')
    //   OR  (name ILIKE '%word2%' OR ...)
    const orClauses = words
      .map((w) => {
        const p = `%${w}%`;
        return sql`(${products.name} ILIKE ${p} OR ${products.brandName} ILIKE ${p} OR ${products.genericName} ILIKE ${p})`;
      });

    const wordFilter = sql.join(orClauses, sql` OR `);

    const rows2 = await db
      .select(selectFields)
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(suppliers, eq(products.supplierId, suppliers.id))
      .where(and(baseWhere, wordFilter))
      .orderBy(products.name)
      .limit(limit);

    return rows2 as InventoryProduct[];
  }

  return [];
}

/* ------------------------------------------------------------------ */
/*  Context builder                                                    */
/* ------------------------------------------------------------------ */

/**
 * Convert inventory search results into a plain-text context block that
 * the LLM can read when composing its answer.
 */
export function buildInventoryContext(items: InventoryProduct[]): string {
  if (!items.length) {
    return 'INVENTORY: No matching products found in this pharmacy\'s inventory.';
  }

  const today = new Date();

  const lines = items.map((p, i) => {
    // Stock status
    let stockStatus: string;
    if (p.quantity === 0) {
      stockStatus = 'OUT OF STOCK';
    } else if (p.quantity <= p.minStockLevel) {
      stockStatus = `LOW STOCK — only ${p.quantity} ${p.unit ?? 'unit(s)'} remaining`;
    } else {
      stockStatus = `IN STOCK — ${p.quantity} ${p.unit ?? 'unit(s)'} available`;
    }

    // Expiry status
    let expiryNote = '';
    if (p.expiryDate) {
      const expiry = new Date(p.expiryDate);
      const daysLeft = Math.ceil(
        (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (daysLeft < 0) {
        expiryNote = `Expiry: ${p.expiryDate} — EXPIRED`;
      } else if (daysLeft <= 90) {
        expiryNote = `Expiry: ${p.expiryDate} — expiring in ${daysLeft} day(s)`;
      } else {
        expiryNote = `Expiry: ${p.expiryDate}`;
      }
    }

    const fields = [
      `[Inventory ${i + 1}]`,
      `Product Name: ${p.name}`,
      p.brandName ? `Brand: ${p.brandName}` : null,
      p.genericName ? `Generic Name: ${p.genericName}` : null,
      p.dosageForm ? `Dosage Form: ${p.dosageForm.replace(/_/g, ' ')}` : null,
      `Selling Price: ₱${Number(p.sellingPrice).toFixed(2)} per ${p.unit ?? 'unit'}`,
      `Stock Status: ${stockStatus}`,
      expiryNote || null,
      p.categoryName ? `Category: ${p.categoryName}` : null,
    ]
      .filter(Boolean)
      .join('\n');

    return fields;
  });

  return `INVENTORY DATA (pharmacy stock):\n\n${lines.join('\n\n---\n\n')}`;
}
