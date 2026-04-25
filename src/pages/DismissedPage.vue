<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import AppLayout from '@/layouts/AppLayout.vue';
import EntryCard from '@/components/molecules/EntryCard.vue';
import { getClient } from '@/services/miniflux';
import { useEntriesStore } from '@/stores/entries';
import type { Entry } from '@/types/miniflux';

const { t } = useI18n();
const router = useRouter();
const entriesStore = useEntriesStore();
const dismissed = ref<Entry[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);

const feedStats = computed(() => {
  const activeIds = new Set(entriesStore.feeds.map((f) => f.id));
  const counts: Record<string, { id: number; name: string; count: number }> = {};
  for (const entry of dismissed.value) {
    // Skip feeds we've already unsubscribed from on the server
    if (activeIds.size > 0 && !activeIds.has(entry.feed_id)) continue;
    const key = String(entry.feed_id);
    if (!counts[key]) {
      counts[key] = { id: entry.feed_id, name: entry.feed.title, count: 0 };
    }
    counts[key].count++;
  }
  return Object.values(counts).sort((a, b) => b.count - a.count);
});

const unsubscribing = ref<Set<number>>(new Set());
const unsubError = ref<Record<number, string>>({});
const pendingUnsub = ref<number | null>(null);

function requestUnsubscribe(feedId: number) {
  pendingUnsub.value = feedId;
}

function cancelUnsubscribe() {
  pendingUnsub.value = null;
}

async function confirmUnsubscribe(feedId: number) {
  pendingUnsub.value = null;
  if (unsubscribing.value.has(feedId)) return;
  unsubscribing.value.add(feedId);
  delete unsubError.value[feedId];
  try {
    await getClient().deleteFeed(feedId);
    entriesStore.removeDismissedByFeed(feedId);
    dismissed.value = dismissed.value.filter((e) => e.feed_id !== feedId);
    // Refresh feeds list so the chart no longer shows this one
    try {
      await entriesStore.fetchCategories();
    } catch {
      // non-blocking
    }
  } catch (e) {
    unsubError.value[feedId] = e instanceof Error ? e.message : t('common.errorGeneric');
    console.warn('[unsubscribe] failed', e);
  } finally {
    unsubscribing.value.delete(feedId);
  }
}

const maxCount = computed(() => feedStats.value[0]?.count ?? 0);

function openArticle(entry: Entry) {
  router.push({ name: 'article', params: { id: String(entry.id) } });
}

function dismissEntry(entry: Entry) {
  entriesStore.dismiss(entry.id);
  dismissed.value = dismissed.value.filter((e) => e.id !== entry.id);
}

function bookmarkEntry(entry: Entry) {
  entriesStore.toggleBookmark(entry.id);
}


onMounted(async () => {
  if (entriesStore.feeds.length === 0) {
    try {
      await entriesStore.fetchCategories();
    } catch {
      // non-blocking
    }
  }
  // Purge localStorage of any dismissed from feeds that no longer exist
  const activeIds = new Set(entriesStore.feeds.map((f) => f.id));
  entriesStore.purgeDismissedFromInactiveFeeds(activeIds);

  try {
    const client = getClient();
    const response = await client.getEntries({
      status: 'removed',
      order: 'published_at',
      direction: 'desc',
      limit: 100,
    });
    const apiEntries = response.entries;
    const localEntries = entriesStore.dismissedEntries;
    const seen = new Set(apiEntries.map((e) => e.id));
    let merged = [...apiEntries, ...localEntries.filter((e) => !seen.has(e.id))];
    if (activeIds.size > 0) {
      merged = merged.filter((e) => activeIds.has(e.feed_id));
    }
    dismissed.value = merged;
  } catch (e) {
    let local = entriesStore.dismissedEntries;
    if (activeIds.size > 0) {
      local = local.filter((entry) => activeIds.has(entry.feed_id));
    }
    dismissed.value = local;
    if (local.length === 0) {
      error.value = e instanceof Error ? e.message : t('common.errorConnection');
    }
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <AppLayout>
    <template #header-actions>
      <span class="text-sm text-zinc-500">{{ t('dismissed.title') }}</span>
    </template>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center pt-32">
      <div class="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-zinc-300" />
    </div>

    <!-- Error -->
    <div v-else-if="error" class="flex items-center justify-center pt-32">
      <div class="rounded-2xl border border-red-900/50 bg-red-950/50 px-6 py-4 text-center">
        <p class="text-sm text-red-400">{{ error }}</p>
      </div>
    </div>

    <!-- Empty -->
    <div v-else-if="dismissed.length === 0" class="flex flex-col items-center justify-center gap-2 pt-32">
      <p class="text-lg font-medium text-zinc-400">{{ t('dismissed.empty') }}</p>
      <p class="text-sm text-zinc-600">{{ t('dismissed.emptyHint') }}</p>
    </div>

    <div v-else class="pt-6">
      <!-- Stats chart -->
      <div class="mb-8 rounded-2xl bg-zinc-900 p-5 ring-1 ring-zinc-800/50">
        <h2 class="mb-4 text-sm font-semibold text-zinc-300">{{ t('dismissed.noiseChart') }}</h2>
        <div class="flex flex-col gap-2.5">
          <div
            v-for="stat in feedStats"
            :key="stat.id"
            class="flex flex-col gap-1"
          >
            <div class="flex items-center gap-3">
            <span class="w-32 shrink-0 truncate text-right text-xs text-zinc-400 sm:w-40">{{ stat.name }}</span>
            <div class="relative h-6 flex-1 overflow-hidden rounded-md bg-zinc-800">
              <div
                class="absolute inset-y-0 left-0 rounded-md transition-all duration-500"
                :style="{
                  width: `${(stat.count / maxCount) * 100}%`,
                  background: stat.count === maxCount
                    ? 'linear-gradient(90deg, #ef4444, #f87171)'
                    : stat.count >= maxCount * 0.6
                      ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
                      : 'linear-gradient(90deg, #3b82f6, #60a5fa)',
                }"
              />
              <span class="relative z-10 flex h-full items-center px-2 text-xs font-semibold text-white">
                {{ stat.count }}
              </span>
            </div>
            <template v-if="pendingUnsub === stat.id">
              <button
                class="shrink-0 rounded-lg bg-red-600 px-2 py-1 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-50"
                :disabled="unsubscribing.has(stat.id)"
                @click="confirmUnsubscribe(stat.id)"
              >
                {{ t('common.confirm') }}
              </button>
              <button
                class="shrink-0 rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
                @click="cancelUnsubscribe"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                </svg>
              </button>
            </template>
            <button
              v-else
              class="shrink-0 rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-red-950/50 hover:text-red-400 disabled:opacity-50"
              :title="t('dismissed.unsubscribeFrom', { name: stat.name })"
              :disabled="unsubscribing.has(stat.id)"
              @click="requestUnsubscribe(stat.id)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 6h18" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
            </div>
            <p
              v-if="unsubError[stat.id]"
              class="ml-[8.5rem] text-xs text-red-400 sm:ml-[10.5rem]"
            >
              {{ unsubError[stat.id] }}
            </p>
          </div>
        </div>
      </div>

      <!-- Dismissed entries grid -->
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        <EntryCard
          v-for="entry in dismissed"
          :key="entry.id"
          :entry="entry"
          @open="openArticle"
          @dismiss="dismissEntry"
          @bookmark="bookmarkEntry"
        />
      </div>
    </div>
  </AppLayout>
</template>
