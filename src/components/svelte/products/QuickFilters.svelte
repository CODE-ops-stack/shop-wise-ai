<script lang="ts">
  import {
    getFilterOptions,
    getVisibleQuickFilters,
    type QuickFilterId,
  } from '../../../lib/products/visible-filters';
  import type { KnownFilters } from '../../../types/products';

  interface Props {
    knownFilters: KnownFilters;
    disabled?: boolean;
    onrefine?: (selections: Partial<Record<QuickFilterId, string>>) => void;
  }

  let { knownFilters, disabled = false, onrefine }: Props = $props();

  const visibleFilters = $derived(getVisibleQuickFilters(knownFilters));
  let activeSelections = $state<Partial<Record<QuickFilterId, string>>>({});

  function toggle(filterId: QuickFilterId, value: string) {
    if (disabled) return;

    activeSelections[filterId] = activeSelections[filterId] === value ? undefined : value;
    onrefine?.(activeSelections);
  }

  function isActive(filterId: QuickFilterId, value: string): boolean {
    return activeSelections[filterId] === value;
  }

  function chipClass(active: boolean): string {
    return active
      ? 'border-pink bg-pink/20 text-pink ring-1 ring-pink/40'
      : 'border-white/10 bg-surface text-text-muted hover:border-pink/30 hover:text-text';
  }
</script>

{#if visibleFilters.length > 0}
  <section class="glass-panel rounded-2xl p-4">
    <div class="flex items-center gap-2">
      <svg class="h-4 w-4 text-pink" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
      </svg>
      <h3 class="text-xs font-bold uppercase tracking-widest text-text">Quick filters</h3>
    </div>
    <p class="mt-1.5 text-xs text-text-subtle">
      Refine results — filters you already set in chat are hidden.
    </p>

    <div class="mt-4 space-y-4">
      {#each visibleFilters as filter (filter.id)}
        <div>
          <p class="mb-2 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
            {filter.label}
          </p>
          <div class="flex flex-wrap gap-2">
            {#each getFilterOptions(filter.id) as option (option.value)}
              <button
                type="button"
                class="rounded-full border px-3.5 py-2 text-xs font-medium transition-all duration-200 {chipClass(
                  isActive(filter.id, option.value),
                )} {disabled ? 'cursor-not-allowed opacity-40' : ''}"
                {disabled}
                onclick={() => toggle(filter.id, option.value)}
              >
                {option.label}
              </button>
            {/each}
          </div>
        </div>
      {/each}
    </div>
  </section>
{/if}