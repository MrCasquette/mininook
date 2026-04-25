import { ref, onMounted } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import { getClient } from '@/services/miniflux';
import { parseArticle, type ParsedArticle } from '@/services/reader';
import { detectPaywall, type PaywallInfo } from '@/utils/detectPaywall';
import { useSettingsStore } from '@/stores/settings';
import type { Entry } from '@/types/miniflux';

async function fetchFullHtml(url: string): Promise<string | null> {
  try {
    return await invoke<string>('fetch_page', { url });
  } catch {
    return null;
  }
}

export function useArticleLoader(entryId: () => number) {
  const entry = ref<Entry | null>(null);
  const parsed = ref<ParsedArticle | null>(null);
  const loading = ref(true);
  const error = ref<string | null>(null);
  const paywall = ref<PaywallInfo>({ isPaywalled: false, truncatedPercent: null });

  const settingsStore = useSettingsStore();

  onMounted(async () => {
    try {
      if (!settingsStore.isConfigured) {
        error.value = 'Connexion à Miniflux requise';
        loading.value = false;
        return;
      }
      const client = getClient();
      const id = entryId();

      entry.value = await client.getEntry(id);

      const url = entry.value.url;
      // 1. Try full page fetch (Tauri) + site config / Defuddle
      const fullHtml = await fetchFullHtml(url);
      if (fullHtml) {
        const result = await parseArticle(fullHtml, url);
        if (result) {
          parsed.value = result;
          paywall.value = detectPaywall(result.content, fullHtml);
          return;
        }
      }

      // 2. Fallback: Miniflux fetchEntryContent
      try {
        const fetched = await client.fetchEntryContent(id);
        if (fetched.content) {
          const result = await parseArticle(fetched.content, url);
          if (result) {
            parsed.value = result;
            paywall.value = detectPaywall(result.content, fetched.content);
            return;
          }
          parsed.value = {
            title: entry.value.title,
            content: fetched.content,
            excerpt: '',
            siteName: entry.value.feed.title,
            heroImage: null,
            heroCaption: null,
            author: null,
            wordCount: 0,
          };
          paywall.value = detectPaywall(fetched.content);
          return;
        }
      } catch {
        // fetchEntryContent failed (403, 500, etc.) — use original RSS content
      }

      // 3. Last resort: use RSS content as-is
      paywall.value = detectPaywall(entry.value.content);
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Impossible de charger l'article";
    } finally {
      loading.value = false;
    }
  });

  return { entry, parsed, paywall, loading, error };
}
