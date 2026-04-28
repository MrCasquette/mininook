<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import AppLayout from '@/layouts/AppLayout.vue';
import EntryCard from '@/components/molecules/EntryCard.vue';
import { useEntriesStore } from '@/stores/entries';
import { useInfiniteScroll } from '@/composables/useInfiniteScroll';
import type { Entry } from '@/types/miniflux';

const { t } = useI18n();
const router = useRouter();
const entriesStore = useEntriesStore();
const error = ref<string | null>(null);

function openArticle(entry: Entry) {
  router.push({ name: 'article', params: { id: String(entry.id) } });
}
function dismissEntry(entry: Entry) {
  entriesStore.dismiss(entry.id);
}
function bookmarkEntry(entry: Entry) {
  entriesStore.toggleBookmark(entry.id);
}

// Responsive column count (matches Tailwind breakpoints)
const colCount = ref(1);
function updateCols() {
  const w = window.innerWidth;
  if (w >= 1536) colCount.value = 4;
  else if (w >= 1024) colCount.value = 3;
  else if (w >= 640) colCount.value = 2;
  else colCount.value = 1;
}

const gridStyle = computed(() => ({
  display: 'grid',
  gridTemplateColumns: `repeat(${colCount.value}, minmax(0, 1fr))`,
  gap: '1rem',
}));

const { sentinel: parentRef } = useInfiniteScroll({
  onLoad: () => entriesStore.loadMore(),
});

onMounted(async () => {
  updateCols();
  window.addEventListener('resize', updateCols);
  try {
    await Promise.all([entriesStore.fetchEntries(), entriesStore.fetchCategories()]);
  } catch (e) {
    error.value = e instanceof Error ? e.message : t('common.errorConnection');
  }
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateCols);
});
</script>

<template>
  <AppLayout>
    <!-- Error -->
    <div v-if="error" class="flex items-center justify-center pt-32">
      <div class="rounded-2xl border border-red-900/50 bg-red-950/50 px-6 py-4 text-center">
        <p class="text-sm text-red-400">{{ error }}</p>
        <button
          class="mt-3 text-sm text-zinc-400 underline hover:text-zinc-200"
          @click="error = null; entriesStore.fetchEntries()"
        >
          {{ t('common.retry') }}
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-else-if="entriesStore.loading && entriesStore.filteredEntries.length === 0" class="flex items-center justify-center pt-32">
      <div class="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-zinc-300" />
    </div>

    <!-- Empty: no feeds -->
    <div
      v-else-if="entriesStore.feeds.length === 0"
      class="flex flex-col items-center justify-center gap-4 pt-32"
    >
      <div class="text-center">
        <p class="text-lg font-medium text-zinc-200">{{ t('feed.emptyNoFeeds') }}</p>
        <p class="mt-1 text-sm text-zinc-500">{{ t('feed.emptyNoFeedsHint') }}</p>
      </div>
      <router-link
        to="/register"
        class="rounded-xl bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-900 transition hover:bg-white"
      >
        {{ t('feed.emptyNoFeedsCta') }}
      </router-link>
    </div>

    <!-- Empty: nothing to read -->
    <div
      v-else-if="entriesStore.filteredEntries.length === 0"
      class="flex flex-col items-center justify-center gap-2 pt-32"
    >
      <p class="text-lg font-medium text-zinc-400">{{ t('feed.emptyAllRead') }}</p>
      <p class="text-sm text-zinc-600">{{ t('feed.emptyAllReadHint') }}</p>
    </div>

    <!-- Plain grid (debug: virtualization disabled) -->
    <template v-else>
      <div data-onboard="feed-grid" :style="gridStyle" class="pt-6">
        <EntryCard
          v-for="(dedup, idx) in entriesStore.filteredEntries"
          :key="dedup.entry.id"
          :entry="dedup.entry"
          :duplicates="dedup.duplicates"
          :data-onboard="idx === 0 ? 'card-first' : null"
          @open="openArticle"
          @dismiss="dismissEntry"
          @bookmark="bookmarkEntry"
        />
      </div>
      <div ref="parentRef" class="flex h-20 items-center justify-center">
        <div
          v-if="entriesStore.loadingMore"
          class="h-6 w-6 animate-spin rounded-full border-2 border-zinc-700 border-t-zinc-300"
        />
        <p
          v-else-if="!entriesStore.hasMore"
          class="text-xs text-zinc-600"
        >
          {{ t('feed.endOfFeed') }}
        </p>
      </div>
    </template>
  </AppLayout>
</template>
