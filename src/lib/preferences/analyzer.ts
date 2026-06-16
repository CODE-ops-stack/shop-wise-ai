import { getCategoryConfig, getDefaultCategory } from '../../../config/categories';
import type { CategoryConfig } from '../../types/preferences';
import type {
  BudgetRange,
  FilledSlots,
  GeminiAnalyzeResult,
  PreferencePanel,
  PreferencePanelField,
  QueryAnalysis,
  ResolvedPreferences,
  SlotValue,
} from '../../types/preferences';

const BUDGET_PATTERNS = [
  /under\s*(?:rs\.?|₹|inr)?\s*(\d[\d,]*)/i,
  /below\s*(?:rs\.?|₹|inr)?\s*(\d[\d,]*)/i,
  /(?:rs\.?|₹|inr)\s*(\d[\d,]*)\s*(?:to|and|-)\s*(?:rs\.?|₹|inr)?\s*(\d[\d,]*)/i,
  /(?:rs\.?|₹|inr)\s*(\d[\d,]*)/i,
  /(\d[\d,]*)\s*(?:rupees?|rs)/i,
];

const COLOR_KEYWORDS: Record<string, string[]> = {
  black: ['black', 'kala'],
  white: ['white', 'off-white', 'offwhite', 'cream'],
  blue: ['blue', 'navy', 'indigo', 'denim blue'],
  red: ['red', 'maroon', 'crimson'],
  green: ['green', 'olive', 'teal'],
  pink: ['pink', 'rose', 'magenta'],
  beige: ['beige', 'neutral', 'tan', 'nude', 'brown', 'khaki'],
  multicolor: ['multicolor', 'multi color', 'printed', 'floral'],
};

const FIT_KEYWORDS: Record<string, string[]> = {
  slim: ['slim', 'slim fit', 'fitted'],
  regular: ['regular', 'regular fit', 'standard'],
  relaxed: ['relaxed', 'comfort', 'loose'],
  oversized: ['oversized', 'oversize', 'baggy'],
};

const FABRIC_KEYWORDS: Record<string, string[]> = {
  cotton: ['cotton'],
  linen: ['linen'],
  polyester: ['polyester', 'poly'],
  blend: ['blend', 'mixed', 'cotton blend'],
  silk: ['silk'],
  denim: ['denim', 'jeans'],
  wool: ['wool', 'woolen', 'woollen'],
};

const SIZE_PATTERN = /\b(XXL|XL|XS|[SML])\b/i;

const GENDER_KEYWORDS: Record<string, string[]> = {
  men: ['men', "men's", 'mens', 'male', 'boy', 'boys'],
  women: ['women', "women's", 'womens', 'female', 'girl', 'girls', 'ladies', 'lady'],
  unisex: ['unisex'],
};

const SLEEVELESS_KEYWORDS = {
  yes: ['sleeveless', 'without sleeves', 'no sleeves'],
  no: ['full sleeve', 'full sleeves', 'long sleeve', 'long sleeves'],
};

function normalizeQuery(query: string): string {
  return query.trim().toLowerCase().replace(/\s+/g, ' ');
}

function parseAmount(value: string): number {
  return Number(value.replace(/,/g, ''));
}

function isBudgetRange(value: SlotValue): value is BudgetRange {
  return typeof value === 'object' && !Array.isArray(value);
}

function slotIsFilled(value: SlotValue | undefined): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (isBudgetRange(value)) return value.min !== undefined || value.max !== undefined;
  return false;
}

function mergeSlots(base: FilledSlots, incoming: FilledSlots): FilledSlots {
  const merged: FilledSlots = { ...base };

  for (const [key, value] of Object.entries(incoming)) {
    if (!slotIsFilled(value)) continue;

    if (key === 'budget' && isBudgetRange(value) && isBudgetRange(merged.budget)) {
      merged.budget = {
        min: value.min ?? merged.budget.min,
        max: value.max ?? merged.budget.max,
      };
      continue;
    }

    merged[key] = value;
  }

  return merged;
}

