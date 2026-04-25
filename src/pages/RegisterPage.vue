<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import AppLayout from '@/layouts/AppLayout.vue';
import { getClient } from '@/services/miniflux';
import featuredFeeds from '@/data/featured-feeds.json';
import type { Category } from '@/types/miniflux';

const { t } = useI18n();

interface FeaturedFeed {
  title: string;
  url: string;
  siteUrl: string;
  category: string;
}

const categories = ref<Category[]>([]);
const subscribedUrls = ref<Set<string>>(new Set());
const subscribing = ref<Set<string>>(new Set());
const errors = ref<Record<string, string>>({});

onMounted(async () => {
  try {
    const client = getClient();
    const [cats, feeds] = await Promise.all([
      client.getCategories(),
      client.getFeeds(),
    ]);
    categories.value = cats;
    subscribedUrls.value = new Set(feeds.map((f) => f.feed_url));
  } catch (e) {
    console.warn('[register] init failed', e);
  }
});

const groups = computed(() => {
  const out: Record<string, FeaturedFeed[]> = {};
  for (const feed of featuredFeeds as FeaturedFeed[]) {
    if (!out[feed.category]) out[feed.category] = [];
    out[feed.category].push(feed);
  }
  return out;
});

async function subscribe(feed: FeaturedFeed) {
  if (subscribing.value.has(feed.url)) return;
  subscribing.value.add(feed.url);
  delete errors.value[feed.url];
  try {
    const client = getClient();
    let category = categories.value.find(
      (c) => c.title.toLowerCase() === feed.category.toLowerCase(),
    );
    if (!category) {
      category = await client.createCategory(feed.category);
      categories.value.push(category);
    }
    await client.createFeed(feed.url, category.id);
    subscribedUrls.value.add(feed.url);
  } catch (e) {
    errors.value[feed.url] = e instanceof Error ? e.message : t('common.errorUnknown');
  } finally {
    subscribing.value.delete(feed.url);
  }
}
</script>

<template>
  <AppLayout>
    <div class="mx-auto max-w-3xl pt-6">
      <header class="mb-8">
        <h1 class="text-2xl font-bold text-zinc-100">{{ t('register.title') }}</h1>
        <p class="mt-2 text-sm text-zinc-500">{{ t('register.subtitle') }}</p>
      </header>

      <section
        v-for="(feeds, category) in groups"
        :key="category"
        class="mb-8"
      >
        <h2 class="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-400">{{ category }}</h2>
        <ul class="flex flex-col gap-2">
          <li
            v-for="feed in feeds"
            :key="feed.url"
            class="flex items-center justify-between gap-3 rounded-xl border border-zinc-800/60 bg-zinc-900/50 px-4 py-3"
          >
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium text-zinc-100">{{ feed.title }}</p>
              <p class="truncate text-xs text-zinc-500">{{ feed.siteUrl.replace(/^https?:\/\//, '') }}</p>
              <p
                v-if="errors[feed.url]"
                class="mt-1 text-xs text-red-400"
              >
                {{ errors[feed.url] }}
              </p>
            </div>
            <button
              v-if="subscribedUrls.has(feed.url)"
              class="shrink-0 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-500"
              disabled
            >
              {{ t('register.subscribed') }}
            </button>
            <button
              v-else-if="subscribing.has(feed.url)"
              class="shrink-0 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-400"
              disabled
            >
              {{ t('register.subscribing') }}
            </button>
            <button
              v-else
              class="shrink-0 rounded-lg bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-900 transition hover:bg-white"
              @click="subscribe(feed)"
            >
              {{ t('register.subscribe') }}
            </button>
          </li>
        </ul>
      </section>
    </div>
  </AppLayout>
</template>
