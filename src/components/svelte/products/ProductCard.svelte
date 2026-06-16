<script lang="ts">
  import { getMarketplace } from '../../../../config/marketplaces';
  import type { Product } from '../../../types/products';

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

<article class="rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm transition hover:shadow-md">
  <div class="mb-2 flex h-28 items-center justify-center rounded-xl bg-gradient-to-br from-slate-100 to-slate-50">
    <span class="text-xs font-medium text-slate-400">{marketplace.label}</span>
  </div>

  <div class="mb-1 flex items-center justify-between gap-2">
    <span class="text-[10px] font-semibold uppercase tracking-wide text-indigo-600">
      {marketplace.label}
    </span>
    {#if product.isBestOverall}
      <span class="text-[10px] font-medium text-violet-600">Top match</span>
    {:else if product.isBestValue}
      <span class="text-[10px] font-medium text-amber-600">Value pick</span>
    {/if}
  </div>

  <h3 class="line-clamp-2 min-h-[2.5rem] text-sm font-medium text-slate-900">{product.title}</h3>

  <div class="mt-2 flex items-baseline gap-2">
    <span class="text-base font-bold text-slate-900">{formatPrice(product.price)}</span>
    {#if product.originalPrice}
      <span class="text-xs text-slate-400 line-through">{formatPrice(product.originalPrice)}</span>
    {/if}
  </div>

  {#if product.rating}
    <p class="mt-1 text-xs text-slate-500">★ {product.rating.toFixed(1)}</p>
  {/if}

  <a
    href={product.url}
    target="_blank"
    rel="noopener noreferrer"
    class="mt-3 block rounded-lg bg-slate-900 px-3 py-2 text-center text-xs font-semibold text-white transition hover:bg-slate-800"
  >
    View on {marketplace.label}
  </a>
</article>