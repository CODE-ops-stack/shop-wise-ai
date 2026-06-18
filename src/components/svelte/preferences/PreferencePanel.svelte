<script lang="ts">
  import type {
    BudgetRange,
    FilledSlots,
    PreferencePanel,
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

  function chipClass(active: boolean): string {
    return active
      ? 'chip-neon-active border'
      : 'border-white/10 bg-surface/80 text-text-muted hover:border-pink/40 hover:bg-surface-hover hover:text-text hover:shadow-sm hover:shadow-pink/10';
  }

  function handleSubmit() {
    onsubmit?.(selections);
  }
</script>

<div class="glass-panel-elevated neon-border scan-line rounded-2xl p-5">
  <div class="mb-5 border-b border-pink/10 pb-4">
    <h3 class="font-display text-base font-semibold text-text">{panel.title}</h3>
    {#if panel.subtitle}
      <p class="mt-1.5 text-xs leading-relaxed text-text-muted">{panel.subtitle}</p>
    {/if}
  </div>

  <div class="space-y-5">
    {#each panel.fields as field (field.id)}
      <div>
        <div class="mb-2.5 flex items-center gap-2">
          <span class="text-[11px] font-semibold uppercase tracking-widest text-text-subtle">
            {field.config.label}
          </span>
          {#if field.reason === 'required'}
            <span
              class="rounded-full bg-pink/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-pink"
            >
              Needed
            </span>
          {/if}
        </div>

        {#if field.config.type === 'range' && field.config.presets}
          <div class="flex flex-wrap gap-2">
            {#each field.config.presets as preset (preset.label)}
              <button
                type="button"
                class="rounded-full border px-3.5 py-2 text-xs font-medium transition-all duration-200 {chipClass(
                  budgetIsActive(preset),
                )}"
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
                class="rounded-full border px-3.5 py-2 text-xs font-medium transition-all duration-200 {chipClass(
                  isSelected(field.id, option.value),
                )}"
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

  <div class="mt-6 flex items-center gap-3 border-t border-white/6 pt-5">
    <button
      type="button"
      class="btn-neon flex-1 rounded-xl px-4 py-3 text-sm font-bold uppercase tracking-wide text-white disabled:cursor-not-allowed disabled:opacity-40"
      {disabled}
      onclick={handleSubmit}
    >
      Find products
    </button>
    {#if onskip}
      <button
        type="button"
        class="rounded-xl px-4 py-3 text-sm font-medium text-text-subtle transition hover:text-text disabled:opacity-40"
        {disabled}
        onclick={onskip}
      >
        Skip
      </button>
    {/if}
  </div>
</div>