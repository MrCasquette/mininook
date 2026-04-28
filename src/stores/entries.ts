import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';
import { getClient } from '@/services/miniflux';
import { enrichEntry, buildFromRss } from '@/services/enricher';
import { extractImageUrl } from '@/utils/extractImage';
import { deduplicateEntries } from '@/utils/dedup';
import { isGalleryContent } from '@/utils/detectGallery';
import { useOnboardingStore } from '@/stores/onboarding';
import type { Entry, Category, EntryStatus, Feed, FeedCounters } from '@/types/miniflux';
import type { EntryMeta } from '@/types/meta';

const DISMISSED_STORAGE_KEY = 'mininook_dismissed';

function loadDismissedFromStorage(): Entry[] {
  const stored = localStorage.getItem(DISMISSED_STORAGE_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

function saveDismissedToStorage(entries: Entry[]) {
  // Keep last 500 max to avoid bloating localStorage
  const trimmed = entries.slice(0, 500);
  localStorage.setItem(DISMISSED_STORAGE_KEY, JSON.stringify(trimmed));
}

function loadHidePaywallFromStorage(): boolean {
  return localStorage.getItem('mininook_hide_paywall') === 'true';
}

function loadDedupFromStorage(): boolean {
  // Default OFF — dedup is opt-in (it's a cosmetic feature with a perf cost).
  return localStorage.getItem('mininook_dedup') === 'true';
}

function loadShowReadFromStorage(): boolean {
  return localStorage.getItem('mininook_show_read') === 'true';
}

export const useEntriesStore = defineStore('entries', () => {
  const entries = ref<Entry[]>([]);
  const categories = ref<Category[]>([]);
  const activeCategory = ref<number | null>(null);
  const loading = ref(false);
  const total = ref(0);
  const meta = ref<Record<number, EntryMeta>>({});
  const dismissedEntries = ref<Entry[]>(loadDismissedFromStorage());
  const hidePaywall = ref(loadHidePaywallFromStorage());
  const dedupEnabled = ref(loadDedupFromStorage());
  const showRead = ref(loadShowReadFromStorage());
  const feeds = ref<Feed[]>([]);
  const counters = ref<FeedCounters>({ reads: {}, unreads: {} });

  /**
   * Pipeline step 1 — clean the raw fetched list:
   *   - drop pure-gallery articles
   *   - dedup across feeds if `dedupEnabled` is on (cosmetic, opt-in)
   * Each item is `{ entry, duplicates[] }` ; duplicates is empty when dedup is off.
   */
  const deduped = computed(() => {
    const withoutGalleries = entries.value.filter((e) => !isGalleryContent(e.content));
    if (!dedupEnabled.value) {
      return withoutGalleries.map((entry) => ({ entry, duplicates: [] as Entry[] }));
    }
    return deduplicateEntries(withoutGalleries);
  });

  /**
   * Pipeline step 2 — alias of `deduped`. Cards display immediately with
   * RSS-based meta (image + paywall) and are silently upgraded when full
   * enrichment finishes IF the values actually differ.
   */
  const resolved = computed(() => deduped.value);

  /** Pipeline step 3 — apply user filters (category + paywall). */
  const filteredEntries = computed(() => {
    let source = resolved.value;
    if (activeCategory.value) {
      source = source.filter((d) => d.entry.feed.category.id === activeCategory.value);
    }
    if (hidePaywall.value) {
      source = source.filter((d) => !meta.value[d.entry.id]?.isPaywall);
    }
    return source;
  });

  function toggleHidePaywall() {
    hidePaywall.value = !hidePaywall.value;
    localStorage.setItem('mininook_hide_paywall', String(hidePaywall.value));
    useOnboardingStore().recordEvent('filter-toggled');
  }

  function toggleDedup() {
    dedupEnabled.value = !dedupEnabled.value;
    localStorage.setItem('mininook_dedup', String(dedupEnabled.value));
    useOnboardingStore().recordEvent('filter-toggled');
  }

  function toggleShowRead() {
    showRead.value = !showRead.value;
    localStorage.setItem('mininook_show_read', String(showRead.value));
    useOnboardingStore().recordEvent('filter-toggled');
  }

  /** Map feed_id → category_id from the feeds list */
  const feedToCategory = computed(() => {
    const map = new Map<number, number>();
    for (const feed of feeds.value) {
      map.set(feed.id, feed.category.id);
    }
    return map;
  });

  /** Visible entries per category (only fully resolved, paywall-aware). */
  const visibleByCategory = computed(() => {
    const counts: Record<number, number> = {};
    for (const d of resolved.value) {
      if (hidePaywall.value && meta.value[d.entry.id]?.isPaywall) continue;
      const catId = d.entry.feed.category.id;
      counts[catId] = (counts[catId] || 0) + 1;
    }
    return counts;
  });

  /** Total visible across all categories. */
  const visibleTotal = computed(() => {
    if (!hidePaywall.value) return resolved.value.length;
    return resolved.value.filter((d) => !meta.value[d.entry.id]?.isPaywall).length;
  });

  /** Server-side (SSOT) unread count per category, summed from feed counters. */
  const unreadByCategory = computed(() => {
    const out: Record<number, number> = {};
    for (const [feedIdStr, count] of Object.entries(counters.value.unreads)) {
      const catId = feedToCategory.value.get(Number(feedIdStr));
      if (catId !== undefined) out[catId] = (out[catId] || 0) + count;
    }
    return out;
  });

  /** Server-side (SSOT) total of all unread entries. */
  const totalUnread = computed(() =>
    Object.values(counters.value.unreads).reduce((s, n) => s + n, 0),
  );

  function getEntryMeta(entryId: number): EntryMeta | null {
    return meta.value[entryId] ?? null;
  }

  function getEntryImage(entryId: number): string | null {
    const m = meta.value[entryId];
    if (m?.image) return m.image;
    const entry = entries.value.find((e) => e.id === entryId);
    if (!entry) return null;
    return extractImageUrl(entry.content, entry.enclosures);
  }

  /** Synchronous: prime meta with RSS-extracted data so cards render
   *  immediately with image + paywall hint. */
  function primeMetaFromRss() {
    for (const entry of entries.value) {
      if (meta.value[entry.id]) continue;
      meta.value[entry.id] = buildFromRss(entry);
    }
  }

  /** Background full enrichment for every unresolved entry — fetches the
   *  article HTML once, then updates image + isPaywall + readingTime IN
   *  PLACE only on diff. Cards stay visually stable when values match. */
  async function enrichAll() {
    const toEnrich = entries.value.filter((e) => !meta.value[e.id]?.resolved);
    const batchSize = 6;
    for (let i = 0; i < toEnrich.length; i += batchSize) {
      const batch = toEnrich.slice(i, i + batchSize);
      for (const entry of batch) {
        const m = meta.value[entry.id];
        if (m && !m.image) m.imagePending = true;
      }
      await Promise.allSettled(
        batch.map(async (entry) => {
          try {
            const fresh = await enrichEntry(entry);
            const current = meta.value[entry.id];
            if (!current) return;
            if (!current.image && fresh.image) current.image = fresh.image;
            if (current.isPaywall !== fresh.isPaywall) current.isPaywall = fresh.isPaywall;
            current.resolved = true;
          } catch {
            // skip
          }
          const m = meta.value[entry.id];
          if (m) m.imagePending = false;
        }),
      );
    }
  }

  const PAGE_SIZE = 50;
  const loadingMore = ref(false);
  const hasMore = computed(() => entries.value.length < total.value);

  /** Build the status filter sent to Miniflux based on the showRead toggle. */
  const statusFilter = computed<EntryStatus[]>(() =>
    showRead.value ? ['unread', 'read'] : ['unread'],
  );

  async function fetchEntries() {
    loading.value = true;
    try {
      const client = getClient();
      const response = await client.getEntries({
        status: statusFilter.value,
        order: 'published_at',
        direction: 'desc',
        limit: PAGE_SIZE,
        offset: 0,
        ...(activeCategory.value !== null ? { category_id: activeCategory.value } : {}),
      });
      entries.value = response.entries;
      total.value = response.total;
      primeMetaFromRss();
    } finally {
      loading.value = false;
    }
    enrichAll();
    await ensureMinimumVisible();
  }

  /** Single-shot top-up: only fire if filtering left less than half a page
   *  worth of visible cards. Otherwise we'd overshoot to ~90 systematically. */
  async function ensureMinimumVisible() {
    const threshold = Math.floor(PAGE_SIZE / 2);
    if (filteredEntries.value.length >= threshold) return;
    if (!hasMore.value || loadingMore.value || loading.value) return;
    await loadMore();
  }

  async function loadMore() {
    if (loadingMore.value || loading.value || !hasMore.value || entries.value.length === 0) {
      return;
    }
    loadingMore.value = true;
    try {
      const client = getClient();
      const response = await client.getEntries({
        status: statusFilter.value,
        order: 'published_at',
        direction: 'desc',
        limit: PAGE_SIZE,
        offset: entries.value.length,
        ...(activeCategory.value !== null ? { category_id: activeCategory.value } : {}),
      });
      const existingIds = new Set(entries.value.map((e) => e.id));
      const newEntries = response.entries.filter((e) => !existingIds.has(e.id));
      entries.value = [...entries.value, ...newEntries];
      total.value = response.total;
      primeMetaFromRss();
    } finally {
      loadingMore.value = false;
    }
    enrichAll();
  }

  async function fetchCategories() {
    const client = getClient();
    const [cats, feedList, fc] = await Promise.all([
      client.getCategories(),
      client.getFeeds(),
      client.getFeedCounters(),
    ]);
    categories.value = cats;
    feeds.value = feedList;
    counters.value = fc;
  }

  async function refreshCounters() {
    try {
      const client = getClient();
      counters.value = await client.getFeedCounters();
    } catch {
      // Non-blocking — keep previous counters
    }
  }

  function decrementUnread(feedId: number) {
    const current = counters.value.unreads[feedId] ?? 0;
    if (current > 0) {
      counters.value = {
        ...counters.value,
        unreads: { ...counters.value.unreads, [feedId]: current - 1 },
      };
    }
  }

  async function markAsRead(entryId: number) {
    const client = getClient();
    const entry = entries.value.find((e) => e.id === entryId);
    if (entry && entry.status === 'unread') decrementUnread(entry.feed_id);
    await client.updateEntryStatus([entryId], 'read');
    if (entry) entry.status = 'read';
    useOnboardingStore().recordEvent('article-read');
  }

  async function dismiss(entryId: number) {
    const entry = entries.value.find((e) => e.id === entryId);
    if (entry) {
      dismissedEntries.value = [entry, ...dismissedEntries.value];
      saveDismissedToStorage(dismissedEntries.value);
      if (entry.status === 'unread') decrementUnread(entry.feed_id);
    }
    const client = getClient();
    await client.updateEntryStatus([entryId], 'removed');
    entries.value = entries.value.filter((e) => e.id !== entryId);
    useOnboardingStore().recordEvent('bookmark-or-dismiss');
  }

  async function toggleBookmark(entryId: number) {
    const client = getClient();
    await client.toggleBookmark(entryId);
    const entry = entries.value.find((e) => e.id === entryId);
    if (entry) entry.starred = !entry.starred;
    useOnboardingStore().recordEvent('bookmark-or-dismiss');
  }

  async function fetchBookmarks() {
    loading.value = true;
    try {
      const client = getClient();
      const response = await client.getEntries({
        starred: true,
        order: 'published_at',
        direction: 'desc',
        limit: 100,
      });
      entries.value = response.entries;
      total.value = response.total;
      primeMetaFromRss();
    } finally {
      loading.value = false;
    }
    enrichAll();
  }

  /** Drop dismissed entries belonging to feeds the user no longer subscribes to. */
  function purgeDismissedFromInactiveFeeds(activeFeedIds: Set<number>) {
    if (activeFeedIds.size === 0) return;
    const before = dismissedEntries.value.length;
    dismissedEntries.value = dismissedEntries.value.filter((e) => activeFeedIds.has(e.feed_id));
    if (dismissedEntries.value.length !== before) {
      saveDismissedToStorage(dismissedEntries.value);
    }
  }

  /** Drop all dismissed entries from a specific feed (used after unsubscribe). */
  function removeDismissedByFeed(feedId: number) {
    const before = dismissedEntries.value.length;
    dismissedEntries.value = dismissedEntries.value.filter((e) => e.feed_id !== feedId);
    if (dismissedEntries.value.length !== before) {
      saveDismissedToStorage(dismissedEntries.value);
    }
  }

  function setActiveCategory(categoryId: number | null) {
    if (activeCategory.value === categoryId) return;
    activeCategory.value = categoryId;
    if (categoryId !== null) useOnboardingStore().recordEvent('category-filter-changed');
  }

  // Refetch entries whenever the active category changes or the read filter
  // toggles (both require server-side re-query).
  watch([activeCategory, showRead], () => {
    if (!loading.value || entries.value.length > 0) {
      fetchEntries();
    }
  });

  // When user toggles paywall/dedup, the visible count drops — top up.
  watch([hidePaywall, dedupEnabled], () => {
    if (entries.value.length > 0) ensureMinimumVisible();
  });

  return {
    entries,
    categories,
    activeCategory,
    loading,
    total,
    filteredEntries,
    visibleByCategory,
    feeds,
    meta,
    dismissedEntries,
    deduped,
    resolved,
    getEntryMeta,
    getEntryImage,
    loadingMore,
    hasMore,
    visibleTotal,
    unreadByCategory,
    totalUnread,
    dedupEnabled,
    toggleDedup,
    showRead,
    toggleShowRead,
    counters,
    refreshCounters,
    loadMore,
    fetchEntries,
    fetchBookmarks,
    fetchCategories,
    markAsRead,
    dismiss,
    toggleBookmark,
    setActiveCategory,
    hidePaywall,
    toggleHidePaywall,
    purgeDismissedFromInactiveFeeds,
    removeDismissedByFeed,
  };
});
