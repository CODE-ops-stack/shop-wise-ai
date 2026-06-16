import {
  getMarketplace,
  getMarketplaceByDomain,
  isVerifiedMarketplaceUrl,
  type MarketplaceId,
} from '../../../config/marketplaces';
import type { GeminiRawProduct } from '../../../prompts/search-products';

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

export function resolveMarketplaceFromProduct(
  raw: GeminiRawProduct,
): MarketplaceId | null {
  if (!isVerifiedMarketplaceUrl(raw.url)) return null;

  try {
    const { hostname } = new URL(raw.url);
    const fromUrl = getMarketplaceByDomain(hostname);
    if (!fromUrl || !isClothingMarketplace(fromUrl.id)) return null;

    const stated = raw.marketplace as MarketplaceId;
    if (CLOTHING_MARKETPLACE_IDS.has(stated) && stated === fromUrl.id) {
      return stated;
    }

    return fromUrl.id;
  } catch {
    return null;
  }
}

export function normalizeProductUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (!parsed.protocol.startsWith('http')) {
      parsed.protocol = 'https:';
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

export function getMarketplaceLabel(id: MarketplaceId): string {
  return getMarketplace(id).label;
}