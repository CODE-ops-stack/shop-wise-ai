<script lang="ts">
  import { getMarketplace } from '../../../../config/marketplaces';
  import { analyzeCompare, type CompareRow } from '../../../lib/products/compare-analyzer';
  import type { Product } from '../../../types/products';
  import { formatInr } from '../../../lib/ui/format';

  interface Props {
    products: [Product, Product];
    budgetMax?: number;
    onclose?: () => void;
    onremove?: (productId: string) => void;
  }

  let { products, budgetMax, onclose, onremove }: Props = $props();

  const insight = $derived(analyzeCompare(products[0], products[1], budgetMax));

  function winnerClass(winner: CompareRow['winner'], side: 0 | 1): string {
    if (winner === null || winner === 'tie') return 'text-text-muted';
    return winner === side ? 'font-bold text-pink' : 'text-text-subtle';
  }

  function winnerIcon(winner: CompareRow['winner'], side: 0 | 1): string {
    if (winner === side) return '✓';
    if (winner === 'tie') return '≈';
    return '';
  }

  function openProduct(product: Product) {
    window.open(product.url, '_blank', 'noopener,noreferrer');
  }
</script>

<section class="glass-luxe neon-border scan-line cinema-reveal rounded-2xl p-4 sm:p-5">
  <div class="mb-4 flex items-start justify-between gap-3">
    <div>
      <p class="font-display text-[11px] font-bold uppercase tracking-[0.2em] text-gradient-neon">
        Quick compare
      </p>
      <p class="mt-1 text-xs text-text-muted">Only what helps you decide fast — not a spec sheet.</p>
    </div>
    {#if onclose}
      <button
        type="button"
        class="rounded-lg border border-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-text-subtle transition hover:border-pink/40 hover:text-text"
        onclick={onclose}
      >
        Close
      </button>
    {/if}
  </div>

  <!-- Verdict -->
  <div class="animate-glow-pulse rounded-xl bg-gradient-to-r from-pink/10 via-violet/10 to-cyan/10 px-4 py-3 ring-1 ring-pink/20">
    <p class="text-sm font-semibold leading-snug text-text">{insight.verdict}</p>
    <p class="mt-1.5 text-xs leading-relaxed text-text-muted">{insight.recommendation}</p>
  </div>

  <!-- Product headers -->
  <div class="mt-4 grid grid-cols-2 gap-2">
    {#each products as product, index}
      <div class="rounded-xl bg-surface/60 p-3 ring-1 ring-white/8">
        <div class="flex items-start justify-between gap-1">
          <span class="text-[10px] font-bold uppercase tracking-wider text-pink">
            {getMarketplace(product.marketplace).label}
          </span>
          {#if insight.recommendedIndex === index}
            <span class="rounded-full bg-pink/20 px-1.5 py-0.5 text-[9px] font-bold text-pink">Pick</span>
          {/if}
        </div>
        <p class="mt-1 line-clamp-2 text-xs font-medium leading-snug text-text">
          {index === 0 ? insight.leftShort : insight.rightShort}
        </p>
        <p class="mt-1 text-sm font-bold text-text">{formatInr(product.price)}</p>
        {#if onremove}
          <button
            type="button"
            class="mt-2 text-[10px] font-medium text-text-subtle hover:text-pink"
            onclick={() => onremove(product.id)}
          >
            Remove
          </button>
        {/if}
      </div>
    {/each}
  </div>

  <!-- Meaningful rows only -->
  {#if insight.rows.length > 0}
    <div class="mt-4 space-y-2">
      <p class="text-[10px] font-semibold uppercase tracking-widest text-text-subtle">What matters</p>
      {#each insight.rows as row (row.id)}
        <div class="rounded-xl border border-white/6 bg-white/[0.02] px-3 py-2.5">
          <p class="text-[11px] font-semibold text-text-muted">{row.label}</p>
          <div class="mt-1.5 grid grid-cols-2 gap-2 text-xs">
            <span class={winnerClass(row.winner, 0)}>
              {winnerIcon(row.winner, 0)}
              {row.left}
            </span>
            <span class="{winnerClass(row.winner, 1)} text-right">
              {row.right}
              {winnerIcon(row.winner, 1)}
            </span>
          </div>
          {#if row.hint}
            <p class="mt-1 text-[10px] text-text-subtle">{row.hint}</p>
          {/if}
        </div>
      {/each}
    </div>
  {/if}

  <!-- Unique highlights diff -->
  {#if insight.uniqueToLeft.length > 0 || insight.uniqueToRight.length > 0}
    <div class="mt-4 grid grid-cols-2 gap-2">
      <div>
        <p class="text-[10px] font-semibold uppercase tracking-wider text-text-subtle">Only in left</p>
        <ul class="mt-1 space-y-1">
          {#each insight.uniqueToLeft as item}
            <li class="text-[10px] text-cyan/80">• {item}</li>
          {:else}
            <li class="text-[10px] text-text-subtle">—</li>
          {/each}
        </ul>
      </div>
      <div>
        <p class="text-[10px] font-semibold uppercase tracking-wider text-text-subtle">Only in right</p>
        <ul class="mt-1 space-y-1">
          {#each insight.uniqueToRight as item}
            <li class="text-[10px] text-cyan/80">• {item}</li>
          {:else}
            <li class="text-[10px] text-text-subtle">—</li>
          {/each}
        </ul>
      </div>
    </div>
  {/if}

  <!-- Limitations — honest -->
  <div class="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-3">
    <p class="text-[10px] font-bold uppercase tracking-wider text-amber-300/90">What we can't compare here</p>
    <ul class="mt-2 space-y-1.5">
      {#each insight.limitations as limit}
        <li class="text-[11px] leading-relaxed text-text-muted">• {limit}</li>
      {/each}
    </ul>
  </div>

  <!-- Actions -->
  <div class="mt-4 flex flex-wrap gap-2">
    {#if insight.recommendedIndex != null}
      <button
        type="button"
        class="btn-neon flex-1 rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-white"
        onclick={() => openProduct(products[insight.recommendedIndex!])}
      >
        Open recommended
      </button>
    {/if}
    <button
      type="button"
      class="flex-1 rounded-xl border border-white/10 bg-surface/80 px-4 py-2.5 text-xs font-semibold text-text transition hover:border-pink/40"
      onclick={() => openProduct(products[0])}
    >
      Open {getMarketplace(products[0].marketplace).label}
    </button>
    <button
      type="button"
      class="flex-1 rounded-xl border border-white/10 bg-surface/80 px-4 py-2.5 text-xs font-semibold text-text transition hover:border-pink/40"
      onclick={() => openProduct(products[1])}
    >
      Open {getMarketplace(products[1].marketplace).label}
    </button>
  </div>
</section>