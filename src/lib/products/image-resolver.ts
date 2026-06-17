import type { Product } from '../../types/products';
import { isValidImageUrl } from './product-url';

const FETCH_TIMEOUT_MS = 5_000;
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

function extractOgImage(html: string): string | undefined {
  const patterns = [
    /<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::secure_url)?["']/i,
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return match[1].trim();
  }

  return undefined;
}

export async function fetchProductImageFromPage(
  productUrl: string,
): Promise<string | undefined> {
  try {
    const response = await fetch(productUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-IN,en;q=0.9',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (!response.ok) return undefined;

    const html = await response.text();
    const imageUrl = extractOgImage(html);
    return imageUrl && isValidImageUrl(imageUrl) ? imageUrl : undefined;
  } catch {
    return undefined;
  }
}

export async function enrichProductImages(products: Product[]): Promise<Product[]> {
  const enriched = await Promise.all(
    products.map(async (product) => {
      if (product.imageUrl && isValidImageUrl(product.imageUrl)) {
        return product;
      }

      const imageUrl = await fetchProductImageFromPage(product.url);
      return imageUrl ? { ...product, imageUrl } : product;
    }),
  );

  return enriched;
}