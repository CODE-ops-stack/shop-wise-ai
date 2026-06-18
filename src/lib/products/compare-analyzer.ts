import { getMarketplace, getMarketplacePriority } from '../../../config/marketplaces';
import type { Product } from '../../types/products';
import { isWithinBudget } from '../ui/budget';
import { discountPercent, formatInr, savingsInr } from '../ui/format';

export type CompareWinner = 0 | 1 | 'tie';

export interface CompareRow {
  id: string;
  label: string;
  left: string;
  right: string;
  winner: CompareWinner | null;
  hint?: string;
  /** Shown only when this row helps a real decision. */
  show: boolean;
}

export interface CompareInsight {
  left: Product;
  right: Product;
  leftShort: string;
  rightShort: string;
  verdict: string;
  recommendation: string;
  recommendedIndex: 0 | 1 | null;
  rows: CompareRow[];
  limitations: string[];
  uniqueToLeft: string[];
  uniqueToRight: string[];
}

const COMPARE_LIMITATIONS = [
  'Size, colour variants, and live stock are not checked — confirm on the store page.',
  'Prices and offers can change after you open the link.',
  'Return, exchange, and delivery timelines are not compared here.',
  'We compare search snapshot data, not full product specifications.',
] as const;

const ROW_WEIGHTS: Record<string, number> = {
  price: 2,
  budget: 2.5,
  rating: 1.5,
  discount: 1,
  store: 0.5,
};

function shortTitle(title: string): string {
  const trimmed = title.trim();
  if (trimmed.length <= 40) return trimmed;
  return `${trimmed.slice(0, 37)}…`;
}

function storeLabel(product: Product): string {
  return getMarketplace(product.marketplace).label;
}

function addScore(scores: [number, number], winner: CompareWinner | null, weight: number) {
  if (winner === 0) scores[0] += weight;
  else if (winner === 1) scores[1] += weight;
}

function buildVerdict(
  leftShort: string,
  rightShort: string,
  rows: CompareRow[],
): string {
  const wins = rows
    .filter((row) => row.show && row.winner !== null && row.winner !== 'tie')
    .map((row) => {
      const name = row.winner === 0 ? leftShort : rightShort;
      const verb =
        row.id === 'price'
          ? 'cheaper'
          : row.id === 'rating'
            ? 'better rated'
            : row.id === 'discount'
              ? 'bigger discount'
              : row.id === 'budget'
                ? 'fits your budget'
                : 'preferred store';
      return `${name} is ${verb}`;
    });

  if (wins.length === 0) return 'Very close — pick by store you trust or open both links.';
  if (wins.length === 1) return wins[0];
  return `${wins[0]} · ${wins[1]}`;
}

function buildRecommendation(
  left: Product,
  right: Product,
  scores: [number, number],
  rows: CompareRow[],
): { text: string; index: 0 | 1 | null } {
  const diff = scores[0] - scores[1];
  if (Math.abs(diff) < 0.75) {
    return {
      text: 'Too close to call — open both and check size, reviews, and delivery on each store.',
      index: null,
    };
  }

  const index: 0 | 1 = diff > 0 ? 0 : 1;
  const pick = index === 0 ? left : right;
  const label = storeLabel(pick);

  const priceRow = rows.find((r) => r.id === 'price');
  const ratingRow = rows.find((r) => r.id === 'rating');
  const budgetRow = rows.find((r) => r.id === 'budget');

  if (budgetRow?.winner === index && budgetRow.show) {
    return { text: `Lean toward ${label} — it fits your budget with the best overall balance.`, index };
  }
  if (priceRow?.winner === index && ratingRow?.winner === index) {
    return { text: `Lean toward ${label} — lower price and stronger reviews.`, index };
  }
  if (priceRow?.winner === index) {
    return { text: `Lean toward ${label} if saving money matters most.`, index };
  }
  if (ratingRow?.winner === index) {
    return { text: `Lean toward ${label} if buyer ratings matter most.`, index };
  }

  return { text: `Lean toward ${label} based on price, ratings, and store match.`, index };
}

