import type { BudgetRange, FilledSlots } from '../../types/preferences';

function isBudgetRange(value: unknown): value is BudgetRange {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function getBudgetMax(slots: FilledSlots): number | undefined {
  const budget = slots.budget;
  if (!isBudgetRange(budget)) return undefined;
  return typeof budget.max === 'number' ? budget.max : undefined;
}

export function isWithinBudget(price: number, max?: number): boolean {
  if (max == null) return false;
  return price <= max;
}