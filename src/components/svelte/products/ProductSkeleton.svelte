<script lang="ts">
  interface Props {
    tall?: boolean;
  }

  let { tall = false }: Props = $props();
</script>

<article class="glass-luxe flex flex-col rounded-2xl p-3">
  <div
    class="skeleton-shimmer mb-2 rounded-xl {tall ? 'h-44' : 'h-36'}"
  ></div>
  <div class="skeleton-shimmer mb-2 h-3 w-16 rounded"></div>
  <div class="skeleton-shimmer h-4 w-full rounded"></div>
  <div class="skeleton-shimmer mt-1 h-4 w-[75%] rounded"></div>
  <div class="skeleton-shimmer mt-3 h-5 w-20 rounded"></div>
  <div class="skeleton-shimmer mt-3 h-9 w-full rounded-xl"></div>
</article>