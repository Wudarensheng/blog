<script lang="ts">
  /**
   * HeaderBehavior.svelte · 导航栏行为控制器（无渲染）
   * --------------------------------------------------------------------------
   * 导航栏与移动端抽屉的静态结构由 Astro 渲染（这样品牌图标可以用 Astro 侧的
   * <Icon>，不必进客户端包）。这个岛屿只接管三件有状态的事：
   *   1. 滚动后给 <header> 加上 data-scrolled，切换「透明浮层 → 毛玻璃」外观
   *   2. 移动端抽屉的开关、Esc 关闭、焦点接管、body 滚动锁定
   *   3. 任何 [data-search-trigger] 的点击 → 广播 app:search 事件
   */
  import { onMount } from 'svelte';

  const FOCUSABLE =
    'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

  onMount(() => {
    const header = document.querySelector<HTMLElement>('[data-navbar]');
    const drawer = document.querySelector<HTMLElement>('[data-drawer]');
    const backdrop = document.querySelector<HTMLElement>('[data-drawer-backdrop]');

    let restoreOverflow = '';
    let lastFocused: HTMLElement | null = null;

    /* ------------------------------------------------- 1. 滚动状态 --- */
    let frame = 0;
    const measure = () => {
      frame = 0;
      if (!header) return;
      header.dataset.scrolled = window.scrollY > 8 ? 'true' : 'false';
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener('scroll', onScroll, { passive: true });

    /* ------------------------------------------------- 2. 抽屉 --- */
    function openDrawer() {
      if (!drawer) return;
      lastFocused = document.activeElement as HTMLElement | null;
      drawer.dataset.open = 'true';
      drawer.removeAttribute('inert');
      backdrop?.setAttribute('data-open', 'true');
      restoreOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      header?.setAttribute('data-drawer-open', 'true');
      queueMicrotask(() => drawer.querySelector<HTMLElement>(FOCUSABLE)?.focus());
    }

    function closeDrawer() {
      if (!drawer || drawer.dataset.open !== 'true') return;
      drawer.dataset.open = 'false';
      drawer.setAttribute('inert', '');
      backdrop?.setAttribute('data-open', 'false');
      document.body.style.overflow = restoreOverflow;
      header?.removeAttribute('data-drawer-open');
      lastFocused?.focus?.();
    }

    const onDrawerClick = (event: MouseEvent) => {
      const toggle = (event.target as HTMLElement).closest('[data-drawer-toggle]');
      if (toggle) {
        event.preventDefault();
        drawer?.dataset.open === 'true' ? closeDrawer() : openDrawer();
        return;
      }
      // 点了抽屉里的链接就顺势收起
      const link = (event.target as HTMLElement).closest('[data-drawer] a[href]');
      if (link && !link.hasAttribute('data-keep-open')) closeDrawer();
    };

    const onKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeDrawer();
        return;
      }
      // 抽屉打开时把 Tab 锁在抽屉里
      if (event.key !== 'Tab' || !drawer || drawer.dataset.open !== 'true') return;

      const items = [...drawer.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
        (el) => el.offsetParent !== null,
      );
      if (!items.length) return;

      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    /* --------------------------------------------- 3. 搜索触发器 --- */
    const onSearchClick = (event: MouseEvent) => {
      const trigger = (event.target as HTMLElement).closest('[data-search-trigger]');
      if (!trigger) return;
      event.preventDefault();
      closeDrawer();
      window.dispatchEvent(new CustomEvent('app:search'));
    };

    document.addEventListener('click', onDrawerClick);
    document.addEventListener('click', onSearchClick);
    document.addEventListener('keydown', onKeydown);

    return () => {
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('click', onDrawerClick);
      document.removeEventListener('click', onSearchClick);
      document.removeEventListener('keydown', onKeydown);
      if (frame) cancelAnimationFrame(frame);
      document.body.style.overflow = restoreOverflow;
    };
  });
</script>

<!-- 纯行为组件：不渲染任何可见内容 -->
