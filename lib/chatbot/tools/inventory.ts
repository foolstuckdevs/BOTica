import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { eq, and, like, or, sql, desc } from 'drizzle-orm';
import { db } from '@/database/drizzle';
import { products, categories } from '@/database/schema';
import type { InventoryInfo } from '../types';

/**
 * Extract drug name from conversational queries
 */
function extractDrugName(query: string): string {
  // Common conversational patterns for pharmacy queries
  const patterns = [
    // Clinical info queries - extract drug name after "for" (with typo tolerance)
    /(?:dosage|usage|side effects?|information|details|dose|use|safe|safety|effect|effects?)\s+(?:for|of)\s+(.+?)(?:\s+|\?|$)/i,
    // Handle typos in clinical queries - look for "for [drug]" pattern
    /\b(?:\w+)\s+for\s+(.+?)(?:\s+|\?|$)/i,
    // "How about" pattern
    /(?:how about|what about)\s+(.+?)(?:\s+|\?|$)/i,
    // Stock queries
    /do (?:you|we) have (.+?)(?:\s+in stock|\s+available|\?|$)/i,
    /check (?:stock|inventory) for (.+?)(?:\s+|\?|$)/i,
    /(?:look up|search for|find) (.+?)(?:\s+|\?|$)/i,
    /(.+?)(?:\s+in stock|\s+available|\s+stock)(?:\?|$)/i,
    /(?:get|need|want) (.+?)(?:\s+|\?|$)/i,
    // Generic fallback patterns
    /(.+)/i,
  ];

  const normalizedQuery = query.trim();

  // Try each pattern
  for (const pattern of patterns) {
    const match = normalizedQuery.match(pattern);
    if (match && match[1]) {
      let drugName = match[1].trim();

      // Clean up common words that might get captured
      drugName = drugName.replace(
        /(?:do|you|we|have|check|stock|for|in|available|get|need|want|the|a|an|dosage|usage|side|effects?|information|details|of)\s+/gi,
        '',
      );
      drugName = drugName.replace(
        /\s+(?:in|stock|available|tablets?|capsules?|mg|ml|cream|syrup|dosage|usage|side|effects?)$/gi,
        '',
      );
      drugName = drugName.trim();

      if (drugName && drugName.length > 1) {
        return drugName;
      }
    }
  }

  // If no patterns match, return the original query (it might be just the drug name)
  return normalizedQuery;
}

const InventorySearchSchema = z.object({
  query: z
    .string()
    .describe('Drug name, brand name, or generic name to search for'),
  pharmacyId: z.number().describe('Pharmacy ID to scope the search'),
  limit: z
    .number()
    .optional()
    .default(5)
    .describe('Maximum number of results to return'),
});

/**
 * Inventory Tool for BOTica RAG Chatbot - Philippines Edition
 *
 * This tool searches the pharmacy's inventory (products table) for medications
 * matching the user's query. It performs fuzzy matching on multiple fields and
 * returns structured inventory information with Philippine-specific handling.
 *
 * Features:
 * - Fuzzy search across name, genericName (PH INN names), and brandName fields
 * - Handles both international (Paracetamol) and US (Acetaminophen) drug names
 * - Basic stock availability checking
 * - Pharmacy-scoped results
 * - Category information for OTC/prescription classification
 * - Supports Philippine generic drug naming conventions
 */
