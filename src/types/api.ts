import type { QueryAnalysis, ResolvedPreferences } from './preferences';
import type { ProductResultsPayload } from './products';

export interface AnalyzeRequest {
  query: string;
}

export interface AnalyzeResponse {
  analysis: QueryAnalysis;
  source: 'local' | 'gemini-enhanced';
  geminiUsed: boolean;
}

export interface SearchRequest {
  preferences: ResolvedPreferences;
  cursor?: string | null;
}

export interface SearchResponse {
  results: ProductResultsPayload;
  source: 'gemini';
}

export interface SearchErrorResponse {
  error: string;
  code?: 'GEMINI_UNAVAILABLE' | 'NO_RESULTS' | 'API_ERROR';
}