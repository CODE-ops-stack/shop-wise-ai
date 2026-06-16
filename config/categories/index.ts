import type { CategoryConfig } from '../../src/types/preferences';
import { clothingConfig } from './clothing';

export const CATEGORY_REGISTRY: Record<string, CategoryConfig> = {
  clothing: clothingConfig,
};

export const ACTIVE_CATEGORIES = Object.values(CATEGORY_REGISTRY);

export function getCategoryConfig(categoryId: string): CategoryConfig | null {
  return CATEGORY_REGISTRY[categoryId] ?? null;
}

export function getDefaultCategory(): CategoryConfig {
  return clothingConfig;
}