import { APP_CONFIG } from '../../../config/app';
import {
  buildProductSearchUserPrompt,
  parseGeminiProductSearchResult,
  PRODUCT_SEARCH_SYSTEM_PROMPT,
} from '../../../prompts/search-products';
import { PRODUCT_SEARCH_GEMINI_SCHEMA } from '../ai/gemini-schema-products';
import { generateGroundedJson } from '../ai/gemini-grounded-search';
import { generateStructuredJson, GeminiError } from '../ai/gemini-client';
import { enrichProductImages } from './image-resolver';
import { resolveExactProductUrls } from './product-url-resolver';
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

async function fetchGeminiProducts(
  preferences: ResolvedPreferences,
  cursor: SearchCursor,
) {
  const userPrompt = buildProductSearchUserPrompt(preferences, {
    page: cursor.page,
    seenUrls: cursor.seenUrls,
    seenTitleKeys: cursor.seenTitleKeys,
  });
  const temperature = cursor.page === 0 ? 0.25 : 0.3;

  try {
    const { data } = await generateGroundedJson<unknown>({
      systemPrompt: PRODUCT_SEARCH_SYSTEM_PROMPT,
      userPrompt,
      temperature,
      timeoutMs: APP_CONFIG.searchTimeoutMs,
    });
    return parseGeminiProductSearchResult(data);
  } catch {
    const data = await generateStructuredJson<unknown>({
      systemPrompt: PRODUCT_SEARCH_SYSTEM_PROMPT,
      userPrompt,
      schema: PRODUCT_SEARCH_GEMINI_SCHEMA,
      temperature,
      timeoutMs: APP_CONFIG.searchTimeoutMs,
    });
    return parseGeminiProductSearchResult(data);
  }
}

async function fetchRankedBatch(
  preferences: ResolvedPreferences,
  cursor: SearchCursor,
) {
  const parsed = await fetchGeminiProducts(preferences, cursor);
  if (!parsed?.products.length) {
    throw new ProductSearchError('No products returned from Gemini', 'NO_RESULTS');
  }

  const withExactUrls = await resolveExactProductUrls(parsed.products, preferences.slots);
  if (!withExactUrls.length) {
    throw new ProductSearchError(
      'No products with verified product-page URLs. Add GOOGLE_CSE_API_KEY + GOOGLE_CSE_CX to .env for reliable links.',
      'NO_RESULTS',
    );
  }

  const ranked = rankProducts(withExactUrls, preferences.slots, {
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

    let flagged = ranked.map((product) => stripInternalScores(product));
    flagged = await enrichProductImages(flagged);

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