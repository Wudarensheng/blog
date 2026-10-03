<script lang="ts">
  /**
   * ImageFade.svelte · 图片淡入（无渲染的行为岛屿）
   * --------------------------------------------------------------------------
   * 给还没有加载完的图片补一个淡入，避免「啪」地一下出现。
   *
   * 关键细节：浏览器对**已缓存**的图片会在脚本执行之前就触发 load，
   * 只监听 load 事件的话这些图会永远停在透明状态。
   * 所以先看 img.complete，再决定是直接标记还是等事件。
   */
  import { onMount } from 'svelte';

  interface Props {
    selector?: string;
  }

  let {
    selector = '.prose img, .post-card .cover img, .article .cover img, .friend img',
  }: Props = $props();

  onMount(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const images = [...document.querySelectorAll<HTMLImageElement>(selector)];
    const cleanups: (() => void)[] = [];

    for (const img of images) {
      if (img.hasAttribute('data-fade')) continue;
      img.setAttribute('data-fade', '');

      if (img.complete && img.naturalWidth > 0) {
        img.setAttribute('data-loaded', 'true');
        continue;
      }

      const done = () => img.setAttribute('data-loaded', 'true');
      const fail = () => img.setAttribute('data-loaded', 'true'); // 加载失败也要显示出来
      img.addEventListener('load', done, { once: true });
      img.addEventListener('error', fail, { once: true });
      cleanups.push(() => {
        img.removeEventListener('load', done);
        img.removeEventListener('error', fail);
      });
    }

    return () => cleanups.forEach((fn) => fn());
  });
</script>

<!-- 纯行为组件：不渲染任何可见内容 -->
