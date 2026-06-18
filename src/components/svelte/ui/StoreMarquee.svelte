<script lang="ts">
  const stores = [
    'Myntra',
    'AJIO',
    'Nykaa Fashion',
    'Amazon',
    'Flipkart',
    'Exact product links',
    'AI-ranked picks',
    'ShopWise AI',
  ] as const;

  const track = [...stores, ...stores];
</script>

<div class="store-marquee overflow-hidden rounded-xl ring-1 ring-pink/15">
  <div class="store-marquee-track">
    {#each track as store, i (i)}
      <span class="store-marquee-item">{store}</span>
      <span class="store-marquee-dot" aria-hidden="true">✦</span>
    {/each}
  </div>
</div>