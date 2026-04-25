import { computed, type Ref } from 'vue';
import type { ParsedArticle } from '@/services/reader';
import type { PaywallInfo } from '@/utils/detectPaywall';
import { cleanPaywallCTA } from '@/utils/detectPaywall';
import { useEntriesStore } from '@/stores/entries';
import type { Entry } from '@/types/miniflux';

function isSameImage(urlA: string, urlB: string): boolean {
  if (urlA === urlB) return true;
  const baseA = urlA.split('?')[0];
  const baseB = urlB.split('?')[0];
  if (baseA === baseB) return true;
  const fileA = baseA.split('/').pop() ?? '';
  const fileB = baseB.split('/').pop() ?? '';
  if (fileA.length > 10 && fileA === fileB) return true;
  try {
    const pathA = new URL(urlA).pathname;
    const pathB = new URL(urlB).pathname;
    if (pathA.length > 10 && (pathA.includes(pathB) || pathB.includes(pathA))) return true;
  } catch {
    // invalid URL
  }
  return false;
}

interface Options {
  entry: Ref<Entry | null>;
  parsed: Ref<ParsedArticle | null>;
  paywall: Ref<PaywallInfo>;
  entryId: () => number;
}

export function useArticleContent({ entry, parsed, entryId }: Options) {
  const entriesStore = useEntriesStore();

  const rawHeroImage = computed<string | null>(() => {
    if (parsed.value?.heroImage) return parsed.value.heroImage;
    return entriesStore.getEntryImage(entryId()) ?? null;
  });

  const articleContent = computed(() => {
    const raw = parsed.value?.content ?? entry.value?.content ?? '';
    const cleaned = cleanPaywallCTA(raw);
    if (!rawHeroImage.value) return cleaned;

    const doc = new DOMParser().parseFromString(cleaned, 'text/html');
    const firstImg = doc.querySelector('img');
    if (firstImg) {
      const src = firstImg.getAttribute('src') ?? '';
      if (isSameImage(rawHeroImage.value, src)) {
        (firstImg.closest('figure') ?? firstImg).remove();
        return doc.body.innerHTML;
      }
    }
    return cleaned;
  });

  return { rawHeroImage, articleContent };
}
