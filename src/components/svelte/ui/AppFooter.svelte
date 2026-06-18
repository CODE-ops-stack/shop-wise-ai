<script lang="ts">
  import { SITE } from '../../../../config/site';
  import { VERIFIED_MARKETPLACES } from '../../../../config/marketplaces';

  const stores = VERIFIED_MARKETPLACES.filter((m) =>
    ['myntra', 'ajio', 'nykaa_fashion', 'amazon', 'flipkart'].includes(m.id),
  );
</script>

<footer class="mt-6 pb-2 text-center">
  <div class="glass-panel mx-auto max-w-lg rounded-2xl px-4 py-3">
    <p class="text-[11px] leading-relaxed text-text-muted">
      Links open <span class="text-cyan/90">directly on store product pages</span> — not search results.
    </p>
    <div class="mt-2.5 flex flex-wrap items-center justify-center gap-2">
      {#each stores as store}
        <span
          class="rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-text-subtle ring-1 ring-white/8"
        >
          {store.label}
        </span>
      {/each}
    </div>
  </div>
  <p class="mt-3 text-[10px] text-text-subtle">
    AI can make mistakes — verify price &amp; details before buying · © {new Date().getFullYear()}
    {SITE.name}
  </p>
</footer>