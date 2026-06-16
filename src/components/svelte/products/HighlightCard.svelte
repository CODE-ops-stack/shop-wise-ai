<script lang="ts">
  import { getMarketplace } from '../../../../config/marketplaces';
  import type { Product } from '../../../types/products';

  interface Props {
    product: Product;
    label: string;
    badgeClass: string;
  }

  let { product, label, badgeClass }: Props = $props();

  const marketplace = $derived(getMarketplace(product.marketplace));

  function formatPrice(price: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(price);
  }
</script>

<article class="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
  <div class="mb-3 flex items-center justify-between gap-2">
    <span class="rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide {badgeClass}">
      {label}
    </span>
    <span class="text-xs font-medium text-slate-500">{marketplace.label}</span>
  </div>

  <h3 class="line-clamp-2 text-sm font-semibold text-slate-900">{product.title}</h3>

  <div class="mt-2 flex items-baseline gap-2">
    <span class="text-lg font-bold text-slate-900">{formatPrice(product.price)}</span>
    {#if product.originalPrice}
      <span class="text-xs text-slate-400 line-through">{formatPrice(product.originalPrice)}</span>
    {/if}
  </div>

  {#if product.rating}
    <p class="mt-1 text-xs text-slate-500">
      ★ {product.rating.toFixed(1)}
      {#if product.reviewCount}
        · {product.reviewCount.toLocaleString('en-IN')} reviews
      {/if}
    </p>
  {/if}

  <div class="mt-3 flex flex-wrap gap-1.5">
    {#each product.highlights.slice(0, 2) as highlight}
      <span class="rounded-full bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-600 ring-1 ring-slate-200">
        {highlight}
      </span>
    {/each}
  </div>

  <a
    href={product.url}
    target="_blank"
    rel="noopener noreferrer"
    class="mt-3 block rounded-lg bg-slate-900 px-3 py-2 text-center text-xs font-semibold text-white transition hover:bg-slate-800"
  >
    View on {marketplace.label}
  </a>
</article>