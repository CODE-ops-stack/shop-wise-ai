<script lang="ts">
  import { discountPercent } from '../../../lib/ui/format';

  interface Props {
    price: number;
    originalPrice?: number;
    size?: 'sm' | 'md';
  }

  let { price, originalPrice, size = 'sm' }: Props = $props();

  const percent = $derived(discountPercent(price, originalPrice));
</script>

{#if percent}
  <span
    class="deal-flash font-bold text-emerald-400 {size === 'md'
      ? 'rounded-lg bg-emerald-500/15 px-2 py-0.5 text-xs ring-1 ring-emerald-500/30'
      : 'rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[10px] ring-1 ring-emerald-500/25'}"
  >
    {percent}% off
  </span>
{/if}