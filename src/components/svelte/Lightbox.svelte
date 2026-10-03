<script lang="ts">
  /**
   * Lightbox.svelte · 图片灯箱
   * --------------------------------------------------------------------------
   * 用事件委托监听整篇文档：任何 `img[data-zoomable]` 或正文里的插图都能放大。
   * 支持 Esc 关闭、点击遮罩关闭、再次点击图片切换「适应 / 原始尺寸」。
   */
  import { onMount } from 'svelte';
  import Icon from './Icon.svelte';

  let open = $state(false);
  let src = $state('');
  let alt = $state('');
  let zoomed = $state(false);

  let restoreOverflow = '';

  function show(target: HTMLImageElement) {
    src = target.currentSrc || target.src;
    alt = target.alt ?? '';
    zoomed = false;
    restoreOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    open = true;
  }

  function hide() {
    if (!open) return;
    open = false;
    document.body.style.overflow = restoreOverflow;
  }

  onMount(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target || target.tagName !== 'IMG') return;

      const img = target as HTMLImageElement;
      const zoomable = img.hasAttribute('data-zoomable') || !!img.closest('.prose');
      if (!zoomable || img.closest('a')) return;

      event.preventDefault();
      show(img);
    };

    const onKey = (event: KeyboardEvent) => {
      if (!open) return;
      if (event.key === 'Escape') hide();
      if (event.key === ' ') {
        event.preventDefault();
        zoomed = !zoomed;
      }
    };

    document.addEventListener('click', onClick);
    window.addEventListener('keydown', onKey);

    return () => {
      document.removeEventListener('click', onClick);
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = restoreOverflow;
    };
  });
</script>

{#if open}
  <div
    class="lightbox"
    role="dialog"
    aria-modal="true"
    aria-label="图片预览"
    onclick={(e) => e.target === e.currentTarget && hide()}
  >
    <button type="button" class="close" onclick={hide} aria-label="关闭预览">
      <Icon name="x" size={18} />
    </button>

    <button
      type="button"
      class="zoom"
      onclick={() => (zoomed = !zoomed)}
      aria-label={zoomed ? '适应窗口' : '查看原始尺寸'}
    >
      <Icon name={zoomed ? 'zoom-out' : 'zoom-in'} size={18} />
    </button>

    <img
      {src}
      {alt}
      class:zoomed
      onclick={() => (zoomed = !zoomed)}
      role="presentation"
    />

    {#if alt}
      <p class="caption">{alt}</p>
    {/if}
  </div>
{/if}

<style>
  .lightbox {
    position: fixed;
    inset: 0;
    z-index: 160;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 14px;
    padding: 5vh 4vw;
    background: var(--surface-sunk);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    animation: veil 0.2s ease both;
    cursor: zoom-out;
    overflow: auto;
  }

  @keyframes veil {
    from {
      opacity: 0;
    }
  }

  .lightbox img {
    max-width: 100%;
    max-height: 82vh;
    border-radius: var(--r-md);
    box-shadow: var(--shadow-pop);
    cursor: zoom-in;
    animation: pop 0.25s var(--ease) both;
    transition: max-width var(--t-move), max-height var(--t-move);
  }

  .lightbox img.zoomed {
    max-width: none;
    max-height: none;
    cursor: zoom-out;
  }

  @keyframes pop {
    from {
      opacity: 0;
      transform: scale(0.97);
    }
  }

  .caption {
    max-width: 60ch;
    color: #e8ecef;
    font-family: var(--font-mono);
    font-size: var(--fs-meta);
    letter-spacing: var(--ls-mono);
    text-align: center;
    text-shadow: 0 1px 6px rgba(0, 0, 0, 0.4);
  }

  .close,
  .zoom {
    position: fixed;
    top: 18px;
    display: grid;
    place-items: center;
    width: 38px;
    height: 38px;
    border-radius: var(--r-sm);
    background: rgba(255, 255, 255, 0.14);
    color: #fff;
    cursor: pointer;
    transition: background-color var(--t-color), transform var(--t-move);
  }

  .close {
    right: 18px;
  }

  .zoom {
    right: 66px;
  }

  .close:hover,
  .zoom:hover {
    background: rgba(255, 255, 255, 0.26);
    transform: translateY(-2px);
  }

  @media (max-width: 768px) {
    .lightbox {
      padding: 4vh 3vw;
    }

    .lightbox img {
      max-height: 74vh;
    }
  }
</style>
