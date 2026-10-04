<script lang="ts">
  /**
   * ThemeToggle.svelte · 亮色 / 暗色 / 跟随系统 三态循环
   * --------------------------------------------------------------------------
   * 首屏判定与「换页后补回」都在 BaseLayout 的行内脚本里完成（避免闪白），
   * 这里只负责读取状态、把用户的选择写回 localStorage。
   *
   * 真正的渲染统一交给 window.__theme.apply —— 页头脚本和这个按钮共用一份逻辑，
   * 否则两边对「当前该是什么主题」的理解迟早会分叉。
   */
  import { onMount } from 'svelte';
  import Icon from './Icon.svelte';

  type Mode = 'light' | 'dark' | 'auto';

  /** BaseLayout 的行内脚本挂上来的全局主题接口 */
  interface ThemeApi {
    mode(): Mode;
    apply(mode: Mode): void;
  }

  const ORDER: Mode[] = ['light', 'dark', 'auto'];
  const LABEL: Record<Mode, string> = {
    light: '亮色',
    dark: '暗色',
    auto: '跟随系统',
  };
  const ICON: Record<Mode, string> = {
    light: 'sun',
    dark: 'moon',
    auto: 'monitor',
  };

  function themeApi(): ThemeApi | null {
    return (window as unknown as { __theme?: ThemeApi }).__theme ?? null;
  }

  let mode = $state<Mode>('auto');
  let spinning = $state(false);

  function apply(next: Mode) {
    const api = themeApi();
    if (!api) return;

    try {
      if (next === 'auto') localStorage.removeItem('theme');
      else localStorage.setItem('theme', next);
    } catch {
      /* 隐私模式下写不进去，本次会话内仍然生效 */
    }

    // 切换瞬间关掉全站过渡，避免整页「闪一下」
    const root = document.documentElement;
    root.classList.add('theme-switching');
    api.apply(next);
    window.setTimeout(() => root.classList.remove('theme-switching'), 80);
  }

  function cycle() {
    const next = ORDER[(ORDER.indexOf(mode) + 1) % ORDER.length];
    mode = next;
    apply(next);

    spinning = true;
    window.setTimeout(() => (spinning = false), 500);
  }

  onMount(() => {
    // 状态以全局接口为准：换页/home 首次加载都由它判定
    mode = themeApi()?.mode() ?? 'auto';
  });
</script>

<button
  type="button"
  class="icon-btn theme-toggle"
  onclick={cycle}
  title={`当前：${LABEL[mode]}（点击切换）`}
  aria-label={`主题：${LABEL[mode]}，点击切换`}
>
  <span class="glyph" class:spin={spinning}>
    <Icon name={ICON[mode]} size={17} />
  </span>
</button>

<style>
  .theme-toggle {
    position: relative;
  }

  .glyph {
    display: inline-flex;
    transition: transform var(--t-ring);
  }

  /* 切换时轻微旋转，0.5s 以内，符合 DESIGN.md 的动效约束 */
  .glyph.spin {
    transform: rotate(180deg);
  }
</style>
