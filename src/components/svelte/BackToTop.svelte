<script lang="ts">
  /**
   * BackToTop.svelte · 回到顶部
   * --------------------------------------------------------------------------
   * 滚动超过一屏后淡入。按钮外圈是一圈 conic 渐变的进度环，
   * 用 stroke-dashoffset 表示当前阅读位置。
   */
  import { onMount } from 'svelte';
  import Icon from './Icon.svelte';

  let progress = $state(0);
  let shown = $state(false);

  const R = 20;
  const CIRC = 2 * Math.PI * R;

  onMount(() => {
    let frame = 0;

    const measure = () => {
      frame = 0;
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      progress = max > 8 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      shown = window.scrollY > window.innerHeight * 0.8;
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  });

  function toTop() {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  }
</script>

<button
  type="button"
  class="back-to-top"
  class:shown
  onclick={toTop}
  aria-label="回到顶部"
  tabindex={shown ? 0 : -1}
>
  <svg class="ring" viewBox="0 0 48 48" aria-hidden="true">
    <circle class="track" cx="24" cy="24" r={R} />
    <circle
      class="value"
      cx="24"
      cy="24"
      r={R}
      stroke-dasharray={CIRC}
      stroke-dashoffset={CIRC * (1 - progress)}
    />
  </svg>
  <Icon name="arrow-up" size={17} stroke={2} />
</button>

<style>
  .back-to-top {
    position: fixed;
    right: 20px;
    bottom: 22px;
    z-index: 90;
    display: grid;
    place-items: center;
    width: 46px;
    height: 46px;
    border-radius: 50%;
    background: var(--card);
    border: 1px solid var(--line);
    box-shadow: var(--shadow-rest);
    color: var(--text-2);
    opacity: 0;
    transform: translateY(12px) scale(0.9);
    pointer-events: none;
    transition: opacity var(--t-move), transform var(--t-move),
      color var(--t-color), box-shadow var(--t-move), border-color var(--t-color);
  }

  .back-to-top.shown {
    opacity: 1;
    transform: none;
    pointer-events: auto;
  }

  .back-to-top:hover {
    color: var(--clay-d);
    border-color: color-mix(in srgb, var(--clay-d) 30%, var(--line));
    box-shadow: var(--shadow-hover);
    transform: translateY(-3px);
  }

  .back-to-top :global(svg:not(.ring)) {
    position: relative;
    z-index: 1;
  }

  .ring {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    transform: rotate(-90deg);
  }

  .track {
    fill: none;
    stroke: var(--line);
    stroke-width: 1.5;
  }

  .value {
    fill: none;
    stroke: var(--clay);
    stroke-width: 2;
    stroke-linecap: round;
    transition: stroke-dashoffset 0.1s linear;
  }

  @media (max-width: 768px) {
    .back-to-top {
      right: 14px;
      bottom: 16px;
      width: 42px;
      height: 42px;
      box-shadow: none;
    }
  }
</style>
