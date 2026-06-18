<script lang="ts">
  let x = $state(50);
  let y = $state(50);
  let active = $state(false);

  function onMove(event: MouseEvent) {
    x = (event.clientX / window.innerWidth) * 100;
    y = (event.clientY / window.innerHeight) * 100;
    active = true;
  }

  function onLeave() {
    active = false;
  }
</script>

<svelte:window onmousemove={onMove} onmouseleave={onLeave} />

<div
  class="visual-glow pointer-events-none fixed inset-0 z-[1] transition-opacity duration-500 {active
    ? 'opacity-100'
    : 'opacity-40'}"
  aria-hidden="true"
  style="--gx: {x}%; --gy: {y}%"
></div>