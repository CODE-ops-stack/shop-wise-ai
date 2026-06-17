export const APP_CONFIG = {
  maxProductsPerPage: 10,
  maxTotalProducts: 50,
  analyzeTimeoutMs:30_000,
  searchTimeoutMs: 60_000,
  geminiModels: ['gemini-2.5-flash', 'gemini-2.5-flash-lite'],
  /** Grounded product search — 2.5 supports Google Search on free tier better than 3.5 */
  productSearchModels: ['gemini-2.5-flash', 'gemini-2.5-flash-lite'],
  geminiModel: 'gemini-2.5-flash',
  geminiEnhanceConfidenceThreshold: 0.85,
  defaultCategory: 'clothing',
} as const;