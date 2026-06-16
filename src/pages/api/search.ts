import type { APIRoute } from 'astro';
import {
  ProductSearchError,
  searchProducts,
} from '../../lib/products/search-orchestrator';
import type { SearchResponse } from '../../types/api';
import type { ResolvedPreferences } from '../../types/preferences';

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
    const body = (await request.json()) as { preferences?: ResolvedPreferences };
    const preferences = body.preferences;

    if (!preferences?.searchIntent || !preferences.categoryId) {
      return jsonResponse({ error: 'Valid preferences are required' }, 400);
    }

    const results = await searchProducts(preferences);

    const response: SearchResponse = {
      results,
      source: 'gemini',
    };

    return jsonResponse(response);
  } catch (error) {
    if (error instanceof ProductSearchError) {
      const status =
        error.code === 'GEMINI_UNAVAILABLE' ? 503 : error.code === 'NO_RESULTS' ? 404 : 500;
      return jsonResponse({ error: error.message, code: error.code }, status);
    }

    console.error('[search] Unexpected error:', error);
    return jsonResponse({ error: 'Failed to search products' }, 500);
  }
};