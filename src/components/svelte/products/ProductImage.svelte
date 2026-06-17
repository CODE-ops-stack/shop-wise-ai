<script lang="ts">
  interface Props {
    title: string;
    imageUrl?: string;
    productUrl: string;
    marketplaceLabel: string;
    tall?: boolean;
  }

  let { title, imageUrl, productUrl, marketplaceLabel, tall = false }: Props = $props();

  let attempt = $state(0);
  let failed = $state(false);

  const proxySrc = `/api/product-image?url=${encodeURIComponent(productUrl)}`;

  const src = $derived(
    failed ? '' : attempt === 0 && imageUrl ? imageUrl : proxySrc,
  );

  function handleError() {
    if (attempt === 0 && imageUrl) {
      attempt = 1;
      return;
    }
    failed = true;
  }
</script>

<div
  class="mb-2 flex items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-surface-elevated to-ink-soft ring-1 ring-white/6 {tall
    ? 'h-44'
    : 'h-36'}"
>
  {#if !failed}
    <img
      src={src}
      alt={title}
      class="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
      loading="lazy"
      referrerpolicy="no-referrer"
      onerror={handleError}
    />
  {:else}
    <div class="flex flex-col items-center gap-2 px-4 text-center">
      <div class="flex h-10 w-10 items-center justify-center rounded-full bg-pink/10 ring-1 ring-pink/20">
        <svg class="h-5 w-5 text-pink/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
      <span class="text-[10px] font-medium uppercase tracking-wider text-text-subtle">{marketplaceLabel}</span>
    </div>
  {/if}
</div>