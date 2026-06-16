import { APP_CONFIG } from '../../../config/app';
import {
  buildProductSearchUserPrompt,
  parseGeminiProductSearchResult,
  PRODUCT_SEARCH_SYSTEM_PROMPT,
} from '../../../prompts/search-products';
import { PRODUCT_SEARCH_GEMINI_SCHEMA } from '../ai/gemini-schema-products';
import { generateStructuredJson, GeminiError } from '../ai/gemini-client';
import type { ResolvedPreferences } from '../../types/preferences';
import type { ProductResultsPayload } from '../../types/products';
import { buildKnownFilters } from './visible-filters';
import {
  pickBestOverall,
  pickBestValue,
  rankProducts,
  stripInternalScores,
} from './ranker';

export class ProductSearchError extends Error {
  constructor(
    message: string,
    public readonly code: 'GEMINI_UNAVAILABLE' | 'NO_RESULTS' | 'API_ERROR',
  ) {
    super(message);
    this.name = 'ProductSearchError';
  }
}

export async function searchProducts(
  preferences: ResolvedPreferences,
): Promise<ProductResultsPayload> {
  try {
    const raw = await generateStructuredJson({
      systemPrompt: PRODUCT_SEARCH_SYSTEM_PROMPT,
      userPrompt: buildProductSearchUserPrompt(preferences),
      schema: PRODUCT_SEARCH_GEMINI_SCHEMA,
      temperature: 0.35,
      timeoutMs: APP_CONFIG.searchTimeoutMs,
    });

    const parsed = parseGeminiProductSearchResult(raw);
    if (!parsed?.products.length) {
      throw new ProductSearchError('No products returned from Gemini', 'NO_RESULTS');
    }

    const ranked = rankProducts(parsed.products, preferences.slots);
    if (!ranked.length) {
      throw new ProductSearchError(
        'No products passed marketplace and budget validation',
        'NO_RESULTS',
      );
    }

    const bestOverall = pickBestOverall(ranked);
    const bestValue = pickBestValue(ranked, bestOverall?.id ?? '');

    const flagged = ranked.map((product) => ({
      ...stripInternalScores(product),
      isBestOverall: product.id === bestOverall?.id,
      isBestValue: product.id === bestValue?.id,
    }));

    return {
      products: flagged,
      bestOverallId: bestOverall?.id ?? null,
      bestValueId: bestValue?.id ?? null,
      knownFilters: buildKnownFilters(preferences.slots),
      cursor: null,
      hasMore: false,
      totalShown: flagged.length,
    };
  } catch (error) {
    if (error instanceof GeminiError) {
      if (error.code === 'MISSING_API_KEY') {
        throw new ProductSearchError('Gemini API key is not configured', 'GEMINI_UNAVAILABLE');
      }
      throw new ProductSearchError(error.message, 'API_ERROR');
    }
    if (error instanceof ProductSearchError) throw error;
    throw new ProductSearchError('Product search failed', 'API_ERROR');
  }
}