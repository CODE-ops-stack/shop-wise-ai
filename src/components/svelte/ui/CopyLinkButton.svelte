<script lang="ts">
  interface Props {
    url: string;
    label?: string;
  }

  let { url, label = 'Copy link' }: Props = $props();

  let copied = $state(false);
  let resetTimer: ReturnType<typeof setTimeout> | undefined;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      copied = true;
      if (resetTimer) clearTimeout(resetTimer);
      resetTimer = setTimeout(() => {
        copied = false;
      }, 2000);
    } catch {
      // Clipboard unavailable — silent fail.
    }
  }
</script>

<button
  type="button"
  class="rounded-lg bg-ink/70 px-2 py-1 text-[10px] font-semibold text-text backdrop-blur-sm ring-1 ring-white/15 transition hover:bg-pink/30 hover:text-white hover:ring-pink/40"
  onclick={copyLink}
  aria-label={copied ? 'Link copied' : label}
>
  {copied ? 'Copied!' : label}
</button>