import type { MarketplaceId } from '../../config/marketplaces';
import type { BudgetRange } from './preferences';

export interface Product {
  id: string;
  title: string;
  price: number;
  originalPrice?: number;
  marketplace: MarketplaceId;
  url: string;
  imageUrl?: string;
  rating?: number;
  reviewCount?: number;
  highlights: string[];
  isBestOverall?: boolean;
  isBestValue?: boolean;
}

/** Filters already known from query / preference panel — hide in quick filters UI. */
export interface KnownFilters {
  size?: string;
  color?: string[];
  fabric?: string[];
  budget?: BudgetRange;
}

export interface ProductResultsPayload {
  products: Product[];
  bestOverallId: string | null;
  bestValueId: string | null;
  knownFilters: KnownFilters;
  cursor: string | null;
  hasMore: boolean;
  totalShown: number;
}

export interface SearchCursor {
  page: number;
  seenUrls: string[];
  searchIntent: string;
  preferenceHash: string;
}