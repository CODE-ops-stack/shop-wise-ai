export const APP_CONFIG = {
  maxProductsPerPage: 10,
  maxTotalProducts: 50,
  analyzeTimeoutMs: 8_000,
  searchTimeoutMs: 12_000,
  geminiModel: 'gemini-3.5-flash',
  geminiEnhanceConfidenceThreshold: 0.85,
  defaultCategory: 'clothing',
} as const;