export function detectCategory(query: string): CategoryConfig {
  const normalized = normalizeQuery(query);

  for (const config of Object.values({ clothing: getDefaultCategory() })) {
    const matched = config.keywords.some((keyword) => {
      const pattern = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      return pattern.test(normalized);
    });
    if (matched) return config;
  }

  return getDefaultCategory();
}

export function detectSubcategory(
  query: string,
  config: CategoryConfig,
): string | undefined {
  const normalized = normalizeQuery(query);
  if (!config.subcategories) return undefined;

  for (const keywords of Object.values(config.subcategories)) {
    for (const keyword of keywords) {
      const pattern = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (pattern.test(normalized)) return keyword;
    }
  }

  return undefined;
}

function matchKeywordMap(
  query: string,
  map: Record<string, string[]>,
): string | undefined {
  const normalized = normalizeQuery(query);

  for (const [value, keywords] of Object.entries(map)) {
    if (keywords.some((keyword) => normalized.includes(keyword))) {
      return value;
    }
  }

  return undefined;
}

function matchKeywordMapMulti(
  query: string,
  map: Record<string, string[]>,
): string[] {
  const normalized = normalizeQuery(query);
  const matches: string[] = [];

  for (const [value, keywords] of Object.entries(map)) {
    if (keywords.some((keyword) => normalized.includes(keyword))) {
      matches.push(value);
    }
  }

  return matches;
}

export function extractBudget(query: string): BudgetRange | undefined {
  for (const pattern of BUDGET_PATTERNS) {
    const match = query.match(pattern);
    if (!match) continue;

    if (match[2]) {
      return {
        min: parseAmount(match[1]),
        max: parseAmount(match[2]),
      };
    }

    const amount = parseAmount(match[1]);
    if (/under|below/i.test(query)) {
      return { max: amount };
    }

    return { max: amount };
  }

  return undefined;
}

export function extractFilledSlotsFromQuery(
  query: string,
  config: CategoryConfig,
): { slots: FilledSlots; subcategory?: string } {
  const slots: FilledSlots = {};
  const subcategory = detectSubcategory(query, config);

  const budget = extractBudget(query);
  if (budget) slots.budget = budget;

  const sizeMatch = query.match(SIZE_PATTERN);
  if (sizeMatch) slots.size = sizeMatch[1].toUpperCase();

  const colors = matchKeywordMapMulti(query, COLOR_KEYWORDS);
  if (colors.length) slots.color = colors;

  const fit = matchKeywordMap(query, FIT_KEYWORDS);
  if (fit) slots.fit = fit;

  const fabrics = matchKeywordMapMulti(query, FABRIC_KEYWORDS);
  if (fabrics.length) slots.fabric = fabrics;

  const gender = matchKeywordMap(query, GENDER_KEYWORDS);
  if (gender) slots.gender = gender;

  if (SLEEVELESS_KEYWORDS.yes.some((k) => query.toLowerCase().includes(k))) {
    slots.sleeveless = 'yes';
  } else if (SLEEVELESS_KEYWORDS.no.some((k) => query.toLowerCase().includes(k))) {
    slots.sleeveless = 'no';
  }

  return { slots, subcategory };
}

function resolveConditionalFields(
  config: CategoryConfig,
  context: { subcategory?: string },
): string[] {
  const fields = new Set<string>();

  for (const rule of config.conditional) {
    const matches = Object.entries(rule.when).every(([key, values]) => {
      const contextValue = context[key as keyof typeof context];
      return contextValue ? values.includes(contextValue) : false;
    });

    if (matches) {
      rule.fields.forEach((field) => fields.add(field));
    }
  }

  return [...fields];
}

export function getRequiredFields(
  config: CategoryConfig,
  context: { subcategory?: string },
): string[] {
  const conditional = resolveConditionalFields(config, context);
  return [...new Set([...config.required, ...conditional])];
}

