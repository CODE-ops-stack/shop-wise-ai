import { readFileSync } from 'node:fs';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

const env = readFileSync('.env', 'utf8');
const key = env.match(/GEMINI_API_KEY=(.+)/)?.[1]?.trim();

if (!key) {
  console.error('NO GEMINI_API_KEY in .env');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(key);
const model = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash',
  generationConfig: {
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
  },
});

try {
  const result = await model.generateContent(
    'Return 1 sample men cotton kurta product for Myntra India under 1500 INR as JSON.',
  );
  console.log('SUCCESS');
  console.log(result.response.text().slice(0, 500));
} catch (error) {
  console.error('ERROR:', error?.message ?? error);
  if (error?.status) console.error('STATUS:', error.status);
  if (error?.statusText) console.error('STATUS_TEXT:', error.statusText);
  if (error?.errorDetails) console.error('DETAILS:', JSON.stringify(error.errorDetails, null, 2));
}