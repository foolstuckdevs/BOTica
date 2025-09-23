import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import type { RxNavResponse } from '../types';

interface RxNavCandidate {
  rxcui: string;
  score?: string;
  rank?: string;
}

interface RxNavBrand {
  name: string;
  rxcui: string;
}

const RxNavSearchSchema = z.object({
  drugName: z.string().describe('Drug name to normalize to RxCUI'),
  searchType: z
    .enum(['exact', 'approximate'])
    .default('approximate')
    .describe('Search precision'),
});

/**
 * RxNav Tool for Drug Name Normalization
 *
 * This tool normalizes drug names to RxCUI (RxNorm Concept Unique Identifiers)
 * using the NIH RxNav API. It's essential for standardizing drug names before
 * querying MedlinePlus for clinical information.
 *
 * Features:
 * - Exact and approximate matching
 * - Multiple search strategies (spelling suggestions, brands, generics)
 * - Confidence scoring
 * - Error handling with fallback strategies
 */
export const rxnavTool = new DynamicStructuredTool({
  name: 'rxnav_normalize',
  description: `Normalize drug names to standard RxCUI identifiers using RxNav API. Use this tool when you need to get clinical information for a drug - it standardizes drug names for use with other medical databases.`,
  schema: RxNavSearchSchema,
  func: async ({ drugName, searchType }) => {
    const baseUrl = 'https://rxnav.nlm.nih.gov/REST';

    try {
      console.log(
        `[RxNavTool] Normalizing "${drugName}" with ${searchType} search`,
      );

      let rxCui: string | null = null;
      let confidence = 0;
      let searchStrategy = '';

      // Strategy 1: Exact name match
      try {
        const exactUrl = `${baseUrl}/rxcui?name=${encodeURIComponent(
          drugName,
        )}`;
        const exactResponse = await fetch(exactUrl, {
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(10000), // 10s timeout
        });

        if (exactResponse.ok) {
          const exactData = await exactResponse.json();
          if (exactData.idGroup?.rxnormId?.length > 0) {
            rxCui = exactData.idGroup.rxnormId[0];
            confidence = 0.95;
            searchStrategy = 'exact_match';
          }
        }
      } catch (error) {
        console.warn('[RxNavTool] Exact match failed:', error);
      }

      // Strategy 2: Approximate matching if exact failed
      if (!rxCui && searchType === 'approximate') {
        try {
          const approxUrl = `${baseUrl}/approximateTerm?term=${encodeURIComponent(
            drugName,
          )}&maxEntries=3`;
          const approxResponse = await fetch(approxUrl, {
            headers: { Accept: 'application/json' },
            signal: AbortSignal.timeout(10000),
          });

          if (approxResponse.ok) {
            const approxData = await approxResponse.json();
            const candidates = approxData.approximateGroup?.candidate;

            if (candidates && candidates.length > 0) {
              // Find best match by score
              const bestCandidate = candidates.reduce(
                (best: RxNavCandidate, current: RxNavCandidate) => {
                  const currentScore = parseInt(current.score || '0');
                  const bestScore = parseInt(best.score || '0');
                  return currentScore > bestScore ? current : best;
                },
              );

              rxCui = bestCandidate.rxcui;
              confidence = Math.min(
                0.9,
                parseInt(bestCandidate.score || '0') / 100,
              );
              searchStrategy = 'approximate_match';
            }
          }
        } catch (error) {
          console.warn('[RxNavTool] Approximate match failed:', error);
        }
      }

      // Strategy 3: Try spelling suggestions as fallback
      if (!rxCui && searchType === 'approximate') {
        try {
          const spellingUrl = `${baseUrl}/spellingsuggestions?name=${encodeURIComponent(
            drugName,
          )}`;
          const spellingResponse = await fetch(spellingUrl, {
            headers: { Accept: 'application/json' },
            signal: AbortSignal.timeout(10000),
          });

          if (spellingResponse.ok) {
            const spellingData = await spellingResponse.json();
            const suggestions =
              spellingData.suggestionGroup?.suggestionList?.suggestion;

            if (suggestions && suggestions.length > 0) {
              // Try the first spelling suggestion
              const suggestion = suggestions[0];
              const suggestionUrl = `${baseUrl}/rxcui?name=${encodeURIComponent(
                suggestion,
              )}`;
              const suggestionResponse = await fetch(suggestionUrl, {
                headers: { Accept: 'application/json' },
                signal: AbortSignal.timeout(10000),
              });

              if (suggestionResponse.ok) {
                const suggestionData = await suggestionResponse.json();
                if (suggestionData.idGroup?.rxnormId?.length > 0) {
                  rxCui = suggestionData.idGroup.rxnormId[0];
                  confidence = 0.7;
                  searchStrategy = 'spelling_suggestion';
                }
              }
            }
          }
        } catch (error) {
          console.warn('[RxNavTool] Spelling suggestions failed:', error);
        }
      }

      // Get additional details if we found an RxCUI
      let normalizedName = drugName;
      if (rxCui) {
        try {
          const detailUrl = `${baseUrl}/rxcui/${rxCui}/properties`;
          const detailResponse = await fetch(detailUrl, {
            headers: { Accept: 'application/json' },
            signal: AbortSignal.timeout(5000),
          });

          if (detailResponse.ok) {
            const detailData = await detailResponse.json();
            if (detailData.properties?.name) {
              normalizedName = detailData.properties.name;
            }
          }
        } catch (error) {
          console.warn('[RxNavTool] Failed to get name details:', error);
        }
      }

      const response: RxNavResponse & {
        found: boolean;
        searchStrategy: string;
        originalQuery: string;
      } = {
        rxCui: rxCui || undefined,
        name: normalizedName,
        source: 'RxNav/RxNorm',
        confidence,
        found: !!rxCui,
        searchStrategy,
        originalQuery: drugName,
      };

      console.log(
        `[RxNavTool] Result: ${
          rxCui ? `Found RxCUI ${rxCui}` : 'Not found'
        } (confidence: ${confidence})`,
      );
      return JSON.stringify(response, null, 2);
    } catch (error) {
      console.error('[RxNavTool] API error:', error);

      return JSON.stringify({
        rxCui: undefined,
        name: drugName,
        source: 'RxNav/RxNorm',
        confidence: 0,
        found: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        originalQuery: drugName,
      });
    }
  },
});

/**
 * Get drug brands for a given ingredient/generic name
 */
export const rxnavBrandsTool = new DynamicStructuredTool({
  name: 'rxnav_get_brands',
  description: 'Get brand name medications for a given generic/ingredient name',
  schema: z.object({
    ingredient: z.string().describe('Generic drug name or active ingredient'),
  }),
  func: async ({ ingredient }) => {
    const baseUrl = 'https://rxnav.nlm.nih.gov/REST';

    try {
      const brandsUrl = `${baseUrl}/brands?ingredientname=${encodeURIComponent(
        ingredient,
      )}`;
      const response = await fetch(brandsUrl, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const brands = data.brandGroup?.conceptProperties || [];

      return JSON.stringify({
        ingredient,
        brands: brands.map((brand: RxNavBrand) => ({
          name: brand.name,
          rxcui: brand.rxcui,
        })),
        count: brands.length,
        source: 'RxNav/RxNorm',
      });
    } catch (error) {
      console.error('[RxNavBrandsTool] Error:', error);
      return JSON.stringify({
        ingredient,
        brands: [],
        count: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
        source: 'RxNav/RxNorm',
      });
    }
  },
});
