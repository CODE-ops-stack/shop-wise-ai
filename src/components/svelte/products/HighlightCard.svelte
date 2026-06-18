<script lang="ts">
  import { getMarketplace } from '../../../../config/marketplaces';
  import type { Product } from '../../../types/products';
  import ProductImage from './ProductImage.svelte';

  interface Props {
    product: Product;
    label: string;
    variant: 'overall' | 'value';
  }

  let { product, label, variant }: Props = $props();

  const marketplace = $derived(getMarketplace(product.marketplace));

  const badgeClass = $derived(
    variant === 'overall'
      ? 'bg-gradient-to-r from-pink/30 to-violet/20 text-pink-neon ring-pink/50 neon-glow'
      : 'bg-gradient-to-r from-amber-500/20 to-orange-500/15 text-amber-300 ring-amber-500/40',
  );

  const borderGlow = $derived(
    variant === 'overall' ? 'ring-pink/30 neon-glow-strong' : 'ring-amber-500/20',
  );

  function formatPrice(price: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(price);
  }
</script>

<article
  class="glass-panel-elevated neon-border card-hover-lift scan-line rounded-2xl p-4 ring-1 {borderGlow}"
>
  <div class="mb-3 flex items-center justify-between gap-2">
    <span
      class="rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest ring-1 {badgeClass}"
    >
      {label}
    </span>
    <span class="text-xs font-medium text-text-subtle">{marketplace.label}</span>
  </div>

  <ProductImage
    title={product.title}
    imageUrl={product.imageUrl}
    productUrl={product.url}
    marketplaceLabel={marketplace.label}
    tall
  />

  <h3 class="mt-3 line-clamp-2 text-sm font-semibold leading-snug text-text">{product.title}</h3>

  <div class="mt-2 flex items-baseline gap-2">
    <span class="text-xl font-bold text-text">{formatPrice(product.price)}</span>
    {#if product.originalPrice}
      <span class="text-sm text-text-subtle line-through">{formatPrice(product.originalPrice)}</span>
    {/if}
  </div>

  {#if product.rating}
    <p class="mt-1.5 text-xs text-text-muted">
      <span class="text-amber-400">★</span> {product.rating.toFixed(1)}
      {#if product.reviewCount}
        <span class="text-text-subtle"> · {product.reviewCount.toLocaleString('en-IN')} reviews</span>
      {/if}
    </p>
  {/if}

  <div class="mt-3 flex flex-wrap gap-1.5">
    {#each product.highlights.slice(0, 2) as highlight}
      <span
        class="rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-medium text-text-muted ring-1 ring-white/8"
      >
        {highlight}
      </span>
    {/each}
  </div>

  <a
    href={product.url}
    target="_blank"
    rel="noopener noreferrer"
    class="btn-neon mt-4 block rounded-xl px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-white"
  >
    Open exact product on {marketplace.label}
  </a>
</article>