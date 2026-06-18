export const SITE = {
  name: 'ShopWise AI',
  tagline: 'Next-gen smart shopping assistant for India',
  description:
    'AI-powered shopping assistant for India. Find exact product pages on Myntra, AJIO, Nykaa Fashion, Amazon & Flipkart — ranked by match, price, and trust.',
  url: 'https://shop-wise-ai.vercel.app',
  locale: 'en_IN',
} as const;

export const EXAMPLE_PROMPTS = [
  'Black cotton kurta for men under ₹1500',
  'Kurta pyjama set women in 500',
  'White sneakers under ₹2000',
  'Party wear saree under ₹3000',
] as const;

export const TRUST_FEATURES = [
  { icon: 'link', label: 'Exact product links' },
  { icon: 'spark', label: 'AI-ranked picks' },
  { icon: 'store', label: '5 trusted stores' },
] as const;