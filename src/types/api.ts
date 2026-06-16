import type { QueryAnalysis } from './preferences';

export interface AnalyzeRequest {
  query: string;
}

export interface AnalyzeResponse {
  analysis: QueryAnalysis;
  source: 'local' | 'gemini-enhanced';
  geminiUsed: boolean;
}