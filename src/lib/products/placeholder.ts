import { APP_CONFIG } from '../../../config/app';
import { getMarketplace, VERIFIED_MARKETPLACES } from '../../../config/marketplaces';
import type { ResolvedPreferences } from '../../types/preferences';
import type { Product, ProductResultsPayload } from '../../types/products';
import { buildKnownFilters } from './visible-filters';

const CLOTHING_ADJECTIVES = ['Premium', 'Classic', 'Everyday', 'Comfort', 'Stylish', 'Trendy'];
const CLOTHING_DESCRIPTORS = ['Cotton', 'Breathable', 'Soft', 'Lightweight', 'Durable'];

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function pickMarketplaceOrder(searchIntent: string) {
  const clothingMarketplaces = VERIFIED_MARKETPLACES.filter((m) =>
    m.categories.includes('clothing'),
  );

  const offset = hashString(searchIntent) % clothingMarketplaces.length;
  return [
    ...clothingMarketplaces.slice(offset),
    ...clothingMarketplaces.slice(0, offset),
  ];
}

function formatTitle(preferences: ResolvedPreferences, index: number): string {
  const { slots, subcategory } = preferences;
  const item = subcategory ?? 'Clothing';
  const parts: string[] = [];

  if (typeof slots.gender === 'string') {
    parts.push(slots.gender === 'men' ? "Men's" : slots.gender === 'women' ? "Women's" : 'Unisex');
  }

  parts.push(CLOTHING_ADJECTIVES[index % CLOTHING_ADJECTIVES.length]);
  if (Array.isArray(slots.fabric) && slots.fabric[0]) {
    parts.push(slots.fabric[0].charAt(0).toUpperCase() + slots.fabric[0].slice(1));
  } else {
    parts.push(CLOTHING_DESCRIPTORS[index % CLOTHING_DESCRIPTORS.length]);
  }

  parts.push(item.charAt(0).toUpperCase() + item.slice(1));
  if (typeof slots.fit === 'string') parts.push(`(${slots.fit} fit)`);

  return parts.join(' ');
}

function priceForIndex(preferences: ResolvedPreferences, index: number): number {
  const budget = preferences.slots.budget;
  const max = budget && typeof budget === 'object' && !Array.isArray(budget) ? budget.max : 2_500;
  const min = budget && typeof budget === 'object' && !Array.isArray(budget) ? budget.min : 499;
  const spread = Math.max(max - min, 500);
  const price = min + ((index * 137) % spread);
  return Math.round(price / 10) * 10 - 1;
}

function buildHighlights(preferences: ResolvedPreferences): string[] {
  const highlights: string[] = [];
  const { slots } = preferences;

  if (Array.isArray(slots.fabric)) highlights.push(`${slots.fabric.join(', ')} fabric`);
  if (typeof slots.fit === 'string') highlights.push(`${slots.fit} fit`);
  if (typeof slots.size === 'string') highlights.push(`Size ${slots.size}`);
  highlights.push('Verified marketplace');
  highlights.push('Fast delivery');

  return highlights.slice(0, 3);
}

function overallScore(product: Product): number {
  const rating = product.rating ?? 0;
  const reviews = Math.log10((product.reviewCount ?? 0) + 1);
  const marketplaceBoost = 1 / getMarketplace(product.marketplace).priority;
  return rating * 2 + reviews + marketplaceBoost;
}

function valueScore(product: Product): number {
  const rating = product.rating ?? 0;
  const priceScore = 10_000 / (product.price + 1);
  return rating * 1.5 + priceScore;
}

/**
 * Placeholder product generator — replace with real search orchestrator later.
 * Respects marketplace priority and returns exactly 10 items.
 */
export function generatePlaceholderResults(
  preferences: ResolvedPreferences,
): ProductResultsPayload {
  const marketplaces = pickMarketplaceOrder(preferences.searchIntent);
  const highlights = buildHighlights(preferences);

  const products: Product[] = Array.from(
    { length: APP_CONFIG.maxProductsPerPage },
    (_, index) => {
      const marketplace = marketplaces[index % marketplaces.length];
      const price = priceForIndex(preferences, index);
      const rating = 3.8 + (index % 12) * 0.1;
      const reviewCount = 120 + index * 89;

      return {
        id: `placeholder_${index + 1}`,
        title: formatTitle(preferences, index),
        price,
        originalPrice: price + 200 + index * 50,
        marketplace: marketplace.id,
        url: `https://${marketplace.domain}/product/placeholder-${index + 1}`,
        rating: Math.min(Number(rating.toFixed(1)), 4.9),
        reviewCount,
        highlights,
      };
    },
  );

  const bestOverall = [...products].sort((a, b) => overallScore(b) - overallScore(a))[0];
  const bestValue = [...products]
    .filter((p) => (p.rating ?? 0) >= 4)
    .sort((a, b) => valueScore(b) - valueScore(a))[0] ?? products[0];

  const flagged = products.map((product) => ({
    ...product,
    isBestOverall: product.id === bestOverall.id,
    isBestValue: product.id === bestValue.id,
  }));

  return {
    products: flagged,
    bestOverallId: bestOverall.id,
    bestValueId: bestValue.id,
    knownFilters: buildKnownFilters(preferences.slots),
    cursor: null,
    hasMore: false,
    totalShown: flagged.length,
  };
}