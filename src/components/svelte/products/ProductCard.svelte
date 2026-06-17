<script lang="ts">
  import { getMarketplace } from '../../../../config/marketplaces';
  import type { Product } from '../../../types/products';
  import ProductImage from './ProductImage.svelte';

  interface Props {
    product: Product;
  }

  let { product }: Props = $props();

  const marketplace = $derived(getMarketplace(product.marketplace));

  function formatPrice(price: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(price);
  }
</script>

<article
  class="group glass-panel flex flex-col rounded-2xl p-3 transition-all duration-300 hover:border-pink/25 hover:shadow-lg hover:shadow-pink/5"
>
  <ProductImage
    title={product.title}
    imageUrl={product.imageUrl}
    productUrl={product.url}
    marketplaceLabel={marketplace.label}
  />

  <div class="mb-1.5 flex items-center justify-between gap-2">
    <span class="text-[10px] font-bold uppercase tracking-widest text-pink">
      {marketplace.label}
    </span>
    {#if product.isBestOverall}
      <span class="text-[10px] font-semibold text-pink-glow">Top match</span>
    {:else if product.isBestValue}
      <span class="text-[10px] font-semibold text-amber-400">Value pick</span>
    {/if}
  </div>

  <h3 class="line-clamp-2 min-h-[2.5rem] text-sm font-medium leading-snug text-text">
    {product.title}
  </h3>

  <div class="mt-2 flex items-baseline gap-2">
    <span class="text-base font-bold text-text">{formatPrice(product.price)}</span>
    {#if product.originalPrice}
      <span class="text-xs text-text-subtle line-through">{formatPrice(product.originalPrice)}</span>
    {/if}
  </div>

  {#if product.rating}
    <p class="mt-1.5 text-xs text-text-muted">
      <span class="text-amber-400">★</span> {product.rating.toFixed(1)}
    </p>
  {/if}

  <a
    href={product.url}
    target="_blank"
    rel="noopener noreferrer"
    class="mt-auto mt-3 block rounded-xl bg-surface-elevated px-3 py-2.5 text-center text-xs font-semibold text-text ring-1 ring-white/10 transition group-hover:bg-pink group-hover:text-white group-hover:ring-pink/50"
  >
    Open on {marketplace.label}
  </a>
</article>