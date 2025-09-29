import { Document } from '@langchain/core/documents';
import { db } from '../../../../database/drizzle';
import { products, categories, suppliers } from '../../../../database/schema';
import { eq, ilike, or, sql, and, isNull } from 'drizzle-orm';
import { BaseRAGRetriever } from '../base-classes';
import type {
  DetectedIntent,
  RetrievalContext,
  InventoryMatch,
} from '../types';

/**
 * Type for database query results
 */
type ProductSearchResult = {
  id: number;
  name: string;
  genericName: string | null;
  brandName: string | null;
  quantity: number;
  sellingPrice: string;
  dosageForm: string | null;
  unit: string | null;
  categoryName: string | null;
  supplierName: string | null;
  expiryDate: string | null;
  minStockLevel: number;
};

/**
 * Inventory retriever that searches pharmacy products using direct SQL queries
 * Focuses on finding medications that match user queries from the local inventory
 */
export class InventoryRetriever extends BaseRAGRetriever {
  constructor(config: { maxResults?: number; enableFuzzy?: boolean } = {}) {
    super({
      maxResults: 10,
      enableFuzzy: true,
      ...config,
    });
  }

  /**
   * Main LangChain retrieval method
   */
  async _getRelevantDocuments(query: string): Promise<Document[]> {
    const matches = await this.searchInventory(query);

    return matches.map(
      (match) =>
        new Document({
          pageContent: this.formatProductForRetrieval(match),
          metadata: {
            type: 'inventory',
            productId: match.id,
            name: match.name,
            genericName: match.genericName,
            category: match.category,
            inStock: match.inStock,
            price: match.price,
          },
        }),
    );
  }

  /**
   * Context-aware retrieval using detected intent
   */
  async retrieveWithContext(
    intent: DetectedIntent,
    context: RetrievalContext,
  ): Promise<Document[]> {
    console.log(
      `[InventoryRetriever] Searching for "${intent.drugName}" with intent: ${intent.type}`,
    );

    const matches = await this.searchInventory(intent.drugName);

    // Store matches in context for downstream retrievers
    context.inventoryMatches = matches;

    return matches.map(
      (match) =>
        new Document({
          pageContent: this.formatProductForRetrieval(match, intent),
          metadata: {
            type: 'inventory',
            productId: match.id,
            name: match.name,
            genericName: match.genericName,
            category: match.category,
            inStock: match.inStock,
            price: match.price,
            relevantFor: intent.type,
            confidence: this.calculateMatchScore(match, intent.drugName),
          },
        }),
    );
  }

  /**
   * Search inventory for medications matching the query
   */
  private async searchInventory(query: string): Promise<InventoryMatch[]> {
    try {
      const searchTerm = this.normalizeSearchTerm(query);
      const maxResults = this.config.maxResults as number;

      // Build the search query with joins to get category names
      const searchQuery = db
        .select({
          id: products.id,
          name: products.name,
          genericName: products.genericName,
          brandName: products.brandName,
          quantity: products.quantity,
          sellingPrice: products.sellingPrice,
          dosageForm: products.dosageForm,
          unit: products.unit,
          categoryName: categories.name,
          supplierName: suppliers.name,
          expiryDate: products.expiryDate,
          minStockLevel: products.minStockLevel,
        })
        .from(products)
        .leftJoin(categories, eq(products.categoryId, categories.id))
        .leftJoin(suppliers, eq(products.supplierId, suppliers.id))
        .where(
          and(
            isNull(products.deletedAt), // Only non-deleted products
            or(
              ilike(products.name, `%${searchTerm}%`),
              ilike(products.genericName, `%${searchTerm}%`),
              ilike(products.brandName, `%${searchTerm}%`),
              // Add fuzzy matching if enabled
              ...(this.config.enableFuzzy
                ? [this.buildFuzzyConditions(searchTerm)]
                : []),
            ),
          ),
        )
        .orderBy(
          // Prioritize exact matches
          sql`CASE 
            WHEN LOWER(${products.name}) = LOWER(${searchTerm}) THEN 1
            WHEN LOWER(${products.genericName}) = LOWER(${searchTerm}) THEN 2
            WHEN LOWER(${products.brandName}) = LOWER(${searchTerm}) THEN 3
            ELSE 4 
          END`,
          // Then by stock status
          sql`CASE WHEN ${products.quantity} > 0 THEN 0 ELSE 1 END`,
        )
        .limit(maxResults);

      const results = await searchQuery;

      // Transform database results to InventoryMatch format
      const matches: InventoryMatch[] = results.map(
        (row: ProductSearchResult) => ({
          id: row.id.toString(),
          name: row.name,
          genericName: row.genericName || undefined,
          category: row.categoryName || 'Unknown',
          brand: row.brandName || undefined,
          inStock: row.quantity > 0,
          price: row.sellingPrice ? parseFloat(row.sellingPrice) : undefined,
          description: this.buildProductDescription(row),
        }),
      );

      console.log(
        `[InventoryRetriever] Found ${matches.length} matches for "${searchTerm}"`,
      );
      return matches;
    } catch (error) {
      console.error('[InventoryRetriever] Search error:', error);
      return [];
    }
  }

