<script lang="ts">
  import type { ResolvedPreferences } from '../../../types/preferences';
  import type { Product, ProductResultsPayload } from '../../../types/products';
  import type { SearchErrorResponse, SearchResponse } from '../../../types/api';
  import type { QuickFilterId } from '../../../lib/products/visible-filters';
  import HighlightCard from './HighlightCard.svelte';
  import ProductCard from './ProductCard.svelte';
  import QuickFilters from './QuickFilters.svelte';

  interface Props {
    results: ProductResultsPayload;
    preferences: ResolvedPreferences;
    isRefining?: boolean;
    onrefine?: (selections: Partial<Record<QuickFilterId, string>>) => void;
  }

  let { results, preferences, isRefining = false, onrefine }: Props = $props();

  let gridProducts = $state<Product[]>([]);
  let cursor = $state<string | null>(null);
  let hasMore = $state(false);
  let totalShown = $state(0);
  let isLoadingMore = $state(false);
  let loadError = $state<string | null>(null);
  let sentinel = $state<HTMLElement | null>(null);

  const bestOverall = $derived(
    results.products.find((p) => p.id === results.bestOverallId) ?? results.products[0],
  );

  const bestValue = $derived(
    results.products.find((p) => p.id === results.bestValueId) ?? results.products[1],
  );

  function initFromResults(payload: ProductResultsPayload) {
    gridProducts = payload.products.filter(
      (p) => p.id !== payload.bestOverallId && p.id !== payload.bestValueId,
    );
    cursor = payload.cursor;
    hasMore = payload.hasMore;
    totalShown = payload.totalShown;
    loadError = null;
    isLoadingMore = false;
  }

  $effect(() => {
    initFromResults(results);
  });

  async function loadMore() {
    if (!hasMore || isLoadingMore || isRefining || !cursor) return;

    isLoadingMore = true;
    loadError = null;

    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferences, cursor }),
      });

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => ({}))) as SearchErrorResponse;
        loadError = errorBody.error ?? 'Could not load more products.';
        hasMore = false;
        return;
      }

      const data = (await response.json()) as SearchResponse;
      const batch = data.results;

      gridProducts = [...gridProducts, ...batch.products];
      cursor = batch.cursor;
      hasMore = batch.hasMore;
      totalShown = batch.totalShown;
    } catch {
      loadError = 'Failed to load more products. Scroll to retry.';
    } finally {
      isLoadingMore = false;
    }
  }

  $effect(() => {
    const node = sentinel;
    if (!node || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isLoadingMore && !isRefining) {
          void loadMore();
        }
      },
      { root: null, rootMargin: '240px', threshold: 0 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  });
</script>

<section class="w-full space-y-4">
  <div class="glass-panel-elevated neon-border scan-line rounded-2xl px-5 py-4">
    <div class="flex items-baseline justify-between gap-2">
      <p class="font-display text-base font-bold text-text">
        <span class="text-gradient-neon">{totalShown}</span>
        <span class="text-text-muted"> products found</span>
      </p>
      {#if isRefining}
        <span class="text-xs font-medium text-pink animate-pulse">Updating…</span>
      {/if}
    </div>
    <p class="mt-1 text-xs text-text-subtle">
      Ranked: exact match → best price → Myntra, AJIO, Nykaa Fashion, Amazon, Flipkart
    </p>
  </div>

  {#if bestOverall && bestValue && results.bestOverallId}
    <div class="grid gap-4 sm:grid-cols-2">
      <HighlightCard product={bestOverall} label="Best Overall Match" variant="overall" />
      <HighlightCard product={bestValue} label="Best Value Pick" variant="value" />
    </div>
  {/if}

  <QuickFilters
    knownFilters={results.knownFilters}
    disabled={isRefining || isLoadingMore}
    onrefine={onrefine}
  />

  <div class="grid grid-cols-2 gap-3 sm:gap-4">
    {#each gridProducts as product (product.id)}
      <ProductCard {product} />
    {/each}
  </div>

  {#if hasMore || isLoadingMore}
    <div
      bind:this={sentinel}
      class="flex items-center justify-center rounded-2xl border border-dashed border-pink/30 bg-gradient-to-b from-pink/5 to-violet/5 py-8 neon-glow"
    >
      {#if isLoadingMore}
        <div class="flex items-center gap-3">
          <span class="relative flex h-2.5 w-2.5">
            <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-pink opacity-50"></span>
            <span class="relative inline-flex h-2.5 w-2.5 rounded-full bg-pink"></span>
          </span>
          <span class="text-sm text-text-muted">Loading more products…</span>
        </div>
      {:else}
        <span class="text-xs text-text-subtle">Scroll for more</span>
      {/if}
    </div>
  {/if}

  {#if loadError}
    <p class="text-center text-xs text-pink">{loadError}</p>
  {/if}

  {#if !hasMore && totalShown > 0 && !isLoadingMore}
    <p class="text-center text-xs text-text-subtle">You've seen all matching products.</p>
  {/if}
</section>