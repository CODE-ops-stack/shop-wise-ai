<script lang="ts">
  import type { ResolvedPreferences } from '../../../types/preferences';
  import type { ProductResultsPayload } from '../../../types/products';
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

  const bestOverall = $derived(
    results.products.find((p) => p.id === results.bestOverallId) ?? results.products[0],
  );

  const bestValue = $derived(
    results.products.find((p) => p.id === results.bestValueId) ?? results.products[1],
  );

  const gridProducts = $derived(
    results.products.filter(
      (p) => p.id !== results.bestOverallId && p.id !== results.bestValueId,
    ),
  );
</script>

<section class="w-full space-y-4">
  <div class="rounded-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm">
    <p class="text-sm font-semibold text-slate-900">
      {results.totalShown} products found
      {#if isRefining}
        <span class="ml-2 text-xs font-normal text-indigo-600">Updating…</span>
      {/if}
    </p>
    <p class="text-xs text-slate-500">
      Ranked: exact match → best price → Myntra, AJIO, Nykaa Fashion, Amazon, Flipkart
    </p>
  </div>

  {#if bestOverall && bestValue}
    <div class="grid gap-3 sm:grid-cols-2">
      <HighlightCard
        product={bestOverall}
        label="Best Overall Match"
        badgeClass="bg-violet-100 text-violet-700"
      />
      <HighlightCard
        product={bestValue}
        label="Best Value Pick"
        badgeClass="bg-amber-100 text-amber-700"
      />
    </div>
  {/if}

  <QuickFilters
    knownFilters={results.knownFilters}
    disabled={isRefining}
    onrefine={onrefine}
  />

  <div class="grid grid-cols-2 gap-3 sm:grid-cols-2">
    {#each gridProducts as product (product.id)}
      <ProductCard {product} />
    {/each}
  </div>
</section>