<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import AppLayout from '@/layouts/AppLayout.vue';
import { getClient } from '@/services/miniflux';
import type { Feed } from '@/types/miniflux';

const { t } = useI18n();

const feeds = ref<Feed[]>([]);
const refreshing = ref<Set<number>>(new Set());
const deleting = ref<Set<number>>(new Set());
const errors = ref<Record<number, string>>({});

onMounted(async () => {
  await reload();
});

async function reload() {
  try {
    feeds.value = await getClient().getFeeds();
  } catch (e) {
    console.warn('[handle] failed to load feeds', e);
  }
}

const grouped = computed(() => {
  const out: Record<string, Feed[]> = {};
  for (const f of feeds.value) {
    const cat = f.category.title;
    if (!out[cat]) out[cat] = [];
    out[cat].push(f);
  }
  return out;
});

async function refresh(feed: Feed) {
  if (refreshing.value.has(feed.id)) return;
  refreshing.value.add(feed.id);
  delete errors.value[feed.id];
  try {
    await getClient().refreshFeed(feed.id);
  } catch (e) {
    errors.value[feed.id] = e instanceof Error ? e.message : t('common.errorGeneric');
  } finally {
    refreshing.value.delete(feed.id);
  }
}

async function remove(feed: Feed) {
  if (deleting.value.has(feed.id)) return;
  if (!confirm(t('handle.deleteConfirm', { title: feed.title }))) return;
  deleting.value.add(feed.id);
  delete errors.value[feed.id];
  try {
    await getClient().deleteFeed(feed.id);
    feeds.value = feeds.value.filter((f) => f.id !== feed.id);
  } catch (e) {
    errors.value[feed.id] = e instanceof Error ? e.message : t('common.errorGeneric');
  } finally {
    deleting.value.delete(feed.id);
  }
}
</script>

<template>
  <AppLayout>
    <div class="mx-auto max-w-3xl pt-6">
      <header class="mb-8">
        <h1 class="text-2xl font-bold text-zinc-100">{{ t('handle.title') }}</h1>
        <p class="mt-2 text-sm text-zinc-500">{{ t('handle.count', { n: feeds.length }) }}</p>
      </header>

      <section
        v-for="(catFeeds, category) in grouped"
        :key="category"
        class="mb-8"
      >
        <h2 class="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-400">{{ category }}</h2>
        <ul class="flex flex-col gap-2">
          <li
            v-for="feed in catFeeds"
            :key="feed.id"
            class="flex items-center justify-between gap-3 rounded-xl border border-zinc-800/60 bg-zinc-900/50 px-4 py-3"
          >
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium text-zinc-100">{{ feed.title }}</p>
              <p class="truncate text-xs text-zinc-500">{{ feed.site_url.replace(/^https?:\/\//, '') }}</p>
              <p
                v-if="errors[feed.id]"
                class="mt-1 text-xs text-red-400"
              >
                {{ errors[feed.id] }}
              </p>
            </div>
            <div class="flex shrink-0 items-center gap-2">
              <button
                class="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200 disabled:opacity-50"
                :title="t('handle.refresh')"
                :disabled="refreshing.has(feed.id)"
                @click="refresh(feed)"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-4 w-4"
                  :class="{ 'animate-spin': refreshing.has(feed.id) }"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                  <path d="M21 3v5h-5" />
                  <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                  <path d="M8 16H3v5" />
                </svg>
              </button>
              <button
                class="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-red-950/50 hover:text-red-400 disabled:opacity-50"
                :title="t('handle.delete')"
                :disabled="deleting.has(feed.id)"
                @click="remove(feed)"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M3 6h18" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                  <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            </div>
          </li>
        </ul>
      </section>

      <div v-if="feeds.length === 0" class="pt-12 text-center">
        <p class="text-sm text-zinc-500">{{ t('handle.empty') }}</p>
        <router-link
          to="/register"
          class="mt-3 inline-block rounded-xl bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-white"
        >
          {{ t('handle.discover') }}
        </router-link>
      </div>
    </div>
  </AppLayout>
</template>