export function analyzeCompare(
  left: Product,
  right: Product,
  budgetMax?: number,
): CompareInsight {
  const rows: CompareRow[] = [];
  const scores: [number, number] = [0, 0];

  const priceWinner: CompareWinner =
    left.price < right.price ? 0 : left.price > right.price ? 1 : 'tie';
  const priceDiff = Math.abs(left.price - right.price);
  const priceRow: CompareRow = {
    id: 'price',
    label: 'Price',
    left: formatInr(left.price),
    right: formatInr(right.price),
    winner: priceWinner,
    hint: priceDiff >= 50 ? `${formatInr(priceDiff)} apart` : undefined,
    show: true,
  };
  rows.push(priceRow);
  addScore(scores, priceWinner, ROW_WEIGHTS.price);

  if (left.originalPrice || right.originalPrice) {
    const leftPct = discountPercent(left.price, left.originalPrice);
    const rightPct = discountPercent(right.price, right.originalPrice);
    const leftSave = savingsInr(left.price, left.originalPrice);
    const rightSave = savingsInr(right.price, right.originalPrice);
    let discountWinner: CompareWinner = 'tie';
    if (leftSave && rightSave) {
      discountWinner = leftSave > rightSave ? 0 : leftSave < rightSave ? 1 : 'tie';
    } else if (leftSave) discountWinner = 0;
    else if (rightSave) discountWinner = 1;

    rows.push({
      id: 'discount',
      label: 'You save',
      left: leftSave ? formatInr(leftSave) : '—',
      right: rightSave ? formatInr(rightSave) : '—',
      winner: discountWinner,
      hint:
        leftPct || rightPct
          ? `${leftPct ?? 0}% vs ${rightPct ?? 0}% off`
          : undefined,
      show: Boolean(leftSave || rightSave),
    });
    addScore(scores, discountWinner, ROW_WEIGHTS.discount);
  }

  if (left.rating || right.rating) {
    const l = left.rating ?? 0;
    const r = right.rating ?? 0;
    let ratingWinner: CompareWinner = 'tie';
    if (l && r) ratingWinner = l > r ? 0 : l < r ? 1 : 'tie';
    else if (l) ratingWinner = 0;
    else if (r) ratingWinner = 1;

    const row: CompareRow = {
      id: 'rating',
      label: 'Rating',
      left: left.rating ? `${left.rating.toFixed(1)} ★` : 'Not available',
      right: right.rating ? `${right.rating.toFixed(1)} ★` : 'Not available',
      winner: ratingWinner,
      hint:
        left.reviewCount || right.reviewCount
          ? `${(left.reviewCount ?? 0).toLocaleString('en-IN')} vs ${(right.reviewCount ?? 0).toLocaleString('en-IN')} reviews`
          : undefined,
      show: Boolean(l || r),
    };
    rows.push(row);
    addScore(scores, ratingWinner, ROW_WEIGHTS.rating);
  }

  const leftTrust = getMarketplacePriority(left.marketplace);
  const rightTrust = getMarketplacePriority(right.marketplace);
  const storeWinner: CompareWinner =
    leftTrust < rightTrust ? 0 : leftTrust > rightTrust ? 1 : 'tie';
  rows.push({
    id: 'store',
    label: 'Store',
    left: storeLabel(left),
    right: storeLabel(right),
    winner: storeWinner,
    hint: 'Fashion-first stores ranked higher for clothing',
    show: storeWinner !== 'tie',
  });
  addScore(scores, storeWinner, ROW_WEIGHTS.store);

  if (budgetMax != null) {
    const lIn = isWithinBudget(left.price, budgetMax);
    const rIn = isWithinBudget(right.price, budgetMax);
    let budgetWinner: CompareWinner = 'tie';
    if (lIn && !rIn) budgetWinner = 0;
    else if (!lIn && rIn) budgetWinner = 1;

    rows.push({
      id: 'budget',
      label: 'Your budget',
      left: lIn ? `Within ₹${budgetMax.toLocaleString('en-IN')}` : `Over budget`,
      right: rIn ? `Within ₹${budgetMax.toLocaleString('en-IN')}` : `Over budget`,
      winner: budgetWinner,
      show: !lIn || !rIn || lIn !== rIn,
    });
    addScore(scores, budgetWinner, ROW_WEIGHTS.budget);
  }

  const leftHighlightKeys = new Set(left.highlights.map((h) => h.toLowerCase()));
  const rightHighlightKeys = new Set(right.highlights.map((h) => h.toLowerCase()));
  const uniqueToLeft = left.highlights.filter((h) => !rightHighlightKeys.has(h.toLowerCase()));
  const uniqueToRight = right.highlights.filter((h) => !leftHighlightKeys.has(h.toLowerCase()));

  const leftShort = shortTitle(left.title);
  const rightShort = shortTitle(right.title);
  const { text: recommendation, index: recommendedIndex } = buildRecommendation(
    left,
    right,
    scores,
    rows,
  );

  return {
    left,
    right,
    leftShort,
    rightShort,
    verdict: buildVerdict(leftShort, rightShort, rows),
    recommendation,
    recommendedIndex,
    rows: rows.filter((row) => row.show),
    limitations: [...COMPARE_LIMITATIONS],
    uniqueToLeft: uniqueToLeft.slice(0, 3),
    uniqueToRight: uniqueToRight.slice(0, 3),
  };
}

export const MAX_COMPARE_ITEMS = 2;