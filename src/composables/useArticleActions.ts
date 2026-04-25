import { computed, type Ref } from 'vue';
import { useRouter } from 'vue-router';
import { open as shellOpen } from '@tauri-apps/plugin-shell';
import { useEntriesStore } from '@/stores/entries';
import type { Entry } from '@/types/miniflux';

export function useArticleActions(entry: Ref<Entry | null>) {
  const router = useRouter();
  const entriesStore = useEntriesStore();

  const isRead = computed(() => entry.value?.status === 'read');

  function goBack() {
    router.back();
  }

  function openExternal(url: string) {
    shellOpen(url).catch(() => window.open(url, '_blank'));
  }

  async function markRead() {
    if (!entry.value || isRead.value) return;
    await entriesStore.markAsRead(entry.value.id).catch(() => {});
    entry.value = { ...entry.value, status: 'read' };
  }

  async function toggleBookmark() {
    if (!entry.value) return;
    await entriesStore.toggleBookmark(entry.value.id);
    entry.value = { ...entry.value, starred: !entry.value.starred };
  }

  function openOriginal() {
    if (entry.value) openExternal(entry.value.url);
  }

  function handleContentClick(event: MouseEvent) {
    const target = (event.target as HTMLElement).closest('a');
    if (!target) return;
    const href = target.getAttribute('href');
    if (!href || href.startsWith('#')) return;
    event.preventDefault();
    openExternal(href);
  }

  return { isRead, goBack, markRead, toggleBookmark, openOriginal, handleContentClick };
}
