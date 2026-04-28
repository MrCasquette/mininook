<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { getClient } from '@/services/miniflux';
import { sortCategories, getDefaultCategoryId, displayCategoryTitle } from '@/utils/sortCategories';
import { useOnboardingStore } from '@/stores/onboarding';
import type { Category, DiscoveredFeed } from '@/types/miniflux';

const props = defineProps<{
  categories: Category[];
  subscribedUrls: Set<string>;
}>();

const emit = defineEmits<{
  added: [feed: { feedId: number; categoryId: number }];
}>();

const { t } = useI18n();
const onboardingStore = useOnboardingStore();

const sortedCategories = computed(() => sortCategories(props.categories));
const defaultCategoryId = computed(() => getDefaultCategoryId(props.categories));

function catLabel(cat: Category): string {
  return displayCategoryTitle(cat, defaultCategoryId.value, t);
}

const url = ref('');
const selectedCategoryId = ref<string>('');
const submitting = ref(false);
const discovering = ref(false);
const error = ref<string | null>(null);
const success = ref(false);
const candidates = ref<DiscoveredFeed[]>([]);

function reset() {
  url.value = '';
  candidates.value = [];
  error.value = null;
}

function pickCategoryId(): number {
  const id = Number(selectedCategoryId.value);
  if (!Number.isFinite(id) || id <= 0) {
    throw new Error(t('handle.addCategoryLabel'));
  }
  return id;
}

async function addByUrl(feedUrl: string, categoryId: number) {
  if (props.subscribedUrls.has(feedUrl)) {
    error.value = t('handle.addAlreadySubscribed');
    return;
  }
  const { feed_id } = await getClient().createFeed(feedUrl, categoryId);
  emit('added', { feedId: feed_id, categoryId });
  onboardingStore.recordEvent('feed-added');
  success.value = true;
  setTimeout(() => (success.value = false), 2500);
  reset();
}

async function submit() {
  error.value = null;
  success.value = false;

  let raw = url.value.trim();
  if (!raw) return;
  if (!/^https?:\/\//i.test(raw)) raw = `https://${raw}`;

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    error.value = t('handle.addInvalidUrl');
    return;
  }

  submitting.value = true;
  try {
    const categoryId = pickCategoryId();

    discovering.value = true;
    let feeds: DiscoveredFeed[] = [];
    try {
      feeds = await getClient().discoverFeeds(parsed.toString());
    } catch {
      feeds = [];
    }
    discovering.value = false;

    if (feeds.length === 0) {
      error.value = t('handle.addNotFound');
    } else if (feeds.length === 1) {
      await addByUrl(feeds[0].url, categoryId);
    } else {
      candidates.value = feeds;
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : t('common.errorGeneric');
  } finally {
    submitting.value = false;
    discovering.value = false;
  }
}

async function pickCandidate(candidate: DiscoveredFeed) {
  error.value = null;
  submitting.value = true;
  try {
    const categoryId = pickCategoryId();
    await addByUrl(candidate.url, categoryId);
  } catch (e) {
    error.value = e instanceof Error ? e.message : t('common.errorGeneric');
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <section class="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 ring-1 ring-zinc-800/40">
    <h2 class="text-sm font-medium text-zinc-200">{{ t('handle.addTitle') }}</h2>

    <form class="mt-4 flex flex-col gap-3" @submit.prevent="submit">
      <input
        v-model="url"
        type="text"
        :placeholder="t('handle.addUrlPlaceholder')"
        autocomplete="url"
        class="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 outline-none ring-zinc-700 transition focus:ring-2"
      />

      <label class="flex flex-col gap-1">
        <span class="text-xs font-medium text-zinc-500">
          {{ t('handle.addCategoryLabel') }}
        </span>
        <select
          v-model="selectedCategoryId"
          class="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-100 outline-none ring-zinc-700 transition focus:ring-2"
          required
        >
          <option value="" disabled>—</option>
          <option v-for="cat in sortedCategories" :key="cat.id" :value="String(cat.id)">
            {{ catLabel(cat) }}
          </option>
        </select>
      </label>

      <p v-if="discovering" class="text-xs text-zinc-500">
        {{ t('handle.addDiscovering') }}
      </p>

      <p
        v-if="error"
        class="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300"
      >
        {{ error }}
      </p>

      <p
        v-if="success"
        class="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300"
      >
        {{ t('handle.addSuccess') }}
      </p>

      <div v-if="candidates.length > 1" class="flex flex-col gap-2 rounded-xl border border-zinc-800 bg-zinc-950 p-3">
        <p class="text-xs text-zinc-400">{{ t('handle.addPickFeed') }}</p>
        <ul class="flex flex-col gap-1">
          <li
            v-for="cand in candidates"
            :key="cand.url"
            class="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 hover:bg-zinc-900"
          >
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm text-zinc-200">{{ cand.title || cand.url }}</p>
              <p class="truncate text-[11px] text-zinc-500">{{ cand.url }}</p>
            </div>
            <button
              type="button"
              class="shrink-0 rounded-md bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-900 hover:bg-white"
              :disabled="submitting"
              @click="pickCandidate(cand)"
            >
              {{ t('handle.addSubmit') }}
            </button>
          </li>
        </ul>
      </div>

      <button
        v-if="candidates.length <= 1"
        type="submit"
        :disabled="submitting || !url.trim() || !selectedCategoryId"
        class="self-end rounded-xl bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-900 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {{ submitting ? t('handle.addSubmitting') : t('handle.addSubmit') }}
      </button>
    </form>
  </section>
</template>
