import { clothingConfig } from '../../../config/categories/clothing';
import type { FilledSlots, ResolvedPreferences } from '../../types/preferences';
import type { KnownFilters } from '../../types/products';

export type QuickFilterId = 'size' | 'color' | 'fabric' | 'price';

export interface QuickFilterConfig {
  id: QuickFilterId;
  label: string;
  fieldId: string;
}

const QUICK_FILTERS: QuickFilterConfig[] = [
  { id: 'size', label: 'Size', fieldId: 'size' },
  { id: 'color', label: 'Color', fieldId: 'color' },
  { id: 'fabric', label: 'Fabric', fieldId: 'fabric' },
  { id: 'price', label: 'Price Range', fieldId: 'budget' },
];

export function buildKnownFilters(slots: FilledSlots): KnownFilters {
  const known: KnownFilters = {};

  if (typeof slots.size === 'string') known.size = slots.size;
  if (Array.isArray(slots.color)) known.color = slots.color;
  if (Array.isArray(slots.fabric)) known.fabric = slots.fabric;
  if (slots.budget && typeof slots.budget === 'object' && !Array.isArray(slots.budget)) {
    known.budget = slots.budget;
  }

  return known;
}

/** Return quick filters that should be visible (unknown to the user so far). */
export function getVisibleQuickFilters(known: KnownFilters): QuickFilterConfig[] {
  return QUICK_FILTERS.filter((filter) => {
    if (filter.id === 'size') return !known.size;
    if (filter.id === 'color') return !known.color?.length;
    if (filter.id === 'fabric') return !known.fabric?.length;
    if (filter.id === 'price') return !known.budget?.min && !known.budget?.max;
    return true;
  });
}

export function getFilterOptions(filterId: QuickFilterId): { value: string; label: string }[] {
  if (filterId === 'price') {
    return (clothingConfig.fields.budget.presets ?? []).map((preset) => ({
      value: `${preset.min}-${preset.max}`,
      label: preset.label,
    }));
  }

  const field = clothingConfig.fields[filterId];
  if (!field?.options) return [];

  return field.options.map((option) =>
    typeof option === 'string' ? { value: option, label: option } : option,
  );
}

/** Convert quick filter chip selections into preference slots. */
export function quickFilterSelectionsToSlots(
  selections: Partial<Record<QuickFilterId, string>>,
): FilledSlots {
  const slots: FilledSlots = {};

  if (selections.size) slots.size = selections.size;

  if (selections.color) slots.color = [selections.color];

  if (selections.fabric) slots.fabric = [selections.fabric];

  if (selections.price) {
    const [min, max] = selections.price.split('-').map(Number);
    if (!Number.isNaN(min) && !Number.isNaN(max)) {
      slots.budget = { min, max };
    }
  }

  return slots;
}

export function mergeQuickFiltersIntoPreferences(
  base: ResolvedPreferences,
  selections: Partial<Record<QuickFilterId, string>>,
): ResolvedPreferences {
  const extraSlots = quickFilterSelectionsToSlots(selections);

  return {
    ...base,
    slots: { ...base.slots, ...extraSlots },
  };
}