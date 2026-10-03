<script lang="ts">
  /**
   * Icon.svelte · Svelte 侧的内联图标
   * 与 Astro 侧的 <Icon> 同形同款，但只带交互控件需要的少量图标，
   * 保证客户端包最小。
   */
  import { iconBody } from './icons';

  interface Props {
    name: string;
    size?: number;
    stroke?: number;
    class?: string;
  }

  let { name, size = 18, stroke = 1.75, class: className = '' }: Props = $props();

  const body = $derived(iconBody(name));
</script>

<svg
  xmlns="http://www.w3.org/2000/svg"
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width={stroke}
  stroke-linecap="round"
  stroke-linejoin="round"
  class={className}
  aria-hidden="true"
  focusable="false"
>
  <!-- eslint-disable-next-line svelte/no-at-html-tags -- 图标路径来自本地常量表 -->
  {@html body}
</svg>
