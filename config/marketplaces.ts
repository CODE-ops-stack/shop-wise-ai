/**
 * Verified Indian e-commerce marketplaces.
 * Only products from these domains should appear in results.
 */

/** Clothing search priority: lower number = preferred marketplace. */
export const VERIFIED_MARKETPLACES = [
  {
    id: 'myntra',
    domain: 'myntra.com',
    label: 'Myntra',
    priority: 1,
    categories: ['clothing', 'footwear', 'beauty'],
  },
  {
    id: 'ajio',
    domain: 'ajio.com',
    label: 'AJIO',
    priority: 2,
    categories: ['clothing', 'footwear'],
  },
  {
    id: 'nykaa_fashion',
    domain: 'nykaafashion.com',
    label: 'Nykaa Fashion',
    priority: 3,
    categories: ['clothing', 'beauty'],
  },
  {
    id: 'amazon',
    domain: 'amazon.in',
    label: 'Amazon',
    priority: 4,
    categories: ['electronics', 'clothing', 'footwear', 'home', 'beauty', 'generic'],
  },
  {
    id: 'flipkart',
    domain: 'flipkart.com',
    label: 'Flipkart',
    priority: 5,
    categories: ['electronics', 'clothing', 'footwear', 'home', 'generic'],
  },
  {
    id: 'nykaa',
    domain: 'nykaa.com',
    label: 'Nykaa',
    priority: 6,
    categories: ['beauty'],
  },
] as const;

export type MarketplaceId = (typeof VERIFIED_MARKETPLACES)[number]['id'];

export type Marketplace = (typeof VERIFIED_MARKETPLACES)[number];

const marketplaceById = new Map(
  VERIFIED_MARKETPLACES.map((m) => [m.id, m]),
);

const marketplaceByDomain = new Map(
  VERIFIED_MARKETPLACES.map((m) => [m.domain, m]),
);

export function getMarketplace(id: MarketplaceId): Marketplace {
  const marketplace = marketplaceById.get(id);
  if (!marketplace) {
    throw new Error(`Unknown marketplace: ${id}`);
  }
  return marketplace;
}

export function getMarketplaceByDomain(hostname: string): Marketplace | null {
  const normalized = hostname.replace(/^www\./, '').toLowerCase();
  return marketplaceByDomain.get(normalized) ?? null;
}

export function isVerifiedMarketplaceUrl(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return getMarketplaceByDomain(hostname) !== null;
  } catch {
    return false;
  }
}

/** Lower priority number = higher trust / sort preference. */
export function getMarketplacePriority(id: MarketplaceId): number {
  return getMarketplace(id).priority;
}

/** Marketplaces relevant to a product category, sorted by priority. */
export function getMarketplacesForCategory(categoryId: string): Marketplace[] {
  return VERIFIED_MARKETPLACES.filter((m) =>
    m.categories.includes(categoryId as Marketplace['categories'][number]),
  );
}