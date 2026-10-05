<script lang="ts">
  /**
   * PageViews.svelte · 当前页面的访问量（放在标题下方）
   * 路径取 location.pathname，与 Umami 记录的 path 对齐（带尾斜杠）。
   */
  import { onMount } from 'svelte';
  import Icon from './Icon.svelte';
  import { fetchPathViews, formatCount, normalizePath, umamiConfig } from '@/lib/umami';

  let views = $state<number | null>(null);

  onMount(() => {
    if (!umamiConfig.enabled) return;
    let alive = true;
    void fetchPathViews().then((map) => {
      if (!alive) return;
      views = map.get(normalizePath(location.pathname)) ?? 0;
    });
    return () => {
      alive = false;
    };
  });
</script>

{#if umamiConfig.enabled}
  <span class="page-views">
    <Icon name="eye" size={12} />
    <span class="n">{views === null ? '–' : formatCount(views)}</span>
    <span class="unit">次浏览</span>
  </span>
{/if}

<style>
  .page-views {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    margin-top: var(--s-1);
    font-family: var(--font-mono);
    font-size: var(--fs-meta);
    letter-spacing: var(--ls-mono);
    color: var(--text-3);
  }

  .page-views .n {
    color: var(--text-2);
  }

  .page-views .unit {
    color: var(--text-3);
  }
</style>
