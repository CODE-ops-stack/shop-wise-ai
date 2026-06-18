<script lang="ts">
  interface Props {
    selected?: boolean;
    disabled?: boolean;
    onclick?: () => void;
  }

  let { selected = false, disabled = false, onclick }: Props = $props();
</script>

<button
  type="button"
  class="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold transition
    {selected
    ? 'chip-neon-active bg-pink/25 text-pink ring-1 ring-pink/50 animate-bounce-in'
    : 'bg-ink/70 text-text-muted ring-1 ring-white/15 hover:bg-violet/20 hover:text-text'}
    {disabled ? 'cursor-not-allowed opacity-40' : ''}"
  {disabled}
  {onclick}
  aria-label={selected ? 'Remove from compare' : 'Add to compare'}
  aria-pressed={selected}
>
  <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
    <path stroke-linecap="round" stroke-linejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
  {selected ? 'Comparing' : 'Compare'}
</button>