export function getMissingSlots(
  requiredAndConditional: string[],
  filledSlots: FilledSlots,
): string[] {
  return requiredAndConditional.filter((fieldId) => !slotIsFilled(filledSlots[fieldId]));
}

function scoreOptionalField(
  config: CategoryConfig,
  fieldId: string,
  query: string,
): number {
  const base = config.optionalImpact?.[fieldId] ?? 0.5;
  const normalized = normalizeQuery(query);

  if (fieldId === 'fabric' && /summer|monsoon|winter|office|formal|daily/i.test(normalized)) {
    return base + 0.15;
  }
  if (fieldId === 'color' && /black|white|blue|red|pink|green|beige/i.test(normalized)) {
    return base - 0.4;
  }
  if (fieldId === 'sleeveless' && /sleeve|kurta|top|dress/i.test(normalized)) {
    return base + 0.1;
  }

  return base;
}

function selectPanelFields(
  config: CategoryConfig,
  missingRequired: string[],
  filledSlots: FilledSlots,
  query: string,
  geminiSuggested?: string[],
): string[] {
  const selected = new Set<string>(missingRequired);

  if (geminiSuggested?.length) {
    for (const fieldId of geminiSuggested) {
      if (config.fields[fieldId] && !slotIsFilled(filledSlots[fieldId])) {
        selected.add(fieldId);
      }
    }
  }

  const optionalCandidates = config.optional
    .filter((fieldId) => !slotIsFilled(filledSlots[fieldId]) && !selected.has(fieldId))
    .map((fieldId) => ({
      fieldId,
      score: scoreOptionalField(config, fieldId, query),
    }))
    .sort((a, b) => b.score - a.score);

  for (const { fieldId } of optionalCandidates) {
    if (selected.size >= config.maxQuestions) break;
    selected.add(fieldId);
  }

  return [...selected].slice(0, config.maxQuestions);
}

function buildPanelTitle(
  query: string,
  subcategory?: string,
): { title: string; subtitle?: string } {
  const item = subcategory ?? 'clothing';
  return {
    title: `Quick preferences for your ${item}`,
    subtitle: 'Only the details we still need — tap and go.',
  };
}

export function buildSearchIntent(
  query: string,
  filledSlots: FilledSlots,
  subcategory?: string,
): string {
  const parts: string[] = [];

  if (typeof filledSlots.gender === 'string') parts.push(filledSlots.gender);
  if (subcategory) parts.push(subcategory);

  if (Array.isArray(filledSlots.color)) {
    parts.push(...filledSlots.color);
  } else if (typeof filledSlots.color === 'string') {
    parts.push(filledSlots.color);
  }

  if (Array.isArray(filledSlots.fabric)) {
    parts.push(...filledSlots.fabric);
  } else if (typeof filledSlots.fabric === 'string') {
    parts.push(filledSlots.fabric);
  }

  if (typeof filledSlots.fit === 'string') parts.push(`${filledSlots.fit} fit`);
  if (typeof filledSlots.size === 'string') parts.push(`size ${filledSlots.size}`);
  if (filledSlots.sleeveless === 'yes') parts.push('sleeveless');
  if (filledSlots.sleeveless === 'no') parts.push('with sleeves');

  if (isBudgetRange(filledSlots.budget)) {
    const { min, max } = filledSlots.budget;
    if (max && min) parts.push(`budget ₹${min}-₹${max}`);
    else if (max) parts.push(`under ₹${max}`);
    else if (min) parts.push(`above ₹${min}`);
  }

  const normalizedQuery = normalizeQuery(query);
  parts.push(normalizedQuery);

  return [...new Set(parts.filter(Boolean))].join(' ').trim();
}

