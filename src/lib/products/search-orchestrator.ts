import { APP_CONFIG } from '../../../config/app';
import {
  buildProductSearchUserPrompt,
  parseGeminiProductSearchResult,
  PRODUCT_SEARCH_SYSTEM_PROMPT,
} from '../../../prompts/search-products';
import { PRODUCT_SEARCH_GEMINI_SCHEMA } from '../ai/gemini-schema-products';
import { generateStructuredJson, GeminiError } from '../ai/gemini-client';
import type { ResolvedPreferences } from '../../types/preferences';
import type { ProductResultsPayload, SearchCursor } from '../../types/products';
import {
  buildNextCursor,
  canLoadMore,
  createInitialCursor,
  decodeCursor,
  encodeCursor,
  validateCursor,
} from './cursor';
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
    public readonly code: 'GEMINI_UNAVAILABLE' | 'NO_RESULTS' | 'API_ERROR' | 'INVALID_CURSOR',
  ) {
    super(message);
    this.name = 'ProductSearchError';
  }
}

async function fetchRankedBatch(
  preferences: ResolvedPreferences,
  cursor: SearchCursor,
) {
  const raw = await generateStructuredJson({
    systemPrompt: PRODUCT_SEARCH_SYSTEM_PROMPT,
    userPrompt: buildProductSearchUserPrompt(preferences, {
      page: cursor.page,
      seenUrls: cursor.seenUrls,
      seenTitleKeys: cursor.seenTitleKeys,
    }),
    schema: PRODUCT_SEARCH_GEMINI_SCHEMA,
    temperature: cursor.page === 0 ? 0.35 : 0.4,
    timeoutMs: APP_CONFIG.searchTimeoutMs,
  });

  const parsed = parseGeminiProductSearchResult(raw);
  if (!parsed?.products.length) {
    throw new ProductSearchError('No products returned from Gemini', 'NO_RESULTS');
  }

  const ranked = rankProducts(parsed.products, preferences.slots, {
    page: cursor.page,
    seenUrls: new Set(cursor.seenUrls),
    seenTitleKeys: new Set(cursor.seenTitleKeys),
  });

  if (!ranked.length) {
    throw new ProductSearchError(
      'No products passed marketplace and budget validation',
      'NO_RESULTS',
    );
  }

  return ranked;
}

export async function searchProducts(
  preferences: ResolvedPreferences,
  cursorEncoded?: string | null,
): Promise<ProductResultsPayload> {
  try {
    const isLoadMore = Boolean(cursorEncoded);
    const cursor = cursorEncoded
      ? decodeCursor(cursorEncoded)
      : createInitialCursor(preferences);

    if (!cursor) {
      throw new ProductSearchError('Invalid pagination cursor', 'INVALID_CURSOR');
    }

    if (!validateCursor(cursor, preferences)) {
      throw new ProductSearchError('Cursor does not match current preferences', 'INVALID_CURSOR');
    }

    const ranked = await fetchRankedBatch(preferences, cursor);
    const isFirstPage = cursor.page === 0;

    let bestOverallId: string | null = null;
    let bestValueId: string | null = null;

    const flagged = ranked.map((product) => {
      if (!isFirstPage) {
        return stripInternalScores(product);
      }

      return stripInternalScores(product);
    });

    if (isFirstPage) {
      const bestOverall = pickBestOverall(ranked);
      const bestValue = pickBestValue(ranked, bestOverall?.id ?? '');
      bestOverallId = bestOverall?.id ?? null;
      bestValueId = bestValue?.id ?? null;

      for (const product of flagged) {
        product.isBestOverall = product.id === bestOverallId;
        product.isBestValue = product.id === bestValueId;
      }
    }

    const nextCursor = buildNextCursor(cursor, flagged);
    const hasMore = canLoadMore(nextCursor, flagged.length);

    return {
      products: flagged,
      bestOverallId: isFirstPage ? bestOverallId : null,
      bestValueId: isFirstPage ? bestValueId : null,
      knownFilters: buildKnownFilters(preferences.slots),
      cursor: hasMore ? encodeCursor(nextCursor) : null,
      hasMore,
      totalShown: nextCursor.totalLoaded,
      isLoadMore,
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