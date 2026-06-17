import { GOOGLE_CSE_API_KEY, GOOGLE_CSE_CX } from 'astro:env/server';
import { getMarketplace, type MarketplaceId } from '../../../config/marketplaces';
import type { GeminiRawProduct } from '../../../prompts/search-products';
import { buildProductSearchQuery, resolveMarketplaceFromProduct } from './marketplace-filter';
import { isProductPageUrl, normalizeProductUrl } from './product-url';

const CSE_TIMEOUT_MS = 8_000;

function getCseCredentials(): { apiKey: string; cx: string } | null {
  const apiKey = (GOOGLE_CSE_API_KEY ?? process.env.GOOGLE_CSE_API_KEY)?.trim();
  const cx = (GOOGLE_CSE_CX ?? process.env.GOOGLE_CSE_CX)?.trim();
  if (!apiKey || !cx) return null;
  return { apiKey, cx };
}

async function findViaGoogleCustomSearch(
  title: string,
  marketplaceId: MarketplaceId,
  slots: Record<string, unknown>,
): Promise<string | null> {
  const creds = getCseCredentials();
  if (!creds) return null;

  const domain = getMarketplace(marketplaceId).domain;
  const query = buildProductSearchQuery(title, slots);
  const searchUrl = new URL('https://www.googleapis.com/customsearch/v1');
  searchUrl.searchParams.set('key', creds.apiKey);
  searchUrl.searchParams.set('cx', creds.cx);
  searchUrl.searchParams.set('q', `site:${domain} ${query}`);
  searchUrl.searchParams.set('num', '8');

  try {
    const response = await fetch(searchUrl, {
      signal: AbortSignal.timeout(CSE_TIMEOUT_MS),
    });
    if (!response.ok) return null;

    const payload = (await response.json()) as {
      items?: Array<{ link?: string; title?: string }>;
    };

    for (const item of payload.items ?? []) {
      if (!item.link) continue;
      const normalized = normalizeProductUrl(item.link);
      if (isProductPageUrl(normalized, marketplaceId)) {
        return normalized;
      }
    }
  } catch {
    return null;
  }

  return null;
}

/**
 * Resolve a single product to an exact marketplace product-page URL.
 * Returns null if no real product page can be found (never returns search URLs).
 */
export async function resolveExactProductUrl(
  raw: GeminiRawProduct,
  slots: Record<string, unknown>,
): Promise<GeminiRawProduct | null> {
  const marketplace = resolveMarketplaceFromProduct(raw);
  if (!marketplace) return null;

  const geminiUrl = normalizeProductUrl(raw.url);
  if (isProductPageUrl(geminiUrl, marketplace)) {
    return { ...raw, url: geminiUrl, marketplace };
  }

  const cseUrl = await findViaGoogleCustomSearch(raw.title, marketplace, slots);
  if (cseUrl) {
    return { ...raw, url: cseUrl, marketplace };
  }

  return null;
}

export async function resolveExactProductUrls(
  products: GeminiRawProduct[],
  slots: Record<string, unknown>,
): Promise<GeminiRawProduct[]> {
  const resolved: GeminiRawProduct[] = [];

  for (const product of products) {
    const item = await resolveExactProductUrl(product, slots);
    if (item) resolved.push(item);
  }

  return resolved;
}

export function isProductUrlResolverConfigured(): boolean {
  return Boolean(getCseCredentials());
}