import { SchemaType, type ResponseSchema } from '@google/generative-ai';

const CLOTHING_MARKETPLACES = ['myntra', 'ajio', 'nykaa_fashion', 'amazon', 'flipkart'] as const;

export const PRODUCT_SEARCH_GEMINI_SCHEMA: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    products: {
      type: SchemaType.ARRAY,
      description: 'Up to 12 realistic clothing product recommendations for Indian shoppers.',
      items: {
        type: SchemaType.OBJECT,
        properties: {
          title: {
            type: SchemaType.STRING,
            description: 'Full product title as shown on the marketplace.',
          },
          price: {
            type: SchemaType.NUMBER,
            description: 'Current selling price in INR (integer, no decimals).',
          },
          originalPrice: {
            type: SchemaType.NUMBER,
            description: 'MRP or strikethrough price in INR if discounted.',
            nullable: true,
          },
          marketplace: {
            type: SchemaType.STRING,
            format: 'enum',
            enum: [...CLOTHING_MARKETPLACES],
          },
          url: {
            type: SchemaType.STRING,
            description: 'Exact HTTPS product detail page URL (not a search URL).',
          },
          imageUrl: {
            type: SchemaType.STRING,
            description: 'Direct HTTPS product image URL from the listing.',
            nullable: true,
          },
          rating: {
            type: SchemaType.NUMBER,
            description: 'Product rating out of 5.',
            nullable: true,
          },
          reviewCount: {
            type: SchemaType.NUMBER,
            description: 'Number of customer reviews.',
            nullable: true,
          },
          highlights: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
            description: '2-3 short feature bullets e.g. fabric, fit, delivery.',
          },
          matchScore: {
            type: SchemaType.NUMBER,
            description: '0-1 how exactly this matches user preferences (1 = perfect).',
          },
          relevanceScore: {
            type: SchemaType.NUMBER,
            description: '0-1 overall relevance to search intent.',
            nullable: true,
          },
        },
        required: ['title', 'price', 'marketplace', 'url', 'highlights', 'matchScore'],
      },
    },
  },
  required: ['products'],
};