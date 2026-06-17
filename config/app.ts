export const APP_CONFIG = {
  maxProductsPerPage: 10,
  maxTotalProducts: 50,
  analyzeTimeoutMs:30_000,
  searchTimeoutMs: 40_000,
  geminiModel: 'gemini-3.5-flash',
  geminiEnhanceConfidenceThreshold: 0.85,
  defaultCategory: 'clothing',
} as const;