import { GEMINI_API_KEY } from 'astro:env/server';
import { APP_CONFIG } from '../../../config/app';
import { GeminiError } from './gemini-client';

function getApiKey(): string | undefined {
  return GEMINI_API_KEY ?? process.env.GEMINI_API_KEY;
}

interface GroundingChunk {
  web?: { uri?: string; title?: string };
}

interface GroundedApiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    groundingMetadata?: {
      groundingChunks?: GroundingChunk[];
    };
  }>;
  error?: { message?: string };
}

function parseJsonResponse<T>(text: string): T {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const payload = fenced?.[1]?.trim() ?? trimmed;

  try {
    return JSON.parse(payload) as T;
  } catch (error) {
    throw new GeminiError('Failed to parse grounded Gemini JSON response', 'PARSE_ERROR', error);
  }
}

function extractGroundingUrls(response: GroundedApiResponse): string[] {
  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
  return chunks
    .map((chunk) => chunk.web?.uri)
    .filter((uri): uri is string => typeof uri === 'string' && uri.startsWith('http'));
}

function shouldTryNextModel(error: unknown): boolean {
  if (error instanceof GeminiError) {
    return error.code === 'TIMEOUT' || error.code === 'API_ERROR';
  }

  const message = error instanceof Error ? error.message.toLowerCase() : '';
  return (
    message.includes('503') ||
    message.includes('429') ||
    message.includes('404') ||
    message.includes('500') ||
    message.includes('quota') ||
    message.includes('high demand') ||
    message.includes('overloaded')
  );
}

async function callGroundedGemini(
  apiKey: string,
  modelName: string,
  systemPrompt: string,
  userPrompt: string,
  temperature: number,
  timeoutMs: number,
): Promise<{ text: string; groundingUrls: string[] }> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        tools: [{ google_search: {} }],
        generationConfig: { temperature },
      }),
      signal: AbortSignal.timeout(timeoutMs),
    },
  );

  const payload = (await response.json()) as GroundedApiResponse;

  if (!response.ok) {
    throw new GeminiError(
      payload.error?.message ?? `Grounded Gemini request failed (${response.status})`,
      'API_ERROR',
    );
  }

  const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('') ?? '';
  if (!text) {
    throw new GeminiError('Grounded Gemini returned an empty response', 'API_ERROR');
  }

  return { text, groundingUrls: extractGroundingUrls(payload) };
}

export interface GroundedJsonRequest<T> {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  timeoutMs?: number;
}

export async function generateGroundedJson<T>({
  systemPrompt,
  userPrompt,
  temperature = 0.2,
  timeoutMs = APP_CONFIG.searchTimeoutMs,
}: GroundedJsonRequest<T>): Promise<{ data: T; groundingUrls: string[] }> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new GeminiError('GEMINI_API_KEY is not configured', 'MISSING_API_KEY');
  }

  const models = APP_CONFIG.productSearchModels;
  let lastError: unknown;

  for (let i = 0; i < models.length; i++) {
    const modelName = models[i];

    try {
      const { text, groundingUrls } = await callGroundedGemini(
        apiKey,
        modelName,
        systemPrompt,
        userPrompt,
        temperature,
        timeoutMs,
      );
      return { data: parseJsonResponse<T>(text), groundingUrls };
    } catch (error) {
      lastError = error;

      if (error instanceof GeminiError && error.code !== 'API_ERROR') {
        throw error;
      }

      const hasNextModel = i < models.length - 1;
      if (!hasNextModel || !shouldTryNextModel(error)) {
        if (error instanceof GeminiError) throw error;
        throw new GeminiError(
          error instanceof Error ? error.message : 'Grounded Gemini request failed',
          'API_ERROR',
          error,
        );
      }

      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  if (lastError instanceof GeminiError) throw lastError;
  throw new GeminiError('Grounded Gemini request failed', 'API_ERROR', lastError);
}