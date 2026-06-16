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
</script>

{#if visibleFilters.length > 0}
  <section class="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
    <h3 class="text-xs font-semibold uppercase tracking-wide text-slate-500">Quick filters</h3>
    <p class="mt-1 text-xs text-slate-400">
      Refine results — filters you already set in chat are hidden.
    </p>

    <div class="mt-3 space-y-3">
      {#each visibleFilters as filter (filter.id)}
        <div>
          <p class="mb-2 text-xs font-medium text-slate-600">{filter.label}</p>
          <div class="flex flex-wrap gap-2">
            {#each getFilterOptions(filter.id) as option (option.value)}
              <button
                type="button"
                class="rounded-full border px-3 py-1.5 text-xs font-medium transition
                  {isActive(filter.id, option.value)
                  ? 'border-indigo-600 bg-indigo-600 text-white'
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-indigo-300'}
                  {disabled ? 'cursor-not-allowed opacity-50' : ''}"
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