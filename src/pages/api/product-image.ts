import type { APIRoute } from 'astro';
import { fetchProductImageFromPage } from '../../lib/products/image-resolver';
import { isProductPageUrl } from '../../lib/products/product-url';

export const GET: APIRoute = async ({ url }) => {
  const productUrl = url.searchParams.get('url');

  if (!productUrl || !isProductPageUrl(productUrl)) {
    return new Response('Invalid product URL', { status: 400 });
  }

  const imageUrl = await fetchProductImageFromPage(productUrl);
  if (!imageUrl) {
    return new Response('Image not found', { status: 404 });
  }

  return Response.redirect(imageUrl, 302);
};