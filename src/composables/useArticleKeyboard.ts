import { onMounted, onBeforeUnmount } from 'vue';

interface Handlers {
  onMarkRead: () => void;
  onToggleBookmark: () => void;
}

export function useArticleKeyboard({ onMarkRead, onToggleBookmark }: Handlers) {
  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'r') onMarkRead();
    if (e.key === 's') onToggleBookmark();
  }

  onMounted(() => window.addEventListener('keydown', onKeydown));
  onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown));
}
