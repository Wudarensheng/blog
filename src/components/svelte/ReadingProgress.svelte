<script lang="ts">
  /**
   * ReadingProgress.svelte · 顶部阅读进度条（DESIGN.md 6.5）
   * --------------------------------------------------------------------------
   * 2~3px 高的横条，平色，随滚动增长。
   * 这是页面上唯一会动的常驻元素。
   */
  import { onMount } from 'svelte';

  let progress = $state(0);
  let visible = $state(false);

  onMount(() => {
    let frame = 0;

    const measure = () => {
      frame = 0;
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      progress = max > 8 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      visible = window.scrollY > 4;
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
</script>

<div class="reading-progress" class:is-visible={visible} aria-hidden="true">
  <span class="bar" style={`transform:scaleX(${progress})`}></span>
</div>

<style>
  .reading-progress {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    z-index: 120;
    pointer-events: none;
    opacity: 0;
    transition: opacity var(--t-move);
  }

  .reading-progress.is-visible {
    opacity: 1;
  }

  .bar {
    display: block;
    height: 100%;
    width: 100%;
    transform-origin: 0 50%;
    background: var(--brand);
    /* 跟随滚动，用 linear 缓动 */
    transition: transform 0.08s linear;
  }

  @media (max-width: 768px) {
    .reading-progress {
      height: 2px;
    }
  }
</style>
