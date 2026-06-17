import {
  getMarketplaceByDomain,
  isVerifiedMarketplaceUrl,
  type MarketplaceId,
} from '../../../config/marketplaces';

const SEARCH_PATH_PATTERN = /\/search|\/s\?|[?&](q|k|text)=/i;

export function normalizeProductUrl(url: string): string {
  try {
    const parsed = new URL(url.trim());
    if (!parsed.protocol.startsWith('http')) {
      parsed.protocol = 'https:';
    }
    parsed.hash = '';
    return parsed.toString();
  } catch {
    return url.trim();
  }
}

export function isProductPageUrl(url: string, marketplaceId?: MarketplaceId): boolean {
  if (!isVerifiedMarketplaceUrl(url)) return false;

  try {
    const parsed = new URL(url);
    const marketplace =
      marketplaceId ?? getMarketplaceByDomain(parsed.hostname.replace(/^www\./, ''))?.id;
    if (!marketplace) return false;

    const path = parsed.pathname.toLowerCase();
    const href = parsed.toString().toLowerCase();

    if (SEARCH_PATH_PATTERN.test(href) && !path.includes('/dp/') && !path.includes('/buy')) {
      if (path === '/s' || path.startsWith('/search')) return false;
    }

    switch (marketplace) {
      case 'myntra':
        return path.endsWith('/buy') || /\d{5,}/.test(path);
      case 'amazon':
        return (
          path.includes('/dp/') ||
          path.includes('/gp/product/') ||
          path.includes('/gp/aw/d/')
        );
      case 'flipkart':
        return path.includes('/p/') && !path.startsWith('/search');
      case 'ajio':
        return path.includes('/p/') || path.includes('/product/');
      case 'nykaa_fashion':
        return (
          path.includes('/p/') ||
          path.includes('/products/') ||
          /\d{6,}/.test(path)
        );
      default:
        return false;
    }
  } catch {
    return false;
  }
}

export function isValidImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}