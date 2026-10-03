<script lang="ts">
  /**
   * TableOfContents.svelte · 侧栏目录（滚动高亮）
   * --------------------------------------------------------------------------
   * 用 rAF 节流的滚动监听做 scroll-spy：找出「最后一个已经越过导航栏」的标题。
   * 左侧的竖线是进度轨：读过的条目染上主色，当前条目染上深色。
   */
  import { onMount } from 'svelte';
  import Icon from './Icon.svelte';

  interface Heading {
    depth: number;
    slug: string;
    text: string;
  }

  interface Props {
    headings: Heading[];
    /** 只展示这些层级 */
    depths?: number[];
  }

  let { headings, depths = [2, 3] }: Props = $props();

  const items = $derived(headings.filter((h) => depths.includes(h.depth)));
  const minDepth = $derived(items.length ? Math.min(...items.map((h) => h.depth)) : 2);

  let activeIndex = $state(0);
  let collapsed = $state(false);

  onMount(() => {
    let frame = 0;

    const measure = () => {
      frame = 0;
      const offset = 96; // 固定导航栏 + 呼吸空间
      let current = 0;

      for (let i = 0; i < items.length; i += 1) {
        const el = document.getElementById(items[i].slug);
        if (!el) continue;
        if (el.getBoundingClientRect().top <= offset) current = i;
        else break;
      }

      // 已经滚到底部时，强制点亮最后一条
      const doc = document.documentElement;
      if (window.innerHeight + window.scrollY >= doc.scrollHeight - 8) {
        current = items.length - 1;
      }

      activeIndex = current;
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

{#if items.length > 0}
  <nav class="toc" aria-label="文章目录">
    <div class="head">
      <Icon name="list" size={14} />
      <span>目录</span>
      <button
        type="button"
        class="toggle"
        onclick={() => (collapsed = !collapsed)}
        aria-expanded={!collapsed}
        aria-label={collapsed ? '展开目录' : '收起目录'}
      >
        <Icon name={collapsed ? 'chevron-down' : 'chevron-up'} size={14} />
      </button>
    </div>

    {#if !collapsed}
      <ul>
        {#each items as heading, i (heading.slug)}
          <li
            class:active={i === activeIndex}
            class:passed={i < activeIndex}
            style={`--indent:${(heading.depth - minDepth) * 12}px`}
          >
            <a href={`#${heading.slug}`}>
              <span class="text">{heading.text}</span>
            </a>
          </li>
        {/each}
      </ul>
    {/if}
  </nav>
{/if}

<style>
  .toc {
    font-size: 0.82rem;
  }

  .head {
    display: flex;
    align-items: center;
    gap: 8px;
    padding-bottom: 10px;
    color: var(--text-3);
    font-family: var(--font-mono);
    font-size: var(--fs-label);
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .toggle {
    margin-left: auto;
    display: inline-flex;
    color: var(--text-3);
    transition: color var(--t-color);
  }

  .toggle:hover {
    color: var(--text-1);
  }

  ul {
    display: flex;
    flex-direction: column;
  }

  li {
    border-left: 2px solid var(--line);
    transition: border-color 0.25s var(--ease);
  }

  li.passed {
    border-left-color: var(--orange);
  }

  li.active {
    border-left-color: var(--amber-d);
  }

  a {
    display: block;
    padding: 5px 10px 5px calc(10px + var(--indent));
    color: var(--text-2);
    line-height: 1.55;
    transition: color var(--t-color), transform var(--t-move);
  }

  a:hover {
    color: var(--text-1);
    transform: translateX(2px);
  }

  li.active a {
    color: var(--amber-d);
    font-weight: 700;
  }

  .text {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>