  /**
   * Build fuzzy matching conditions for broader search
   */
  private buildFuzzyConditions(searchTerm: string) {
    // Split search term into words for partial matching
    const words = searchTerm.split(/\s+/).filter((word) => word.length > 2);

    const conditions = words.flatMap((word) => [
      ilike(products.name, `%${word}%`),
      ilike(products.genericName, `%${word}%`),
      ilike(products.brandName, `%${word}%`),
    ]);

    return or(...conditions);
  }

  /**
   * Calculate match score for ranking
   */
  private calculateMatchScore(match: InventoryMatch, query: string): number {
    const normalizedQuery = query.toLowerCase();
    let score = 0;

    // Exact name match
    if (match.name.toLowerCase() === normalizedQuery) score += 1.0;
    else if (match.name.toLowerCase().includes(normalizedQuery)) score += 0.8;

    // Generic name match
    if (match.genericName?.toLowerCase() === normalizedQuery) score += 0.9;
    else if (match.genericName?.toLowerCase().includes(normalizedQuery))
      score += 0.7;

    // Brand name match
    if (match.brand?.toLowerCase() === normalizedQuery) score += 0.8;
    else if (match.brand?.toLowerCase().includes(normalizedQuery)) score += 0.6;

    // Stock availability bonus
    if (match.inStock) score += 0.1;

    return Math.min(score, 1.0);
  }

  /**
   * Normalize search term for better matching
   */
  private normalizeSearchTerm(term: string): string {
    return term
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/\s+/g, ' '); // Normalize spaces
  }

  /**
   * Build product description from database row
   */
  private buildProductDescription(row: ProductSearchResult): string {
    const parts = [];

    if (row.genericName && row.genericName !== row.name) {
      parts.push(`Generic: ${row.genericName}`);
    }

    if (row.brandName) {
      parts.push(`Brand: ${row.brandName}`);
    }

    if (row.dosageForm) {
      parts.push(`Form: ${row.dosageForm}`);
    }

    parts.push(`Stock: ${row.quantity} ${row.unit || 'units'}`);

    if (row.sellingPrice) {
      parts.push(`Price: ₱${row.sellingPrice}`);
    }

    return parts.join(' | ');
  }

  /**
   * Format product information for retrieval context
   */
  private formatProductForRetrieval(
    match: InventoryMatch,
    intent?: DetectedIntent,
  ): string {
    const lines = [
      `Product: ${match.name}`,
      match.genericName ? `Generic Name: ${match.genericName}` : '',
      match.brand ? `Brand: ${match.brand}` : '',
      `Category: ${match.category}`,
      `In Stock: ${match.inStock ? 'Yes' : 'No'}`,
      match.price ? `Price: ₱${match.price}` : '',
    ].filter(Boolean);

    // Add intent-specific context
    if (intent?.type === 'dosage') {
      lines.push('Note: Dosage information needed from clinical sources');
    } else if (intent?.type === 'usage') {
      lines.push('Note: Usage information needed from clinical sources');
    } else if (intent?.type === 'side-effects') {
      lines.push('Note: Side effects information needed from clinical sources');
    }

    return lines.join('\n');
  }

  /**
   * Get top matching products for a query
   */
  async getTopMatches(
    query: string,
    limit: number = 5,
  ): Promise<InventoryMatch[]> {
    const matches = await this.searchInventory(query);
    return matches
      .sort(
        (a, b) =>
          this.calculateMatchScore(b, query) -
          this.calculateMatchScore(a, query),
      )
      .slice(0, limit);
  }

  /**
   * Check if a specific medication is in stock
   */
  async isInStock(drugName: string): Promise<boolean> {
    const matches = await this.searchInventory(drugName);
    return matches.some((match) => match.inStock);
  }
}
