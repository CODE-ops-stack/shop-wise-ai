import { getMarketplacesForCategory } from '../config/marketplaces';
import type { ResolvedPreferences } from '../src/types/preferences';
import type { MarketplaceId } from '../config/marketplaces';

export interface GeminiRawProduct {
  title: string;
  price: number;
  originalPrice?: number;
  marketplace: string;
  url: string;
  imageUrl?: string;
  rating?: number;
  reviewCount?: number;
  highlights: string[];
  matchScore: number;
  relevanceScore?: number;
}

export interface GeminiProductSearchResult {
  products: GeminiRawProduct[];
}

const CLOTHING_MARKETPLACE_IDS: MarketplaceId[] = [
  'myntra',
  'ajio',
  'nykaa_fashion',
  'amazon',
  'flipkart',
];

export const PRODUCT_SEARCH_SYSTEM_PROMPT = `You are ShopWise AI product search engine for Indian clothing shoppers.

Use Google Search to find REAL products currently listed on Indian e-commerce sites.

Strict rules:
- Currency: INR only. Prices must match the live listing (integer INR).
- Only these marketplaces: Myntra (myntra.com), AJIO (ajio.com), Nykaa Fashion (nykaafashion.com), Amazon India (amazon.in), Flipkart (flipkart.com).
- "url" MUST be the exact product detail page URL from search results — NOT a search/category/homepage URL.
  - Myntra: URL ends with /buy
  - Amazon: URL contains /dp/
  - Flipkart: URL contains /p/
  - AJIO: URL contains /p/ or /product/
- "imageUrl" MUST be the direct HTTPS product image URL from the listing (CDN image link).
- NEVER invent URLs, product IDs, or image links. Only use URLs found via Google Search.
- matchScore: 1.0 = perfect match; below 0.4 = weak match.
- Return diverse real products — not duplicates.
- Respect budget max strictly.
- Output ONLY valid JSON: { "products": [...] }. No markdown.`;

export interface ProductSearchPromptContext {
  page: number;
  seenUrls?: string[];
  seenTitleKeys?: string[];
}

export function buildProductSearchUserPrompt(
  preferences: ResolvedPreferences,
  context: ProductSearchPromptContext = { page: 0 },
): string {
  const marketplaces = getMarketplacesForCategory('clothing')
    .filter((m) => CLOTHING_MARKETPLACE_IDS.includes(m.id))
    .map((m) => `${m.label} (${m.domain}, id: ${m.id})`)
    .join(', ');

  const excludeSection =
    context.page > 0 && (context.seenUrls?.length || context.seenTitleKeys?.length)
      ? `
Already shown to the user — do NOT repeat these (different URL and meaningfully different title required):
${context.seenUrls?.length ? `URLs: ${context.seenUrls.slice(-30).join(', ')}` : ''}
${context.seenTitleKeys?.length ? `Similar titles already shown: ${context.seenTitleKeys.slice(-20).join(', ')}` : ''}

This is page ${context.page + 1} — return the NEXT best 12 products not listed above.`
      : '';

  const gender = preferences.slots.gender;
  const genderRule =
    typeof gender === 'string'
      ? `
CRITICAL GENDER RULE: User wants ${gender.toUpperCase()} products ONLY.
- Every product title MUST clearly be for ${gender} (e.g. "${gender === 'women' ? "Women's Kurta Pyjama Set" : "Men's Kurta"}").
- NEVER return ${gender === 'women' ? "men's or boys" : "women's, girls, or kurti"} products.
- Wrong-gender products get matchScore 0 and will be discarded.`
      : '';

  return `Find clothing product recommendations for an Indian shopper.

Search intent: "${preferences.searchIntent}"
Category: ${preferences.categoryId}
Subcategory: ${preferences.subcategory ?? 'general clothing'}
Result page: ${context.page + 1}

User preferences (JSON):
${JSON.stringify(preferences.slots, null, 2)}
${genderRule}

Allowed marketplaces (use exact id in response): ${marketplaces}
${excludeSection}

Instructions:
1. Return up to 12 products ranked by match quality internally.
2. Prioritize exact matches to size, color, fabric, fit, gender, and budget when specified.
3. Include realistic ratings (3.5–4.8) and review counts for credible products.
4. Each product needs 2-3 specific highlights (not generic).
5. Each "url" must open the EXACT product page the user will buy — verify it is a product detail page, not search results.
6. Each "imageUrl" must be the real product photo from that listing.
7. Spread products across marketplaces when quality is similar — prefer Myntra/AJIO for fashion.
8. If budget max is set, all prices must be <= that max.
9. Search Google with site: filters e.g. site:myntra.com, site:ajio.com to find live listings.

Return JSON: { "products": [{ "title", "price", "marketplace", "url", "imageUrl", "highlights", "matchScore", ... }] }`;
}

export function parseGeminiProductSearchResult(raw: unknown): GeminiProductSearchResult | null {
  if (!raw || typeof raw !== 'object') return null;

  const data = raw as Record<string, unknown>;
  if (!Array.isArray(data.products)) return null;

  const products = data.products
    .filter((item): item is GeminiRawProduct => {
      if (!item || typeof item !== 'object') return false;
      const p = item as Record<string, unknown>;
      return (
        typeof p.title === 'string' &&
        typeof p.price === 'number' &&
        typeof p.marketplace === 'string' &&
        typeof p.url === 'string' &&
        Array.isArray(p.highlights) &&
        typeof p.matchScore === 'number'
      );
    })
    .map((p) => ({
      title: p.title,
      price: Math.round(p.price),
      originalPrice: p.originalPrice ? Math.round(p.originalPrice) : undefined,
      marketplace: p.marketplace,
      url: p.url,
      imageUrl: typeof p.imageUrl === 'string' ? p.imageUrl : undefined,
      rating: typeof p.rating === 'number' ? p.rating : undefined,
      reviewCount: typeof p.reviewCount === 'number' ? p.reviewCount : undefined,
      highlights: p.highlights.slice(0, 3).map(String),
      matchScore: Math.min(1, Math.max(0, p.matchScore)),
      relevanceScore:
        typeof p.relevanceScore === 'number'
          ? Math.min(1, Math.max(0, p.relevanceScore))
          : undefined,
    }));

  return products.length ? { products } : null;
}