export const inventoryTool = new DynamicStructuredTool({
  name: 'inventory_search',
  description: `Search pharmacy inventory for medications. ALWAYS USE THIS TOOL FIRST for any drug-related query to check stock availability, prices, and product details in the Philippine pharmacy database. Handles both brand names and generic names (including Philippine INN names like 'Paracetamol' vs 'Acetaminophen'). Returns product information including stock levels, prices, and expiry dates to enable the inventory-first hybrid flow.`,
  schema: InventorySearchSchema,
  func: async ({ query, pharmacyId, limit }) => {
    try {
      console.log(
        `[InventoryTool] Searching for "${query}" in pharmacy ${pharmacyId}`,
      );

      // Extract drug name from conversational queries
      const drugName = extractDrugName(query);
      console.log(`[InventoryTool] Extracted drug name: "${drugName}"`);

      // Normalize search query
      const searchTerm = drugName.toLowerCase().trim();
      const searchPattern = `%${searchTerm}%`;

      console.log(`[InventoryTool] Search pattern: "${searchPattern}"`);

      // Debug logging (gate behind env var)
      if (process.env.CHATBOT_DEBUG === 'true') {
        // First, let's debug by getting all products for this pharmacy
        const allProducts = await db
          .select({
            name: products.name,
            genericName: products.genericName,
            brandName: products.brandName,
            quantity: products.quantity,
          })
          .from(products)
          .where(
            and(
              eq(products.pharmacyId, pharmacyId),
              sql`${products.deletedAt} IS NULL`,
            ),
          )
          .limit(5);

        console.log(
          `[InventoryTool] Sample products in pharmacy ${pharmacyId}:`,
          allProducts,
        );

        // Check specifically for paracetamol products
        const paracetamolProducts = await db
          .select({
            name: products.name,
            genericName: products.genericName,
            brandName: products.brandName,
            quantity: products.quantity,
          })
          .from(products)
          .where(
            and(
              eq(products.pharmacyId, pharmacyId),
              sql`${products.deletedAt} IS NULL`,
              or(
                like(sql`LOWER(${products.name})`, '%paracetamol%'),
                like(sql`LOWER(${products.genericName})`, '%paracetamol%'),
                like(sql`LOWER(${products.brandName})`, '%paracetamol%'),
              ),
            ),
          );

        console.log(
          `[InventoryTool] Paracetamol search found:`,
          paracetamolProducts,
        );
      }

      // Query inventory with fuzzy matching (include category for classification)
      const results = await db
        .select({
          id: products.id,
          name: products.name,
          genericName: products.genericName,
          brandName: products.brandName,
          dosageForm: products.dosageForm,
          quantity: products.quantity,
          sellingPrice: products.sellingPrice,
          unit: products.unit,
          categoryName: categories.name,
        })
        .from(products)
        .leftJoin(categories, eq(products.categoryId, categories.id))
        .where(
          and(
            eq(products.pharmacyId, pharmacyId),
            // Soft delete check
            sql`${products.deletedAt} IS NULL`,
            // Fuzzy search across multiple fields
            or(
              like(sql`LOWER(${products.name})`, searchPattern),
              like(sql`LOWER(${products.genericName})`, searchPattern),
              like(sql`LOWER(${products.brandName})`, searchPattern),
              // Exact barcode match
              eq(products.barcode, query),
            ),
          ),
        )
        .orderBy(desc(products.updatedAt))
        .limit(limit);

      // Transform results to InventoryInfo format
      const inventoryResults: InventoryInfo[] = results.map((product) => {
        return {
          id: product.id,
          name: product.name,
          genericName: product.genericName || undefined,
          brandName: product.brandName || undefined,
          dosageForm: product.dosageForm,
          quantity: product.quantity,
          sellingPrice: product.sellingPrice,
          inStock: product.quantity > 0,
          unit: product.unit,
          categoryName: product.categoryName || undefined,
        };
      });

      const response = {
        found: inventoryResults.length > 0,
        count: inventoryResults.length,
        results: inventoryResults,
        searchQuery: query,
      };

      console.log(`[InventoryTool] Found ${inventoryResults.length} results`);
      if (inventoryResults.length > 0) {
        console.log(
          `[InventoryTool] Results:`,
          inventoryResults.map((r) => ({
            name: r.name,
            genericName: r.genericName,
            quantity: r.quantity,
          })),
        );
      } else {
        console.log(
          `[InventoryTool] No results found for search pattern: "${searchPattern}"`,
        );
      }
      return JSON.stringify(response, null, 2);
    } catch (error) {
      console.error('[InventoryTool] Database error:', error);
      return JSON.stringify({
        found: false,
        count: 0,
        results: [],
        error: 'Database query failed',
        searchQuery: query,
      });
    }
  },
});

/**
 * Get specific product by ID
 */
export const getProductByIdTool = new DynamicStructuredTool({
  name: 'get_product_by_id',
  description: 'Get detailed information for a specific product by ID',
  schema: z.object({
    productId: z.number().describe('Product ID to retrieve'),
    pharmacyId: z.number().describe('Pharmacy ID for access control'),
  }),
  func: async ({ productId, pharmacyId }) => {
    try {
      const [product] = await db
        .select()
        .from(products)
        .where(
          and(
            eq(products.id, productId),
            eq(products.pharmacyId, pharmacyId),
            sql`${products.deletedAt} IS NULL`,
          ),
        )
        .limit(1);

      if (!product) {
        return JSON.stringify({
          found: false,
          error: 'Product not found',
        });
      }

      return JSON.stringify({
        found: true,
        product,
      });
    } catch (error) {
      console.error('[GetProductTool] Error:', error);
      return JSON.stringify({
        found: false,
        error: 'Failed to retrieve product',
      });
    }
  },
});
