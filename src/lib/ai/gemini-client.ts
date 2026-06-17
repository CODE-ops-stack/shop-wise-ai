import { GoogleGenerativeAI, type ResponseSchema } from '@google/generative-ai';
import { GEMINI_API_KEY } from 'astro:env/server';
import { APP_CONFIG } from '../../../config/app';
import { QUERY_ANALYSIS_GEMINI_SCHEMA } from './gemini-schema';

export class GeminiError extends Error {
  constructor(
    message: string,
    public readonly code: 'MISSING_API_KEY' | 'TIMEOUT' | 'PARSE_ERROR' | 'API_ERROR',
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'GeminiError';
  }
}

export interface StructuredJsonRequest<T> {
  systemPrompt: string;
  userPrompt: string;
  schema?: ResponseSchema;
  temperature?: number;
  timeoutMs?: number;
}

let client: GoogleGenerativeAI | null = null;

function getApiKey(): string | undefined {
  return GEMINI_API_KEY ?? process.env.GEMINI_API_KEY;
}

function getClient(): GoogleGenerativeAI {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new GeminiError('GEMINI_API_KEY is not configured', 'MISSING_API_KEY');
  }

  if (!client) {
    client = new GoogleGenerativeAI(apiKey);
  }

  return client;
}

function parseJsonResponse<T>(text: string): T {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const payload = fenced?.[1]?.trim() ?? trimmed;

  try {
    return JSON.parse(payload) as T;
  } catch (error) {
    throw new GeminiError('Failed to parse Gemini JSON response', 'PARSE_ERROR', error);
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function extractApiErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) return 'Gemini API request failed';

  const message = error.message;

  if (message.includes('429') || message.toLowerCase().includes('quota')) {
    return 'Gemini rate limit reached. Wait 30–60 seconds and try again.';
  }
  if (message.includes('503') || message.toLowerCase().includes('high demand')) {
    return 'Gemini is temporarily overloaded. Trying a fallback model.';
  }
  if (message.includes('403') || message.toLowerCase().includes('api key')) {
    return 'Gemini API key is invalid or lacks permission.';
  }
  if (message.includes('404')) {
    return 'Gemini model is not available for your API key.';
  }

  return message.split('\n')[0] || 'Gemini API request failed';
}

function shouldTryNextModel(error: unknown): boolean {
  if (error instanceof GeminiError) {
    if (error.code === 'MISSING_API_KEY' || error.code === 'PARSE_ERROR') return false;
    return error.code === 'TIMEOUT' || error.code === 'API_ERROR';
  }

  const message = errorMessage(error).toLowerCase();
  if (message.includes('403') || message.toLowerCase().includes('api key')) return false;

  return (
    message.includes('503') ||
    message.includes('429') ||
    message.includes('404') ||
    message.includes('500') ||
    message.includes('quota') ||
    message.includes('high demand') ||
    message.includes('overloaded') ||
    message.includes('unavailable')
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new GeminiError(`Gemini request timed out after ${timeoutMs}ms`, 'TIMEOUT'));
    }, timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

/**
 * Reusable structured JSON generation via Gemini.
 * Uses responseMimeType + responseSchema for reliable parsing.
 */
async function callGemini<T>(
  modelName: string,
  systemPrompt: string,
  userPrompt: string,
  schema: ResponseSchema,
  temperature: number,
  timeoutMs: number,
): Promise<T> {
  const genAI = getClient();
  const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: systemPrompt,
    generationConfig: {
      temperature,
      responseMimeType: 'application/json',
      responseSchema: schema,
    },
  });

  const result = await withTimeout(model.generateContent(userPrompt), timeoutMs);
  const text = result.response.text();

  if (!text) {
    throw new GeminiError('Gemini returned an empty response', 'API_ERROR');
  }

  return parseJsonResponse<T>(text);
}

export async function generateStructuredJson<T>({
  systemPrompt,
  userPrompt,
  schema = QUERY_ANALYSIS_GEMINI_SCHEMA,
  temperature = 0.2,
  timeoutMs = APP_CONFIG.analyzeTimeoutMs,
}: StructuredJsonRequest<T>): Promise<T> {
  const models = APP_CONFIG.geminiModels;
  let lastError: unknown;

  for (let i = 0; i < models.length; i++) {
    const modelName = models[i];

    try {
      return await callGemini<T>(
        modelName,
        systemPrompt,
        userPrompt,
        schema,
        temperature,
        timeoutMs,
      );
    } catch (error) {
      lastError = error;

      if (error instanceof GeminiError && error.code !== 'API_ERROR') {
        if (error.code === 'TIMEOUT' && i < models.length - 1) {
          continue;
        }
        throw error;
      }

      const hasNextModel = i < models.length - 1;
      if (!hasNextModel || !shouldTryNextModel(error)) {
        if (error instanceof GeminiError) throw error;
        throw new GeminiError(extractApiErrorMessage(error), 'API_ERROR', error);
      }

      await sleep(500);
    }
  }

  if (lastError instanceof GeminiError) throw lastError;
  throw new GeminiError(extractApiErrorMessage(lastError), 'API_ERROR', lastError);
}

export function isGeminiConfigured(): boolean {
  return Boolean(getApiKey());
}