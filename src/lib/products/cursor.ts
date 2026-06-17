import { APP_CONFIG } from '../../../config/app';
import type { ResolvedPreferences } from '../../types/preferences';
import type { Product, SearchCursor } from '../../types/products';
import { normalizeTitleKey } from './ranker';

export function hashPreferences(preferences: ResolvedPreferences): string {
  const payload = JSON.stringify({
    intent: preferences.searchIntent,
    slots: preferences.slots,
    categoryId: preferences.categoryId,
    subcategory: preferences.subcategory,
  });

  let hash = 0;
  for (let i = 0; i < payload.length; i += 1) {
    hash = (hash << 5) - hash + payload.charCodeAt(i);
    hash |= 0;
  }

  return `pref_${Math.abs(hash)}`;
}

export function createInitialCursor(preferences: ResolvedPreferences): SearchCursor {
  return {
    page: 0,
    seenUrls: [],
    seenTitleKeys: [],
    searchIntent: preferences.searchIntent,
    preferenceHash: hashPreferences(preferences),
    totalLoaded: 0,
  };
}

export function encodeCursor(cursor: SearchCursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString('base64url');
}

export function decodeCursor(encoded: string): SearchCursor | null {
  try {
    const json = Buffer.from(encoded, 'base64url').toString('utf8');
    const data = JSON.parse(json) as SearchCursor;

    if (
      typeof data.page !== 'number' ||
      !Array.isArray(data.seenUrls) ||
      !Array.isArray(data.seenTitleKeys) ||
      typeof data.searchIntent !== 'string' ||
      typeof data.preferenceHash !== 'string'
    ) {
      return null;
    }

    return {
      page: data.page,
      seenUrls: data.seenUrls,
      seenTitleKeys: data.seenTitleKeys,
      searchIntent: data.searchIntent,
      preferenceHash: data.preferenceHash,
      totalLoaded: data.totalLoaded ?? 0,
    };
  } catch {
    return null;
  }
}

export function validateCursor(
  cursor: SearchCursor,
  preferences: ResolvedPreferences,
): boolean {
  return cursor.preferenceHash === hashPreferences(preferences);
}

export function buildNextCursor(
  current: SearchCursor,
  newProducts: Product[],
): SearchCursor {
  const seenUrls = [...current.seenUrls];
  const seenTitleKeys = [...current.seenTitleKeys];

  for (const product of newProducts) {
    if (!seenUrls.includes(product.url)) seenUrls.push(product.url);
    const titleKey = normalizeTitleKey(product.title);
    if (titleKey && !seenTitleKeys.includes(titleKey)) seenTitleKeys.push(titleKey);
  }

  return {
    page: current.page + 1,
    seenUrls,
    seenTitleKeys,
    searchIntent: current.searchIntent,
    preferenceHash: current.preferenceHash,
    totalLoaded: current.totalLoaded + newProducts.length,
  };
}

export function canLoadMore(cursor: SearchCursor, batchSize: number): boolean {
  return (
    cursor.totalLoaded + batchSize <= APP_CONFIG.maxTotalProducts &&
    batchSize === APP_CONFIG.maxProductsPerPage
  );
}