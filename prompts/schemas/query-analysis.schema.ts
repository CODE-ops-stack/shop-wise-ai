/**
 * JSON schema for Gemini structured output on the analyze step.
 * Pass to Gemini as responseSchema when using @google/generative-ai.
 */
export const QUERY_ANALYSIS_SCHEMA = {
  type: 'object',
  properties: {
    category: {
      type: 'string',
      description: 'Product category id. Use "clothing" for apparel queries.',
      enum: ['clothing'],
    },
    subcategory: {
      type: 'string',
      description:
        'Specific clothing item e.g. shirt, kurta, jeans, dress, saree. Omit if unclear.',
    },
    confidence: {
      type: 'number',
      description: 'Confidence score between 0 and 1.',
    },
    filledSlots: {
      type: 'object',
      description: 'Parameters already inferred from the user query.',
      properties: {
        size: { type: 'string' },
        color: {
          type: 'array',
          items: { type: 'string' },
        },
        fit: { type: 'string' },
        fabric: {
          type: 'array',
          items: { type: 'string' },
        },
        sleeveless: { type: 'string', enum: ['yes', 'no'] },
        gender: { type: 'string', enum: ['men', 'women', 'unisex'] },
        budget: {
          type: 'object',
          properties: {
            min: { type: 'number' },
            max: { type: 'number' },
          },
        },
      },
    },
    missingSlots: {
      type: 'array',
      items: { type: 'string' },
      description: 'Required parameters still missing from the query.',
    },
    suggestedPanel: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        subtitle: { type: 'string' },
        fields: {
          type: 'array',
          items: { type: 'string' },
          description:
            'Field ids to show in the preference panel. Max 5. Only missing high-impact fields.',
        },
      },
      required: ['title', 'fields'],
    },
    searchIntent: {
      type: 'string',
      description:
        'Compact search string for product discovery. Include gender, item, color, fit, size, fabric, budget in INR.',
    },
  },
  required: [
    'category',
    'confidence',
    'filledSlots',
    'missingSlots',
    'suggestedPanel',
    'searchIntent',
  ],
} as const;