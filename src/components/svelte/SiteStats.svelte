<script lang="ts">
  /**
   * SiteStats.svelte · 侧栏信息卡：全站访问量 / 访客数
   * 数据来自 Umami 分享 API（见 src/lib/umami.ts），失败时显示占位符。
   */
  import { onMount } from 'svelte';
  import Icon from './Icon.svelte';
  import { fetchSiteStats, formatCount, umamiConfig } from '@/lib/umami';

  let pageviews = $state<number | null>(null);
  let visitors = $state<number | null>(null);

  onMount(() => {
    if (!umamiConfig.enabled) return;
    let alive = true;
    void fetchSiteStats().then((data) => {
      if (!alive || !data) return;
      pageviews = data.pageviews;
      visitors = data.visitors;
    });
    return () => {
      alive = false;
    };
  });

  const display = (value: number | null): string => (value === null ? '–' : formatCount(value));
</script>

<ul class="site-stats" aria-label="访问统计">
  <li>
    <span class="k"><Icon name="eye" size={13} /> 访问量</span>
    <span class="v">{display(pageviews)}</span>
  </li>
  <li>
    <span class="k"><Icon name="users" size={13} /> 访客数</span>
    <span class="v">{display(visitors)}</span>
  </li>
</ul>

<style>
  .site-stats {
    list-style: none;
    margin: 0 0 var(--s-3);
    padding: 0;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--s-2);
  }

  .site-stats li {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    padding: 8px 4px;
    border-radius: var(--r-sm);
    background: var(--a-l);
  }

  .k {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    font-size: var(--fs-label);
    letter-spacing: var(--ls-mono);
    color: var(--text-3);
  }

  .v {
    font-family: var(--font-mono);
    font-size: 0.98rem;
    font-weight: 700;
    color: var(--a-d);
  }
</style>
