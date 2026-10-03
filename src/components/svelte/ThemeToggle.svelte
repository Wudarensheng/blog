<script lang="ts">
  /**
   * ThemeToggle.svelte · 亮色 / 暗色 / 跟随系统 三态循环
   * --------------------------------------------------------------------------
   * 首屏的判定在 BaseLayout 的行内脚本里完成（避免闪白），
   * 这里只负责挂载后读取状态、切换时写回 localStorage。
   */
  import { onMount } from 'svelte';
  import Icon from './Icon.svelte';

  type Mode = 'light' | 'dark' | 'auto';

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

  const THEME_COLOR: Record<'light' | 'dark', string> = {
    light: '#ffffff',
    dark: '#141110',
  };

  let mode = $state<Mode>('auto');
  let spinning = $state(false);

  function resolved(next: Mode): 'light' | 'dark' {
    if (next !== 'auto') return next;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function apply(next: Mode) {
    const root = document.documentElement;
    const dark = resolved(next) === 'dark';

    // 切换瞬间关掉全站过渡，避免整页「闪一下」
    root.classList.add('theme-switching');
    root.classList.toggle('dark', dark);
    root.dataset.themeMode = next;

    if (next === 'auto') localStorage.removeItem('theme');
    else localStorage.setItem('theme', next);

    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (meta) meta.content = dark ? THEME_COLOR.dark : THEME_COLOR.light;

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
    const stored = localStorage.getItem('theme');
    mode = stored === 'light' || stored === 'dark' ? stored : 'auto';
    document.documentElement.dataset.themeMode = mode;

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onSystemChange = () => {
      if (mode === 'auto') apply('auto');
    };
    mq.addEventListener('change', onSystemChange);

    return () => mq.removeEventListener('change', onSystemChange);
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
