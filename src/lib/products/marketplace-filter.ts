import {
  getMarketplaceByDomain,
  type MarketplaceId,
} from '../../../config/marketplaces';
import type { GeminiRawProduct } from '../../../prompts/search-products';
import { normalizeProductUrl } from './product-url';

const CLOTHING_MARKETPLACE_IDS = new Set<MarketplaceId>([
  'myntra',
  'ajio',
  'nykaa_fashion',
  'amazon',
  'flipkart',
]);

export function isClothingMarketplace(id: MarketplaceId): boolean {
  return CLOTHING_MARKETPLACE_IDS.has(id);
}

const WOMEN_TITLE_PATTERN =
  /\b(women|womens|women's|woman|ladies|lady|girls?|female|kurti|saree|sari|lehenga)\b/i;
const MEN_TITLE_PATTERN = /\b(men|mens|men's|boys?|male)\b/i;

export function titleMatchesRequestedGender(
  title: string,
  gender: string,
): boolean {
  const hasWomen = WOMEN_TITLE_PATTERN.test(title);
  const hasMen = MEN_TITLE_PATTERN.test(title) && !/\b(women|womens|women's)\b/i.test(title);

  if (gender === 'women') return !hasMen || hasWomen;
  if (gender === 'men') return !hasWomen || hasMen;
  return true;
}

/** Build a real marketplace search URL — Gemini product page URLs are not reliable. */
export function buildProductSearchQuery(
  title: string,
  slots: Record<string, unknown> = {},
): string {
  const parts: string[] = [];
  const titleLower = title.toLowerCase();

  if (typeof slots.gender === 'string') {
    const genderWord = slots.gender === 'women' ? 'women' : slots.gender;
    if (!titleLower.includes(genderWord)) {
      parts.push(genderWord);
    }
  }

  parts.push(title.trim());

  if (Array.isArray(slots.color)) {
    for (const color of slots.color) {
      if (typeof color === 'string' && !titleLower.includes(color.toLowerCase())) {
        parts.push(color);
      }
    }
  }

  if (typeof slots.subcategory === 'string' && !titleLower.includes(slots.subcategory.toLowerCase())) {
    parts.push(slots.subcategory);
  }

  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

export function resolveMarketplaceFromProduct(
  raw: GeminiRawProduct,
): MarketplaceId | null {
  const stated = raw.marketplace as MarketplaceId;
  if (CLOTHING_MARKETPLACE_IDS.has(stated)) {
    return stated;
  }

  try {
    const url = normalizeProductUrl(raw.url);
    const { hostname } = new URL(url);
    const fromUrl = getMarketplaceByDomain(hostname.replace(/^www\./, ''));
    if (!fromUrl || !isClothingMarketplace(fromUrl.id)) return null;
    return fromUrl.id;
  } catch {
    return null;
  }
}