import type { APIRoute } from 'astro';
import { APP_CONFIG } from '../../../config/app';
import { buildAnalyzeUserPrompt, parseGeminiAnalyzeResult } from '../../../prompts/analyze-query';
import { SHOPWISE_SYSTEM_PROMPT } from '../../../prompts/system';
import { generateStructuredJson, GeminiError, isGeminiConfigured } from '../../lib/ai/gemini-client';
import { shouldEnhanceWithGemini } from '../../lib/ai/should-enhance';
import { analyzeQuery, mergeGeminiAnalysis } from '../../lib/preferences/analyzer';
import type { AnalyzeResponse } from '../../types/api';
import type { GeminiAnalyzeResult } from '../../types/preferences';

export const prerender = false;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = (await request.json()) as { query?: string };
    const query = body.query?.trim();

    if (!query) {
      return jsonResponse({ error: 'Query is required' }, 400);
    }

    const localAnalysis = analyzeQuery(query);
    let analysis = localAnalysis;
    let geminiUsed = false;

    const canEnhance = isGeminiConfigured() && shouldEnhanceWithGemini(localAnalysis);

    if (canEnhance) {
      try {
        const raw = await generateStructuredJson<GeminiAnalyzeResult>({
          systemPrompt: SHOPWISE_SYSTEM_PROMPT,
          userPrompt: buildAnalyzeUserPrompt(query),
          temperature: 0.2,
          timeoutMs: APP_CONFIG.analyzeTimeoutMs,
        });

        const parsed = parseGeminiAnalyzeResult(raw);
        if (parsed) {
          analysis = mergeGeminiAnalysis(localAnalysis, parsed);
          geminiUsed = true;
        }
      } catch (error) {
        if (error instanceof GeminiError && error.code === 'MISSING_API_KEY') {
          return jsonResponse({ error: 'Gemini is not configured' }, 503);
        }
        // Graceful fallback — local analysis is already good enough.
        console.warn('[analyze] Gemini enhancement failed, using local analysis:', error);
      }
    }

    const response: AnalyzeResponse = {
      analysis,
      source: geminiUsed ? 'gemini-enhanced' : 'local',
      geminiUsed,
    };

    return jsonResponse(response);
  } catch (error) {
    console.error('[analyze] Unexpected error:', error);
    return jsonResponse({ error: 'Failed to analyze query' }, 500);
  }
};