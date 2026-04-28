<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import SubscriptionIconWhite from '@/components/atoms/icons/SubscriptionIconWhite.vue';
import SubscriptionIconAmber from '@/components/atoms/icons/SubscriptionIconAmber.vue';
import { useEntriesStore } from '@/stores/entries';

const { t } = useI18n();
const entriesStore = useEntriesStore();
</script>

<template>
  <div data-onboard="feed-filters" class="sticky top-14 z-30 border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-xl">
    <div class="mx-auto flex h-12 max-w-screen-2xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
      <span class="text-xs font-semibold uppercase tracking-wider text-zinc-500">{{ t('filters.label') }}</span>
      <div class="flex items-center gap-3">
        <button
          :class="[
            'rounded-lg p-2 transition-colors hover:bg-zinc-800',
            entriesStore.showRead ? 'text-emerald-400' : 'text-zinc-400 hover:text-zinc-200',
          ]"
          :title="entriesStore.showRead ? t('filters.showReadOff') : t('filters.showReadOn')"
          @click="entriesStore.toggleShowRead"
        >
          <svg
            v-if="entriesStore.showRead"
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          <svg
            v-else
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
            <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
            <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
            <line x1="2" y1="2" x2="22" y2="22" />
          </svg>
        </button>
        <button
          class="h-9 w-9 overflow-hidden rounded-lg transition-transform hover:scale-105"
          :title="entriesStore.hidePaywall ? t('filters.paywallShow') : t('filters.paywallHide')"
          @click="entriesStore.toggleHidePaywall"
        >
          <SubscriptionIconAmber v-if="entriesStore.hidePaywall" class="h-full w-full" />
          <SubscriptionIconWhite v-else class="h-full w-full" />
        </button>
        <button
          :class="[
            'rounded-lg p-2 transition-colors hover:bg-zinc-800',
            entriesStore.dedupEnabled ? 'text-blue-400' : 'text-zinc-400 hover:text-zinc-200',
          ]"
          :title="entriesStore.dedupEnabled ? t('filters.dedupOff') : t('filters.dedupOn')"
          @click="entriesStore.toggleDedup"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="12 2 2 7 12 12 22 7 12 2" />
            <polyline points="2 17 12 22 22 17" />
            <polyline points="2 12 12 17 22 12" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>
