import { onBeforeUnmount, ref, watch } from 'vue';

interface Options {
  onLoad: () => void | Promise<void>;
  rootMargin?: string;
}

export function useInfiniteScroll({ onLoad, rootMargin = '400px' }: Options) {
  const sentinel = ref<HTMLElement | null>(null);
  let observer: IntersectionObserver | null = null;

  // Re-attach observer whenever the sentinel element appears/changes
  watch(sentinel, (el, prev) => {
    if (observer && prev) {
      observer.unobserve(prev);
    }
    if (!observer) {
      observer = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting) {
            onLoad();
          }
        },
        { rootMargin },
      );
    }
    if (el) {
      observer.observe(el);
    }
  }, { immediate: true });

  onBeforeUnmount(() => {
    observer?.disconnect();
    observer = null;
  });

  return { sentinel };
}
