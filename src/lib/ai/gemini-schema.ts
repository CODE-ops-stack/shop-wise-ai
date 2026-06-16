import { SchemaType, type ResponseSchema } from '@google/generative-ai';

/** Gemini-compatible schema for the analyze step structured output. */
export const QUERY_ANALYSIS_GEMINI_SCHEMA: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    category: {
      type: SchemaType.STRING,
      format: 'enum',
      enum: ['clothing'],
      description: 'Product category id.',
    },
    subcategory: {
      type: SchemaType.STRING,
      description: 'Specific clothing item e.g. shirt, kurta, jeans.',
      nullable: true,
    },
    confidence: {
      type: SchemaType.NUMBER,
      description: 'Confidence score between 0 and 1.',
    },
    filledSlots: {
      type: SchemaType.OBJECT,
      description: 'Parameters already inferred from the user query.',
      properties: {
        size: { type: SchemaType.STRING, nullable: true },
        color: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.STRING },
          nullable: true,
        },
        fit: { type: SchemaType.STRING, nullable: true },
        fabric: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.STRING },
          nullable: true,
        },
        sleeveless: {
          type: SchemaType.STRING,
          format: 'enum',
          enum: ['yes', 'no'],
          nullable: true,
        },
        gender: {
          type: SchemaType.STRING,
          format: 'enum',
          enum: ['men', 'women', 'unisex'],
          nullable: true,
        },
        budget: {
          type: SchemaType.OBJECT,
          properties: {
            min: { type: SchemaType.NUMBER, nullable: true },
            max: { type: SchemaType.NUMBER, nullable: true },
          },
          nullable: true,
        },
      },
    },
    missingSlots: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
    },
    suggestedPanel: {
      type: SchemaType.OBJECT,
      properties: {
        title: { type: SchemaType.STRING },
        subtitle: { type: SchemaType.STRING, nullable: true },
        fields: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.STRING },
        },
      },
      required: ['title', 'fields'],
    },
    searchIntent: {
      type: SchemaType.STRING,
      description: 'Compact search string for Indian marketplace product discovery.',
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
};