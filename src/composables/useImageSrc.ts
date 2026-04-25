import { ref, watch, type Ref } from 'vue';
import { needsProxy, proxyImage, optimizeImageUrl } from '@/services/imageProxy';

/**
 * Returns a reactive image src that is automatically routed through the
 * Tauri proxy + blob URL for hosts known to block hotlinking.
 */
export function useImageSrc(
  rawUrl: Ref<string | null>,
  referer: Ref<string | undefined>,
) {
  const initial = rawUrl.value ? optimizeImageUrl(rawUrl.value) : null;
  const initialNeedsProxy = !!(initial && needsProxy(initial));
  const src = ref<string | null>(initialNeedsProxy ? null : initial);
  const pending = ref<boolean>(initialNeedsProxy);

  watch(
    [rawUrl, referer],
    ([raw, ref], _prev, onCleanup) => {
      if (!raw) {
        src.value = null;
        pending.value = false;
        return;
      }
      const url = optimizeImageUrl(raw);
      if (!needsProxy(url)) {
        src.value = url;
        pending.value = false;
        return;
      }
      let cancelled = false;
      onCleanup(() => {
        cancelled = true;
      });
      src.value = null;
      pending.value = true;
      proxyImage(url, ref).then((proxied) => {
        if (cancelled) return;
        src.value = proxied;
        pending.value = false;
      });
    },
    { immediate: true },
  );

  return { src, pending };
}
