import { GoogleGenerativeAI, type ResponseSchema } from '@google/generative-ai';
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

function getClient(): GoogleGenerativeAI {
  const apiKey = import.meta.env.GEMINI_API_KEY;
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
export async function generateStructuredJson<T>({
  systemPrompt,
  userPrompt,
  schema = QUERY_ANALYSIS_GEMINI_SCHEMA,
  temperature = 0.2,
  timeoutMs = APP_CONFIG.analyzeTimeoutMs,
}: StructuredJsonRequest<T>): Promise<T> {
  try {
    const genAI = getClient();
    const model = genAI.getGenerativeModel({
      model: APP_CONFIG.geminiModel,
      systemInstruction: systemPrompt,
      generationConfig: {
        temperature,
        responseMimeType: 'application/json',
        responseSchema: schema,
      },
    });

    const result = await withTimeout(
      model.generateContent(userPrompt),
      timeoutMs,
    );

    const text = result.response.text();
    if (!text) {
      throw new GeminiError('Gemini returned an empty response', 'API_ERROR');
    }

    return parseJsonResponse<T>(text);
  } catch (error) {
    if (error instanceof GeminiError) throw error;
    throw new GeminiError('Gemini API request failed', 'API_ERROR', error);
  }
}

export function isGeminiConfigured(): boolean {
  return Boolean(import.meta.env.GEMINI_API_KEY);
}