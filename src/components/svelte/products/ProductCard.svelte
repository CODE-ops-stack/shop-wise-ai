<script lang="ts">
  import { getMarketplace } from '../../../../config/marketplaces';
  import type { Product } from '../../../types/products';
  import { isWithinBudget } from '../../../lib/ui/budget';
  import { formatInr } from '../../../lib/ui/format';
  import CopyLinkButton from '../ui/CopyLinkButton.svelte';
  import DiscountBadge from '../ui/DiscountBadge.svelte';
  import CompareToggle from './CompareToggle.svelte';
  import ProductImage from './ProductImage.svelte';

  interface Props {
    product: Product;
    budgetMax?: number;
    compareSelected?: boolean;
    compareDisabled?: boolean;
    oncomparetoggle?: () => void;
  }

  let {
    product,
    budgetMax,
    compareSelected = false,
    compareDisabled = false,
    oncomparetoggle,
  }: Props = $props();

  const marketplace = $derived(getMarketplace(product.marketplace));
  const withinBudget = $derived(isWithinBudget(product.price, budgetMax));
</script>

<article
  class="group fashion-card tilt-card glass-luxe neon-border flex flex-col rounded-2xl p-3 {compareSelected
    ? 'ring-2 ring-pink/50 animate-glow-pulse'
    : ''}"
>
  <div class="relative">
    <ProductImage
      title={product.title}
      imageUrl={product.imageUrl}
      productUrl={product.url}
      marketplaceLabel={marketplace.label}
    />
    <div class="absolute left-2 top-2 flex flex-col gap-1">
      {#if product.originalPrice}
        <DiscountBadge price={product.price} originalPrice={product.originalPrice} />
      {/if}
      {#if withinBudget}
        <span
          class="rounded-md bg-cyan/20 px-1.5 py-0.5 text-[10px] font-bold text-cyan ring-1 ring-cyan/30"
        >
          In budget
        </span>
      {/if}
    </div>
    <div class="absolute right-2 top-2 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
      <CopyLinkButton url={product.url} />
    </div>
  </div>

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

  <div class="mt-2 flex flex-wrap items-baseline gap-2">
    <span class="text-base font-bold text-text">{formatInr(product.price)}</span>
    {#if product.originalPrice}
      <span class="text-xs text-text-subtle line-through">{formatInr(product.originalPrice)}</span>
    {/if}
  </div>

  {#if product.rating}
    <p class="mt-1.5 text-xs text-text-muted">
      <span class="text-amber-400">★</span> {product.rating.toFixed(1)}
    </p>
  {/if}

  {#if product.highlights[0]}
    <p class="mt-1.5 line-clamp-1 text-[10px] text-cyan/70">{product.highlights[0]}</p>
  {/if}

  {#if oncomparetoggle}
    <div class="mt-2">
      <CompareToggle
        selected={compareSelected}
        disabled={compareDisabled}
        onclick={oncomparetoggle}
      />
    </div>
  {/if}

  <a
    href={product.url}
    target="_blank"
    rel="noopener noreferrer"
    class="mt-auto mt-3 flex items-center justify-center gap-1.5 rounded-xl bg-surface-elevated px-3 py-2.5 text-center text-xs font-semibold text-text ring-1 ring-white/10 transition group-hover:bg-gradient-to-r group-hover:from-pink group-hover:to-violet group-hover:text-white group-hover:ring-pink/50 group-hover:shadow-lg group-hover:shadow-pink/20"
  >
    Open on {marketplace.label}
    <svg class="h-3 w-3 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  </a>
</article>