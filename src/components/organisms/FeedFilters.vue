<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import SubscriptionIconWhite from '@/components/atoms/icons/SubscriptionIconWhite.vue';
import SubscriptionIconAmber from '@/components/atoms/icons/SubscriptionIconAmber.vue';
import { useEntriesStore } from '@/stores/entries';

const { t } = useI18n();
const entriesStore = useEntriesStore();
</script>

<template>
  <div class="sticky top-14 z-30 border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-xl">
    <div class="mx-auto flex h-12 max-w-screen-2xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
      <span class="text-xs font-semibold uppercase tracking-wider text-zinc-500">{{ t('filters.label') }}</span>
      <div class="flex items-center gap-3">
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
