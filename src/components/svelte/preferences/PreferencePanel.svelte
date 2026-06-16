<script lang="ts">
  import type {
    BudgetRange,
    FilledSlots,
    PreferencePanel,
    SlotValue,
  } from '../../../types/preferences';

  interface Props {
    panel: PreferencePanel;
    disabled?: boolean;
    onsubmit?: (selections: FilledSlots) => void;
    onskip?: () => void;
  }

  let { panel, disabled = false, onsubmit, onskip }: Props = $props();

  let selections = $state<FilledSlots>({});

  function isSelected(fieldId: string, value: string): boolean {
    const current = selections[fieldId];
    if (Array.isArray(current)) return current.includes(value);
    return current === value;
  }

  function toggleCheckbox(fieldId: string, value: string, multi = false) {
    if (disabled) return;

    const current = selections[fieldId];

    if (multi) {
      const list = Array.isArray(current) ? [...current] : [];
      const index = list.indexOf(value);
      if (index >= 0) list.splice(index, 1);
      else list.push(value);
      selections[fieldId] = list;
      return;
    }

    selections[fieldId] = isSelected(fieldId, value) ? undefined : value;
  }

  function setBudget(range: BudgetRange) {
    if (disabled) return;
    selections.budget = range;
  }

  function budgetIsActive(preset: BudgetRange): boolean {
    const current = selections.budget;
    if (!current || typeof current !== 'object' || Array.isArray(current)) return false;
    return current.min === preset.min && current.max === preset.max;
  }

  function getOptions(fieldId: string) {
    const field = panel.fields.find((f) => f.id === fieldId);
    if (!field) return [];

    const raw = field.config.options ?? [];
    return raw.map((option) =>
      typeof option === 'string' ? { value: option, label: option } : option,
    );
  }

  function handleSubmit() {
    onsubmit?.(selections);
  }
</script>

<div class="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
  <div class="mb-4">
    <h3 class="text-sm font-semibold text-slate-900">{panel.title}</h3>
    {#if panel.subtitle}
      <p class="mt-1 text-xs text-slate-500">{panel.subtitle}</p>
    {/if}
  </div>

  <div class="space-y-4">
    {#each panel.fields as field (field.id)}
      <div>
        <div class="mb-2 flex items-center gap-2">
          <span class="text-xs font-medium uppercase tracking-wide text-slate-600">
            {field.config.label}
          </span>
          {#if field.reason === 'required'}
            <span class="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
              Needed
            </span>
          {/if}
        </div>

        {#if field.config.type === 'range' && field.config.presets}
          <div class="flex flex-wrap gap-2">
            {#each field.config.presets as preset (preset.label)}
              <button
                type="button"
                class="rounded-full border px-3 py-1.5 text-xs font-medium transition
                  {budgetIsActive(preset)
                  ? 'border-indigo-600 bg-indigo-600 text-white'
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-indigo-300'}"
                {disabled}
                onclick={() => setBudget({ min: preset.min, max: preset.max })}
              >
                {preset.label}
              </button>
            {/each}
          </div>
        {:else}
          <div class="flex flex-wrap gap-2">
            {#each getOptions(field.id) as option (option.value)}
              <button
                type="button"
                class="rounded-full border px-3 py-1.5 text-xs font-medium transition
                  {isSelected(field.id, option.value)
                  ? 'border-indigo-600 bg-indigo-600 text-white'
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-indigo-300'}"
                {disabled}
                onclick={() => toggleCheckbox(field.id, option.value, field.config.multi)}
              >
                {option.label}
              </button>
            {/each}
          </div>
        {/if}
      </div>
    {/each}
  </div>

  <div class="mt-5 flex items-center gap-2">
    <button
      type="button"
      class="flex-1 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
      {disabled}
      onclick={handleSubmit}
    >
      Find products
    </button>
    {#if onskip}
      <button
        type="button"
        class="rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 transition hover:text-slate-800 disabled:opacity-50"
        {disabled}
        onclick={onskip}
      >
        Skip
      </button>
    {/if}
  </div>
</div>