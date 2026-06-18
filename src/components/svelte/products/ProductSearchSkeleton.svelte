<script lang="ts">
  import ProductSkeleton from './ProductSkeleton.svelte';
</script>

<section class="w-full space-y-4 animate-fade-in">
  <div class="glass-panel rounded-2xl px-5 py-4">
    <div class="h-5 w-40 animate-pulse rounded bg-white/5"></div>
    <div class="mt-2 h-3 w-64 animate-pulse rounded bg-white/5"></div>
  </div>

  <div class="grid gap-4 sm:grid-cols-2">
    <ProductSkeleton tall />
    <ProductSkeleton tall />
  </div>

  <div class="grid grid-cols-2 gap-3 sm:gap-4">
    {#each Array(4) as _}
      <ProductSkeleton />
    {/each}
  </div>
</section>