export function buildPreferencePanel(
  query: string,
  config: CategoryConfig,
  filledSlots: FilledSlots,
  subcategory?: string,
  geminiSuggested?: string[],
): PreferencePanel | null {
  const requiredFields = getRequiredFields(config, { subcategory });
  const missingRequired = getMissingSlots(requiredFields, filledSlots);
  const panelFieldIds = selectPanelFields(
    config,
    missingRequired,
    filledSlots,
    query,
    geminiSuggested,
  );

  if (panelFieldIds.length === 0) return null;

  const { title, subtitle } = buildPanelTitle(query, subcategory);
  const requiredSet = new Set(requiredFields);

  const fields: PreferencePanelField[] = panelFieldIds
    .filter((id) => config.fields[id])
    .map((id) => ({
      id,
      config: config.fields[id],
      reason: requiredSet.has(id)
        ? missingRequired.includes(id)
          ? 'required'
          : 'conditional'
        : 'optional',
    }));

  return {
    title,
    subtitle,
    categoryId: config.id,
    subcategory,
    fields,
    prefilled: filledSlots,
    searchIntent: buildSearchIntent(query, filledSlots, subcategory),
  };
}

export function mergeGeminiAnalysis(
  local: QueryAnalysis,
  gemini?: GeminiAnalyzeResult,
): QueryAnalysis {
  if (!gemini) return local;

  const config = getCategoryConfig(gemini.category) ?? getDefaultCategory();
  const subcategory = gemini.subcategory ?? local.subcategory;
  const filledSlots = mergeSlots(local.filledSlots, gemini.filledSlots);
  const requiredFields = getRequiredFields(config, { subcategory });
  const missingSlots = getMissingSlots(requiredFields, filledSlots);

  const panel = buildPreferencePanel(
    local.searchIntent,
    config,
    filledSlots,
    subcategory,
    gemini.suggestedPanel.fields,
  );

  return {
    categoryId: config.id,
    subcategory,
    confidence: Math.max(local.confidence, gemini.confidence),
    filledSlots,
    missingSlots,
    panel,
    searchIntent: gemini.searchIntent || buildSearchIntent(local.searchIntent, filledSlots, subcategory),
  };
}

/** Main entry: rule-based analysis (fast path). Merge with Gemini on the server. */
export function analyzeQuery(query: string): QueryAnalysis {
  const trimmed = query.trim();
  if (!trimmed) {
    throw new Error('Query cannot be empty');
  }

  const config = detectCategory(trimmed);
  const { slots, subcategory } = extractFilledSlotsFromQuery(trimmed, config);
  const requiredFields = getRequiredFields(config, { subcategory });
  const missingSlots = getMissingSlots(requiredFields, slots);
  const panel = buildPreferencePanel(trimmed, config, slots, subcategory);
  const searchIntent = buildSearchIntent(trimmed, slots, subcategory);

  return {
    categoryId: config.id,
    subcategory,
    confidence: subcategory ? 0.85 : 0.7,
    filledSlots: slots,
    missingSlots,
    panel,
    searchIntent,
  };
}

export function resolvePreferences(
  panel: PreferencePanel,
  selections: FilledSlots,
): ResolvedPreferences {
  const merged = mergeSlots(panel.prefilled, selections);

  return {
    categoryId: panel.categoryId,
    subcategory: panel.subcategory,
    searchIntent: buildSearchIntent(
      panel.searchIntent,
      merged,
      panel.subcategory,
    ),
    slots: merged,
  };
}

export function panelSummary(preferences: ResolvedPreferences): string[] {
  const chips: string[] = [];
  const { slots } = preferences;

  if (typeof slots.size === 'string') chips.push(`Size ${slots.size}`);
  if (typeof slots.fit === 'string') chips.push(`${slots.fit} fit`);
  if (Array.isArray(slots.color)) chips.push(slots.color.join(', '));
  if (Array.isArray(slots.fabric)) chips.push(slots.fabric.join(', '));
  if (slots.sleeveless === 'yes') chips.push('Sleeveless');
  if (typeof slots.gender === 'string') chips.push(slots.gender);
  if (isBudgetRange(slots.budget)) {
    const { min, max } = slots.budget;
    if (max && min) chips.push(`₹${min}–₹${max}`);
    else if (max) chips.push(`≤ ₹${max}`);
    else if (min) chips.push(`≥ ₹${min}`);
  }

  return chips;
}