<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import AppLayout from '@/layouts/AppLayout.vue';
import { getClient } from '@/services/miniflux';
import { sortCategories, getDefaultCategoryId, displayCategoryTitle } from '@/utils/sortCategories';
import { useOnboardingStore } from '@/stores/onboarding';
import featuredFeeds from '@/data/featured-feeds.json';
import type { Category } from '@/types/miniflux';

const { t } = useI18n();
const onboardingStore = useOnboardingStore();

interface FeaturedFeed {
  title: string;
  url: string;
  siteUrl: string;
  category?: string;
}

const NO_PREF = '__no_pref__';

const categories = ref<Category[]>([]);
const subscribedUrls = ref<Set<string>>(new Set());
const subscribing = ref<Set<string>>(new Set());
const errors = ref<Record<string, string>>({});

/** Per-feed picker state — which feed is currently revealing its category select */
const pickerOpen = ref<string | null>(null);
const pickerSelection = ref<Record<string, string>>({});

const sortedCategories = computed(() => sortCategories(categories.value));
const defaultCategoryId = computed(() => getDefaultCategoryId(categories.value));

function catLabel(cat: Category): string {
  return displayCategoryTitle(cat, defaultCategoryId.value, t);
}

const flatFeeds = computed<FeaturedFeed[]>(() => featuredFeeds as FeaturedFeed[]);

onMounted(async () => {
  try {
    const client = getClient();
    const [cats, feeds] = await Promise.all([client.getCategories(), client.getFeeds()]);
    categories.value = cats;
    subscribedUrls.value = new Set(feeds.map((f) => f.feed_url));
  } catch (e) {
    console.warn('[register] init failed', e);
  }
});

function openPicker(feed: FeaturedFeed) {
  pickerOpen.value = feed.url;
  if (!pickerSelection.value[feed.url]) pickerSelection.value[feed.url] = NO_PREF;
}

function cancelPicker() {
  pickerOpen.value = null;
}

async function subscribe(feed: FeaturedFeed) {
  if (subscribing.value.has(feed.url)) return;

  const choice = pickerSelection.value[feed.url] ?? NO_PREF;
  let categoryId: number;
  if (choice === NO_PREF) {
    if (defaultCategoryId.value === null) {
      errors.value[feed.url] = t('common.errorGeneric');
      return;
    }
    categoryId = defaultCategoryId.value;
  } else {
    categoryId = Number(choice);
    if (!Number.isFinite(categoryId)) {
      errors.value[feed.url] = t('common.errorGeneric');
      return;
    }
  }

  pickerOpen.value = null;
  subscribing.value.add(feed.url);
  delete errors.value[feed.url];
  try {
    await getClient().createFeed(feed.url, categoryId);
    subscribedUrls.value.add(feed.url);
    onboardingStore.recordEvent('feed-added');
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

      <ul class="flex flex-col gap-2">
        <li
          v-for="feed in flatFeeds"
          :key="feed.url"
          class="rounded-xl border border-zinc-800/60 bg-zinc-900/50 px-4 py-3"
        >
          <div class="flex items-center justify-between gap-3">
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium text-zinc-100">{{ feed.title }}</p>
              <p class="truncate text-xs text-zinc-500">
                {{ feed.siteUrl.replace(/^https?:\/\//, '') }}
              </p>
              <p v-if="errors[feed.url]" class="mt-1 text-xs text-red-400">
                {{ errors[feed.url] }}
              </p>
            </div>

            <!-- Subscribed -->
            <button
              v-if="subscribedUrls.has(feed.url)"
              class="shrink-0 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-500"
              disabled
            >
              {{ t('register.subscribed') }}
            </button>

            <!-- Subscribing -->
            <button
              v-else-if="subscribing.has(feed.url)"
              class="shrink-0 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-400"
              disabled
            >
              {{ t('register.subscribing') }}
            </button>

            <!-- Picker open -->
            <div v-else-if="pickerOpen === feed.url" class="flex shrink-0 items-center gap-2">
              <select
                v-model="pickerSelection[feed.url]"
                :title="t('register.pickCategory')"
                class="max-w-[10rem] rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs text-zinc-300 outline-none ring-zinc-700 transition focus:ring-2"
              >
                <option :value="NO_PREF">{{ t('register.noPreference') }}</option>
                <option v-for="cat in sortedCategories" :key="cat.id" :value="String(cat.id)">
                  {{ catLabel(cat) }}
                </option>
              </select>
              <button
                class="shrink-0 rounded-md bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-900 hover:bg-white"
                @click="subscribe(feed)"
              >
                {{ t('register.confirm') }}
              </button>
              <button
                class="shrink-0 rounded-md p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
                :title="t('common.cancel')"
                @click="cancelPicker"
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
                  <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                </svg>
              </button>
            </div>

            <!-- Add (initial) -->
            <button
              v-else
              class="shrink-0 rounded-lg bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-900 transition hover:bg-white"
              @click="openPicker(feed)"
            >
              {{ t('register.subscribe') }}
            </button>
          </div>
        </li>
      </ul>
    </div>
  </AppLayout>
</template>
