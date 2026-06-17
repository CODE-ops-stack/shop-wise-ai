import { getMarketplacesForCategory } from '../config/marketplaces';
import type { ResolvedPreferences } from '../src/types/preferences';
import type { MarketplaceId } from '../config/marketplaces';

export interface GeminiRawProduct {
  title: string;
  price: number;
  originalPrice?: number;
  marketplace: string;
  url: string;
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

Your job: recommend realistic, high-quality clothing products available on major Indian e-commerce sites.

Strict rules:
- Currency: INR only. Prices must be realistic for India (typically ₹299–₹15000 for clothing).
- Only use these marketplaces: Myntra (myntra.com), AJIO (ajio.com), Nykaa Fashion (nykaafashion.com), Amazon India (amazon.in), Flipkart (flipkart.com).
- URLs must use the correct domain for the marketplace (https://www.myntra.com/..., https://www.ajio.com/..., etc).
- Recommend real product types/brands commonly sold in India (Roadster, H&M, Biba, Allen Solly, Peter England, etc).
- matchScore: 1.0 = perfect match to all user preferences; 0.5 = partial; below 0.4 = weak match.
- Return diverse options — different styles/brands — not 12 copies of the same item.
- Respect budget constraints strictly — do not recommend products above max budget.
- Output strict JSON only. No markdown.`;

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

  return `Find clothing product recommendations for an Indian shopper.

Search intent: "${preferences.searchIntent}"
Category: ${preferences.categoryId}
Subcategory: ${preferences.subcategory ?? 'general clothing'}
Result page: ${context.page + 1}

User preferences (JSON):
${JSON.stringify(preferences.slots, null, 2)}

Allowed marketplaces (use exact id in response): ${marketplaces}
${excludeSection}

Instructions:
1. Return up to 12 products ranked by match quality internally.
2. Prioritize exact matches to size, color, fabric, fit, gender, and budget when specified.
3. Include realistic ratings (3.5–4.8) and review counts for credible products.
4. Each product needs 2-3 specific highlights (not generic).
5. URLs must be plausible product page URLs on the correct marketplace domain.
6. Spread products across multiple marketplaces when quality is similar — prefer Myntra/AJIO for fashion.
7. If budget max is set, all prices must be <= that max.
8. Return diverse brands/styles — avoid near-duplicate titles.

Return JSON with a "products" array.`;
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