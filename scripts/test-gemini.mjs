import { readFileSync } from 'node:fs';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

const env = readFileSync('.env', 'utf8');
const key = env.match(/GEMINI_API_KEY=(.+)/)?.[1]?.trim();

if (!key) {
  console.error('NO GEMINI_API_KEY in .env');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(key);
const models = ['gemini-3.5-flash', 'gemini-2.5-flash', 'gemini-2.0-flash'];
const generationConfig = {
  responseMimeType: 'application/json',
  responseSchema: {
    type: SchemaType.OBJECT,
    properties: {
      products: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            title: { type: SchemaType.STRING },
            price: { type: SchemaType.NUMBER },
            marketplace: { type: SchemaType.STRING, format: 'enum', enum: ['myntra'] },
            url: { type: SchemaType.STRING },
            highlights: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
            matchScore: { type: SchemaType.NUMBER },
          },
          required: ['title', 'price', 'marketplace', 'url', 'highlights', 'matchScore'],
        },
      },
    },
    required: ['products'],
  },
};

const prompt =
  'Return 1 sample men cotton kurta product for Myntra India under 1500 INR as JSON.';

for (const modelName of models) {
  try {
    const model = genAI.getGenerativeModel({ model: modelName, generationConfig });
    const result = await model.generateContent(prompt);
    console.log(`SUCCESS (${modelName})`);
    console.log(result.response.text().slice(0, 500));
    process.exit(0);
  } catch (error) {
    console.warn(`FAILED (${modelName}):`, error?.message ?? error);
    if (error?.status) console.warn('STATUS:', error.status);
  }
}

console.error('ERROR: All Gemini models failed');
process.exit(1);