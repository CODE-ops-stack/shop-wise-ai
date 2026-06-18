const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

export function formatInr(price: number): string {
  return inrFormatter.format(price);
}

export function discountPercent(price: number, originalPrice?: number): number | null {
  if (!originalPrice || originalPrice <= price) return null;
  return Math.round((1 - price / originalPrice) * 100);
}

export function savingsInr(price: number, originalPrice?: number): number | null {
  if (!originalPrice || originalPrice <= price) return null;
  return originalPrice - price;
}