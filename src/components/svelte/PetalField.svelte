<script lang="ts">
  /**
   * PetalField.svelte · 可选的暖色粒子背景（Fuwari 风格）
   * --------------------------------------------------------------------------
   * 默认关闭。DESIGN.md 主张「少动效、多留白」，所以这是一个需要显式开启的
   * 装饰：把这些点缀当作 6.4 柔光背景的「动态版」，而不是主视觉。
   * 遵守 prefers-reduced-motion，标签页不可见时自动暂停。
   */
  interface Props {
    /** 粒子数量，建议 12~28 */
    count?: number;
    /** 整体透明度上限 */
    opacity?: number;
    /** 容器高度，一般与 Banner 一致 */
    height?: string;
  }

  let { count = 20, opacity = 0.38, height = '100%' }: Props = $props();

  let canvas = $state<HTMLCanvasElement | null>(null);

  const COLORS = ['#f2bc55', '#ff9d45', '#dd7350'];

  $effect(() => {
    const el = canvas;
    if (!el) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ctx = el.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let raf = 0;
    let running = true;

    interface Petal {
      x: number;
      y: number;
      r: number;
      vx: number;
      vy: number;
      a: number;
      color: string;
    }

    let petals: Petal[] = [];

    const resize = () => {
      const rect = el.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      el.width = Math.max(1, Math.floor(width * dpr));
      el.height = Math.max(1, Math.floor(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const seed = () => {
      petals = Array.from({ length: count }, (_, i) => ({
        x: Math.random() * width,
        y: Math.random() * height,
        r: 1.6 + Math.random() * 2.6,
        vx: (Math.random() - 0.5) * 0.16,
        vy: 0.06 + Math.random() * 0.22,
        a: 0.25 + Math.random() * 0.6,
        color: COLORS[i % COLORS.length],
      }));
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      for (const p of petals) {
        p.x += p.vx;
        p.y += p.vy;

        if (p.y - p.r > height) {
          p.y = -p.r * 2;
          p.x = Math.random() * width;
        }
        if (p.x < -p.r * 2) p.x = width + p.r;
        if (p.x > width + p.r * 2) p.x = -p.r;

        ctx.globalAlpha = p.a * opacity;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
    };

    const loop = () => {
      if (!running) return;
      draw();
      raf = requestAnimationFrame(loop);
    };

    const start = () => {
      if (reduce) {
        draw();
        return;
      }
      if (!raf) raf = requestAnimationFrame(loop);
    };

    const stop = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };

    const onVisibility = () => {
      running = !document.hidden;
      running ? start() : stop();
    };

    resize();
    seed();
    start();

    const observer = new ResizeObserver(() => {
      resize();
      seed();
      if (reduce) draw();
    });
    observer.observe(el);

    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      running = false;
      stop();
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  });
</script>

<canvas bind:this={canvas} class="petal-field" style={`height:${height}`} aria-hidden="true"></canvas>

<style>
  .petal-field {
    position: absolute;
    inset: 0;
    width: 100%;
    pointer-events: none;
  }

  @media (max-width: 768px) {
    /* 先减装饰 */
    .petal-field {
      display: none;
    }
  }
</style>
