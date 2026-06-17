import { APP_CONFIG } from '../../../config/app';
import { getMarketplacePriority, type MarketplaceId } from '../../../config/marketplaces';
import type { GeminiRawProduct } from '../../../prompts/search-products';
import type { Product } from '../../types/products';
import { resolveMarketplaceFromProduct, titleMatchesRequestedGender } from './marketplace-filter';
import { isProductPageUrl, isValidImageUrl, normalizeProductUrl } from './product-url';

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'for', 'and', 'or', 'with', 'in', 'on', 'of', 'by',
  'men', 'mens', "men's", 'women', 'womens', "women's", 'unisex',
]);

export function normalizeTitleKey(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word))
    .slice(0, 6)
    .sort()
    .join('-');
}

function withinBudget(price: number, slots: Record<string, unknown>): boolean {
  const budget = slots.budget;
  if (!budget || typeof budget !== 'object' || Array.isArray(budget)) return true;

  const { min, max } = budget as { min?: number; max?: number };
  if (max !== undefined && price > max) return false;
  if (min !== undefined && price < min * 0.5) return false;
  return true;
}

export interface RankOptions {
  page?: number;
  seenUrls?: Set<string>;
  seenTitleKeys?: Set<string>;
}

export function rawToProduct(
  raw: GeminiRawProduct,
  index: number,
  page = 0,
  slots: Record<string, unknown> = {},
): Product | null {
  const marketplace = resolveMarketplaceFromProduct(raw);
  if (!marketplace) return null;

  if (raw.price <= 0 || raw.price > 100_000) return null;

  const productUrl = normalizeProductUrl(raw.url);
  if (!isProductPageUrl(productUrl, marketplace)) return null;

  return {
    id: `product_p${page}_${index}_${marketplace}_${raw.price}`,
    title: raw.title.trim(),
    price: raw.price,
    originalPrice:
      raw.originalPrice && raw.originalPrice > raw.price ? raw.originalPrice : undefined,
    marketplace,
    url: productUrl,
    imageUrl:
      raw.imageUrl && isValidImageUrl(raw.imageUrl) ? raw.imageUrl.trim() : undefined,
    rating: raw.rating ? Math.min(5, Math.max(1, raw.rating)) : undefined,
    reviewCount: raw.reviewCount ? Math.max(0, Math.round(raw.reviewCount)) : undefined,
    highlights: raw.highlights.length ? raw.highlights : ['Verified marketplace'],
    _matchScore: raw.matchScore,
    _relevanceScore: raw.relevanceScore ?? raw.matchScore,
  };
}

export type ScoredProduct = Product & { _matchScore: number; _relevanceScore: number };

function compareRanked(a: ScoredProduct, b: ScoredProduct): number {
  if (b._matchScore !== a._matchScore) return b._matchScore - a._matchScore;
  if (a.price !== b.price) return a.price - b.price;
  const priorityDiff =
    getMarketplacePriority(a.marketplace) - getMarketplacePriority(b.marketplace);
  if (priorityDiff !== 0) return priorityDiff;
  return b._relevanceScore - a._relevanceScore;
}

/**
 * Ranking pipeline:
 * 1. Filter + validate marketplace URLs
 * 2. Group exact product matches (normalized title) → keep best price per group
 * 3. Sort: matchScore → price → marketplace priority → relevance
 * 4. Return top N
 */
export function rankProducts(
  rawProducts: GeminiRawProduct[],
  slots: Record<string, unknown>,
  options: RankOptions = {},
): ScoredProduct[] {
  const page = options.page ?? 0;
  const seenUrls = options.seenUrls ?? new Set<string>();
  const seenTitleKeys = options.seenTitleKeys ?? new Set<string>();
  const validated: ScoredProduct[] = [];

  for (let i = 0; i < rawProducts.length; i += 1) {
    const product = rawToProduct(rawProducts[i], i, page, slots);
    if (!product) continue;
    if (!withinBudget(product.price, slots)) continue;
    if (
      typeof slots.gender === 'string' &&
      !titleMatchesRequestedGender(product.title, slots.gender)
    ) {
      continue;
    }
    if (seenUrls.has(product.url)) continue;

    const titleKey = normalizeTitleKey(product.title);
    if (titleKey && seenTitleKeys.has(titleKey)) continue;

    validated.push(product as ScoredProduct);
  }

  const bestPriceByTitle = new Map<string, ScoredProduct>();

  for (const product of validated) {
    const key = normalizeTitleKey(product.title);
    const existing = bestPriceByTitle.get(key);

    if (!existing) {
      bestPriceByTitle.set(key, product);
      continue;
    }

    const existingPriority = getMarketplacePriority(existing.marketplace);
    const candidatePriority = getMarketplacePriority(product.marketplace);

    const existingWins =
      existing.price < product.price ||
      (existing.price === product.price && existingPriority <= candidatePriority);

    if (!existingWins) {
      bestPriceByTitle.set(key, product);
    }
  }

  return [...bestPriceByTitle.values()]
    .sort(compareRanked)
    .slice(0, APP_CONFIG.maxProductsPerPage);
}

export function pickBestOverall(products: ScoredProduct[]): ScoredProduct | null {
  if (!products.length) return null;

  return [...products].sort((a, b) => {
    const scoreA =
      a._matchScore * 0.45 +
      (a.rating ?? 0) * 0.2 +
      Math.log10((a.reviewCount ?? 0) + 1) * 0.1 +
      (1 / getMarketplacePriority(a.marketplace)) * 0.15 +
      a._relevanceScore * 0.1;
    const scoreB =
      b._matchScore * 0.45 +
      (b.rating ?? 0) * 0.2 +
      Math.log10((b.reviewCount ?? 0) + 1) * 0.1 +
      (1 / getMarketplacePriority(b.marketplace)) * 0.15 +
      b._relevanceScore * 0.1;
    return scoreB - scoreA;
  })[0];
}

export function pickBestValue(
  products: ScoredProduct[],
  bestOverallId: string,
): ScoredProduct | null {
  const candidates = products.filter(
    (p) => p.id !== bestOverallId && (p.rating ?? 0) >= 3.8 && p._matchScore >= 0.55,
  );

  if (!candidates.length) {
    return products.find((p) => p.id !== bestOverallId) ?? products[0] ?? null;
  }

  return [...candidates].sort((a, b) => {
    const valueA = (a.rating ?? 4) / (a.price / 1000) + a._matchScore * 0.3;
    const valueB = (b.rating ?? 4) / (b.price / 1000) + b._matchScore * 0.3;
    return valueB - valueA;
  })[0];
}

export function stripInternalScores(product: ScoredProduct): Product {
  const { _matchScore: _m, _relevanceScore: _r, ...clean } = product;
  return clean;
}