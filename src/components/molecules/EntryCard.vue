<script setup lang="ts">
import { computed, ref, toRef } from 'vue';
import { useI18n } from 'vue-i18n';
import type { Entry } from '@/types/miniflux';
import { useEntriesStore } from '@/stores/entries';
import { detectPaywall } from '@/utils/detectPaywall';
import { useImageSrc } from '@/composables/useImageSrc';

const { t, locale } = useI18n();

const props = withDefaults(defineProps<{
  entry: Entry;
  duplicates?: Entry[];
}>(), {
  duplicates: () => [],
});

const emit = defineEmits<{
  open: [entry: Entry];
  dismiss: [entry: Entry];
  bookmark: [entry: Entry];
}>();

const store = useEntriesStore();
const rawImageUrl = computed(() => store.getEntryImage(props.entry.id));
const entryUrl = toRef(() => props.entry.url);
const { src: imageUrl, pending: proxyPending } = useImageSrc(rawImageUrl, entryUrl);
const imageBroken = ref(false);

const publishedDate = computed(() => {
  const date = new Date(props.entry.published_at);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return t('entryCard.justNow');
  if (hours < 24) return t('entryCard.hoursAgo', { n: hours });
  const days = Math.floor(hours / 24);
  if (days < 7) return t('entryCard.daysAgo', { n: days });
  return date.toLocaleDateString(locale.value, { day: 'numeric', month: 'short' });
});

const entryMeta = computed(() => store.getEntryMeta(props.entry.id));
const isImageLoading = computed(
  () =>
    !imageUrl.value && (proxyPending.value || (entryMeta.value?.imagePending ?? false)),
);

const readingTime = computed(() => {
  const time = entryMeta.value?.readingTime ?? props.entry.reading_time;
  if (time <= 0) return null;
  return t('entryCard.minutes', { n: time });
});

const isPaywall = computed(() => {
  // Use enriched meta if available, otherwise detect from RSS content
  if (entryMeta.value?.resolved) return entryMeta.value.isPaywall;
  return detectPaywall(props.entry.content).isPaywalled;
});

const feedInitial = computed(() => props.entry.feed.title.charAt(0).toUpperCase());

const placeholderGradient = computed(() => {
  let hash = 0;
  for (const char of props.entry.feed.title) {
    hash = char.charCodeAt(0) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  return `linear-gradient(135deg, hsl(${h}, 40%, 20%), hsl(${(h + 40) % 360}, 30%, 12%))`;
});
</script>

<template>
  <article
    class="group flex cursor-pointer flex-col overflow-hidden rounded-2xl bg-zinc-900 ring-1 ring-zinc-800/50 transition-all hover:ring-zinc-700/50 hover:shadow-lg hover:shadow-zinc-900/50"
    @click="emit('open', entry)"
  >
    <!-- Image -->
    <div class="relative aspect-video w-full shrink-0 overflow-hidden bg-zinc-800">
      <img
        v-if="imageUrl && !imageBroken"
        :src="imageUrl"
        :alt="entry.title"
        class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        loading="lazy"
        @error="imageBroken = true"
      />
      <div
        v-else-if="isImageLoading"
        class="flex h-full w-full items-center justify-center"
        :style="{ background: placeholderGradient }"
      >
        <div class="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white/60" />
      </div>
      <div
        v-else
        class="flex h-full w-full items-center justify-center"
        :style="{ background: placeholderGradient }"
      >
        <span class="px-6 text-center text-lg font-semibold text-white/25">{{ entry.feed.title }}</span>
      </div>
      <span
        v-if="isPaywall"
        class="absolute top-2 right-2 rounded-full bg-amber-500/90 px-2 py-0.5 text-xs font-semibold text-zinc-900 backdrop-blur-sm"
      >
        {{ t('entryCard.paywall') }}
      </span>
    </div>

    <!-- Title + meta -->
    <div class="flex flex-1 flex-col gap-2 p-4">
      <h2 class="line-clamp-2 h-12 text-base font-semibold leading-snug text-zinc-100 sm:text-lg sm:leading-snug">
        {{ entry.title }}
      </h2>

      <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
        <span class="flex items-center gap-1">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
          </svg>
          {{ publishedDate }}
        </span>
        <span v-if="readingTime" class="flex items-center gap-1">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20" />
          </svg>
          {{ readingTime }}
        </span>
      </div>
    </div>

    <!-- Bottom bar -->
    <div class="flex items-center justify-between border-t border-zinc-800/50 px-4 py-2">
      <div class="flex min-w-0 items-center gap-1.5">
        <span class="truncate text-xs font-medium text-zinc-400">{{ entry.feed.title }}</span>
        <span
          v-if="duplicates.length > 0"
          class="shrink-0 rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-500"
          :title="duplicates.map(d => d.feed.title).join(', ')"
        >
          {{ t('entryCard.duplicates', { n: duplicates.length }) }}
        </span>
      </div>

      <div class="flex shrink-0 items-center gap-1">
        <button
          class="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
          :title="t('entryCard.notInterested')"
          @click.stop="emit('dismiss', entry)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 6 6 18" /><path d="m6 6 12 12" />
          </svg>
        </button>

        <button
          :class="[
            'rounded-lg p-1.5 transition-colors hover:bg-zinc-800',
            entry.starred ? 'text-amber-400' : 'text-zinc-500 hover:text-zinc-300',
          ]"
          :title="t('entryCard.bookmark')"
          @click.stop="emit('bookmark', entry)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" :fill="entry.starred ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
          </svg>
        </button>
      </div>
    </div>
  </article>
</template>
