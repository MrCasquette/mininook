<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import AppLayout from '@/layouts/AppLayout.vue';
import AddFeedForm from '@/components/molecules/AddFeedForm.vue';
import { getClient } from '@/services/miniflux';
import { sortCategories, getDefaultCategoryId, displayCategoryTitle } from '@/utils/sortCategories';
import type { Category, Feed } from '@/types/miniflux';

const { t } = useI18n();

const feeds = ref<Feed[]>([]);
const categories = ref<Category[]>([]);
const refreshing = ref<Set<number>>(new Set());
const deleting = ref<Set<number>>(new Set());
const moving = ref<Set<number>>(new Set());
const errors = ref<Record<number, string>>({});

const subscribedUrls = computed(() => new Set(feeds.value.map((f) => f.feed_url)));

onMounted(async () => {
  await reload();
});

async function reload() {
  try {
    const [f, c] = await Promise.all([
      getClient().getFeeds(),
      getClient().getCategories(),
    ]);
    feeds.value = f;
    categories.value = c;
  } catch (e) {
    console.warn('[handle] failed to load', e);
  }
}

async function onFeedAdded() {
  // Refresh the feed list so the new entry shows up grouped properly
  try {
    feeds.value = await getClient().getFeeds();
  } catch (e) {
    console.warn('[handle] failed to reload feeds after add', e);
  }
}

const defaultCategoryId = computed(() => getDefaultCategoryId(categories.value));

function catLabel(cat: Category): string {
  return displayCategoryTitle(cat, defaultCategoryId.value, t);
}

/** Buckets keyed by category id — includes empty categories as drop targets */
const buckets = computed(() =>
  sortCategories(categories.value).map((cat) => ({
    category: cat,
    feeds: feeds.value.filter((f) => f.category.id === cat.id),
  })),
);

const draggedFeedId = ref<number | null>(null);
const dragOverCategoryId = ref<number | null>(null);

function onDragStart(feed: Feed, e: DragEvent) {
  draggedFeedId.value = feed.id;
  e.dataTransfer?.setData('text/plain', String(feed.id));
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
}

function onDragEnd() {
  draggedFeedId.value = null;
  dragOverCategoryId.value = null;
}

function onDragOver(catId: number, e: DragEvent) {
  e.preventDefault();
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
  dragOverCategoryId.value = catId;
}

function onDragLeave(catId: number) {
  if (dragOverCategoryId.value === catId) dragOverCategoryId.value = null;
}

async function onDrop(targetCatId: number) {
  const feedId = draggedFeedId.value;
  draggedFeedId.value = null;
  dragOverCategoryId.value = null;
  if (!feedId) return;
  const feed = feeds.value.find((f) => f.id === feedId);
  if (!feed || feed.category.id === targetCatId) return;

  if (moving.value.has(feed.id)) return;
  moving.value.add(feed.id);
  delete errors.value[feed.id];

  // Optimistic update
  const previousCat = feed.category;
  const newCat = categories.value.find((c) => c.id === targetCatId);
  if (newCat) feed.category = newCat;

  try {
    await getClient().updateFeed(feed.id, { category_id: targetCatId });
  } catch (err) {
    feed.category = previousCat;
    errors.value[feed.id] = err instanceof Error ? err.message : t('common.errorGeneric');
  } finally {
    moving.value.delete(feed.id);
  }
}

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
      <header class="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 class="text-2xl font-bold text-zinc-100">{{ t('handle.title') }}</h1>
          <p class="mt-2 text-sm text-zinc-500">{{ t('handle.count', { n: feeds.length }) }}</p>
        </div>
        <router-link
          :to="{ name: 'categories' }"
          data-onboard="manage-categories"
          class="shrink-0 rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-zinc-700 hover:text-zinc-100"
        >
          {{ t('handle.manageCategories') }}
        </router-link>
      </header>

      <div class="mb-8" data-onboard="add-feed">
        <AddFeedForm
          :categories="categories"
          :subscribed-urls="subscribedUrls"
          @added="onFeedAdded"
        />
      </div>

      <section
        v-for="bucket in buckets"
        :key="bucket.category.id"
        class="mb-8"
        :class="{ 'opacity-100': true }"
        @dragover="onDragOver(bucket.category.id, $event)"
        @dragleave="onDragLeave(bucket.category.id)"
        @drop="onDrop(bucket.category.id)"
      >
        <h2 class="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-400">
          {{ catLabel(bucket.category) }}
        </h2>
        <ul
          class="flex flex-col gap-2 rounded-xl p-2 transition-colors"
          :class="
            dragOverCategoryId === bucket.category.id
              ? 'bg-blue-500/10 ring-2 ring-blue-500/40'
              : 'ring-1 ring-transparent'
          "
        >
          <li
            v-if="bucket.feeds.length === 0"
            class="rounded-lg border border-dashed border-zinc-800 px-4 py-6 text-center text-xs text-zinc-600"
          >
            {{ t('handle.dropHere') }}
          </li>
          <li
            v-for="feed in bucket.feeds"
            :key="feed.id"
            draggable="true"
            class="flex cursor-grab items-center justify-between gap-3 rounded-xl border border-zinc-800/60 bg-zinc-900/50 px-4 py-3 transition-opacity active:cursor-grabbing"
            :class="{ 'opacity-40': draggedFeedId === feed.id }"
            @dragstart="onDragStart(feed, $event)"
            @dragend="onDragEnd"
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
