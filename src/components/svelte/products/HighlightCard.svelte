<script lang="ts">
  import { getMarketplace } from '../../../../config/marketplaces';
  import type { Product } from '../../../types/products';
  import { isWithinBudget } from '../../../lib/ui/budget';
  import { formatInr, savingsInr } from '../../../lib/ui/format';
  import CopyLinkButton from '../ui/CopyLinkButton.svelte';
  import DiscountBadge from '../ui/DiscountBadge.svelte';
  import CompareToggle from './CompareToggle.svelte';
  import ProductImage from './ProductImage.svelte';

  interface Props {
    product: Product;
    label: string;
    variant: 'overall' | 'value';
    budgetMax?: number;
    compareSelected?: boolean;
    compareDisabled?: boolean;
    oncomparetoggle?: () => void;
  }

  let {
    product,
    label,
    variant,
    budgetMax,
    compareSelected = false,
    compareDisabled = false,
    oncomparetoggle,
  }: Props = $props();

  const marketplace = $derived(getMarketplace(product.marketplace));

  const badgeClass = $derived(
    variant === 'overall'
      ? 'bg-gradient-to-r from-pink/30 to-violet/20 text-pink-neon ring-pink/50 neon-glow'
      : 'bg-gradient-to-r from-amber-500/20 to-orange-500/15 text-amber-300 ring-amber-500/40',
  );

  const borderGlow = $derived(
    variant === 'overall' ? 'ring-pink/30 neon-glow-strong' : 'ring-amber-500/20',
  );

  const saved = $derived(savingsInr(product.price, product.originalPrice));
  const withinBudget = $derived(isWithinBudget(product.price, budgetMax));
</script>

<article
  class="fashion-card glass-panel-elevated neon-border scan-line rounded-2xl p-4 ring-1 {borderGlow} {compareSelected
    ? 'ring-2 ring-pink/50 animate-glow-pulse'
    : ''}"
>
  <div class="mb-3 flex items-center justify-between gap-2">
    <span
      class="rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest ring-1 {badgeClass}"
    >
      {label}
    </span>
    <span class="text-xs font-medium text-text-subtle">{marketplace.label}</span>
  </div>

  <div class="relative group/image">
    <ProductImage
      title={product.title}
      imageUrl={product.imageUrl}
      productUrl={product.url}
      marketplaceLabel={marketplace.label}
      tall
    />
    <div class="absolute left-2 top-2 flex flex-col gap-1">
      {#if product.originalPrice}
        <DiscountBadge price={product.price} originalPrice={product.originalPrice} size="md" />
      {/if}
      {#if withinBudget}
        <span
          class="rounded-lg bg-cyan/20 px-2 py-0.5 text-[10px] font-bold text-cyan ring-1 ring-cyan/30"
        >
          In budget
        </span>
      {/if}
    </div>
    <div class="absolute right-2 top-2">
      <CopyLinkButton url={product.url} />
    </div>
  </div>

  <h3 class="mt-3 line-clamp-2 text-sm font-semibold leading-snug text-text">{product.title}</h3>

  <div class="mt-2 flex flex-wrap items-baseline gap-2">
    <span class="text-xl font-bold text-text">{formatInr(product.price)}</span>
    {#if product.originalPrice}
      <span class="text-sm text-text-subtle line-through">{formatInr(product.originalPrice)}</span>
    {/if}
    {#if saved}
      <span class="text-xs font-medium text-emerald-400">Save {formatInr(saved)}</span>
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

  {#if oncomparetoggle}
    <div class="mt-3">
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
    class="btn-neon mt-4 flex items-center justify-center gap-1.5 rounded-xl px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-white"
  >
    Open exact product on {marketplace.label}
    <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  </a>
</article>