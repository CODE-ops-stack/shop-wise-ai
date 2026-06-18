<script lang="ts">
  interface Props {
    tall?: boolean;
  }

  let { tall = false }: Props = $props();
</script>

<article class="glass-panel flex flex-col rounded-2xl p-3">
  <div
    class="mb-2 animate-pulse rounded-xl bg-white/5 {tall ? 'h-44' : 'h-36'}"
  ></div>
  <div class="mb-2 h-3 w-16 animate-pulse rounded bg-white/5"></div>
  <div class="h-4 w-full animate-pulse rounded bg-white/5"></div>
  <div class="mt-1 h-4 w-[75%] animate-pulse rounded bg-white/5"></div>
  <div class="mt-3 h-5 w-20 animate-pulse rounded bg-white/5"></div>
  <div class="mt-3 h-9 w-full animate-pulse rounded-xl bg-white/5"></div>
</article>