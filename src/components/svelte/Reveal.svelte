<script lang="ts">
  /**
   * Reveal.svelte · 滚动揭示（无渲染的行为岛屿）
   * --------------------------------------------------------------------------
   * 给页面里成组的元素加上「进入视口时淡入上浮」的效果，并按顺序错开。
   * 不要求在标记里写任何东西——它自己按选择器去找目标，
   * 所以 Astro 组件保持纯静态，不需要为动画改结构。
   *
   * 三条约束（来自 DESIGN.md 第 7 节）：
   *   · 单次动画不超过 0.6s，用 --t-move 的缓动，不用回弹
   *   · 不让多个元素同时大幅运动 —— 位移只有 10px，且严格错峰
   *   · prefers-reduced-motion 时整个效果直接不启用
   *
   * 另外做了一个 LCP 上的取舍：首屏就已经在视口里的元素**只做位移、不做透明度**，
   * 这样它们从第一帧起就是「已绘制」的，不会把最大内容绘制时间往后拖。
   */
  import { onMount } from 'svelte';

  interface Props {
    /** 要揭示的组，按顺序扫描；同一组内按索引错开 */
    groups?: { selector: string; stagger?: number }[];
  }

  const DEFAULT_GROUPS = [
    { selector: '.banner .eyebrow, .banner .title, .banner .desc, .banner .scroll-hint', stagger: 70 },
    { selector: '.post-list > .post-card', stagger: 55 },
    { selector: '.sidebar-stack > *', stagger: 45 },
    { selector: '.timeline > .year', stagger: 60 },
    { selector: '.grid > *', stagger: 45 },
    { selector: '.page-head, .article, .page-mini', stagger: 0 },
  ];

  let { groups = DEFAULT_GROUPS }: Props = $props();

  onMount(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;

    const vh = window.innerHeight;
    const observed: HTMLElement[] = [];

    for (const group of groups) {
      const stagger = group.stagger ?? 50;

      document.querySelectorAll<HTMLElement>(group.selector).forEach((el, index) => {
        // 同一个元素被多组命中时只处理一次
        if (el.dataset.reveal) return;

        // 首屏已可见的元素：只位移，不淡入，避免拖慢 LCP
        const inViewport = el.getBoundingClientRect().top < vh;
        el.dataset.reveal = inViewport ? 'soft' : 'full';
        el.style.setProperty('--reveal-delay', `${Math.min(index, 8) * stagger}ms`);

        if (inViewport) {
          // 下一帧就位，形成一次短促的入场
          requestAnimationFrame(() => {
            requestAnimationFrame(() => el.setAttribute('data-revealed', 'true'));
          });
        } else {
          observed.push(el);
        }
      });
    }

    if (!observed.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.setAttribute('data-revealed', 'true');
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.06 },
    );

    for (const el of observed) observer.observe(el);

    return () => observer.disconnect();
  });
</script>

<!-- 纯行为组件：不渲染任何可见内容 -->
