import { clothingConfig } from '../config/categories/clothing';
import type { GeminiAnalyzeResult } from '../src/types/preferences';

const FIELD_CATALOG = Object.entries(clothingConfig.fields)
  .map(([id, field]) => `- ${id} (${field.label}, type: ${field.type})`)
  .join('\n');

const REQUIRED_FIELDS = clothingConfig.required.join(', ');

const CONDITIONAL_RULES = clothingConfig.conditional
  .map(
    (rule) =>
      `  When ${Object.entries(rule.when)
        .map(([k, v]) => `${k} is ${v.join(' or ')}`)
        .join(' and ')} → ask for: ${rule.fields.join(', ')}`,
  )
  .join('\n');

export function buildAnalyzeUserPrompt(query: string): string {
  return `Analyze this shopping query from an Indian user and return structured JSON.

User query: "${query}"

Category: clothing (only supported category for now)

Available filter fields:
${FIELD_CATALOG}

Always required unless already in query: ${REQUIRED_FIELDS}

Conditional rules:
${CONDITIONAL_RULES}

Instructions:
1. Extract every parameter already stated or strongly implied in the query into filledSlots.
2. List genuinely missing required parameters in missingSlots.
3. suggestedPanel.fields must contain ONLY fields that are still missing AND useful — maximum 5 fields.
4. Do NOT include a field in suggestedPanel if the user already specified it.
5. For clothing, prioritize: budget, size, fit (for tops/bottoms), fabric (for dresses/ethnic).
6. searchIntent must be a single line optimized for finding real products on Indian marketplaces.

Return JSON only.`;
}

/** Type guard for API layer — validate Gemini response shape. */
export function parseGeminiAnalyzeResult(raw: unknown): GeminiAnalyzeResult | null {
  if (!raw || typeof raw !== 'object') return null;

  const data = raw as Record<string, unknown>;
  if (data.category !== 'clothing') return null;
  if (typeof data.confidence !== 'number') return null;
  if (typeof data.searchIntent !== 'string') return null;
  if (!data.filledSlots || typeof data.filledSlots !== 'object') return null;
  if (!Array.isArray(data.missingSlots)) return null;

  const suggested = data.suggestedPanel as Record<string, unknown> | undefined;
  if (!suggested || typeof suggested.title !== 'string' || !Array.isArray(suggested.fields)) {
    return null;
  }

  return {
    category: 'clothing',
    subcategory: typeof data.subcategory === 'string' ? data.subcategory : undefined,
    confidence: data.confidence,
    filledSlots: data.filledSlots as GeminiAnalyzeResult['filledSlots'],
    missingSlots: data.missingSlots as string[],
    suggestedPanel: {
      title: suggested.title,
      subtitle: typeof suggested.subtitle === 'string' ? suggested.subtitle : undefined,
      fields: suggested.fields as string[],
    },
    searchIntent: data.searchIntent,
  };
}