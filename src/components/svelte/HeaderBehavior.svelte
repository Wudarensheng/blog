<script lang="ts">
  /**
   * HeaderBehavior.svelte · 导航栏行为控制器（无渲染）
   * --------------------------------------------------------------------------
   * 导航栏与移动端抽屉的静态结构由 Astro 渲染（这样品牌图标可以用 Astro 侧的
   * <Icon>，不必进客户端包）。这个岛屿只接管四件有状态的事：
   *   1. 滚动后给 <header> 加上 data-scrolled，切换「透明浮层 → 毛玻璃」外观
   *   2. 向下滚时把导航栏滑出视口，向上滚立刻滑回来
   *   3. 移动端抽屉的开关、Esc 关闭、焦点接管、body 滚动锁定
   *   4. 任何 [data-search-trigger] 的点击 → 广播 app:search 事件
   */
  import { onMount } from 'svelte';

  const FOCUSABLE =
    'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

  /** 滚过这么多像素之后才开始允许隐藏 */
  const PIN_ABOVE = 140;
  /** 方向判定阈值：小于这个位移不动，让差值继续累积，避免抖动 */
  const DELTA = 8;

  onMount(() => {
    const header = document.querySelector<HTMLElement>('[data-navbar]');
    const drawer = document.querySelector<HTMLElement>('[data-drawer]');
    const backdrop = document.querySelector<HTMLElement>('[data-drawer-backdrop]');

    let restoreOverflow = '';
    let lastFocused: HTMLElement | null = null;

    /* ------------------------------------------------- 1. 滚动状态 --- */
    let lastY = window.scrollY;
    let hidden = false;

    const setHidden = (next: boolean) => {
      if (!header || hidden === next) return;
      hidden = next;
      header.dataset.hidden = next ? 'true' : 'false';
    };

    const measure = () => {
      if (!header) return;

      const y = Math.max(0, window.scrollY);
      header.dataset.scrolled = y > 8 ? 'true' : 'false';

      /*
       * 三种情况一律不隐藏：
       *   · 靠近顶部 —— 导航栏本来就不占地方，藏了反而让人找不到
       *   · 抽屉开着 —— 背后突然空一块很难看
       *   · 焦点在导航栏里 —— 键盘用户正操作的东西不能凭空消失
       */
      const pinned =
        y <= PIN_ABOVE ||
        drawer?.dataset.open === 'true' ||
        header.contains(document.activeElement);

      if (pinned) {
        setHidden(false);
        lastY = y;
        return;
      }

      const dy = y - lastY;
      if (Math.abs(dy) < DELTA) return; // 不动 lastY，让方向差值继续累积

      setHidden(dy > 0);
      lastY = y;
    };

    /*
     * 直接处理，不套 requestAnimationFrame。
     *
     * 滚动事件本身就是按帧对齐的（浏览器每帧最多派发一次），再节流一层没有收益，
     * 却会引入一个失效模式：不产帧的时候（标签页在后台、窗口被遮挡）rAF 不回调，
     * 标志位一直非零，之后所有滚动事件都被丢掉，导航栏就卡在错误状态里。
     * measure() 本身只读一次 scrollY、比两次、最多写一个属性，不需要节流。
     */
    const onScroll = () => measure();

    // 键盘 Tab 进入导航栏时立刻拉回来
    const onFocusIn = () => {
      setHidden(false);
      lastY = Math.max(0, window.scrollY);
    };

    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    header?.addEventListener('focusin', onFocusIn);

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
      setHidden(false);
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
      header?.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('click', onDrawerClick);
      document.removeEventListener('click', onSearchClick);
      document.removeEventListener('keydown', onKeydown);
      document.body.style.overflow = restoreOverflow;
    };
  });
</script>

<!-- 纯行为组件：不渲染任何可见内容 -->
