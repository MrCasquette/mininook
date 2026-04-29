<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useEntriesStore } from '@/stores/entries';

const { t } = useI18n();
const store = useEntriesStore();

/**
 * Counters reflect the current server-side filters (status / date / category).
 * They DO NOT reflect dedup or paywall — those are client-only client-side
 * filters and the visible feed will diverge slightly when they're enabled.
 */
const tabs = computed(() => {
  const all = {
    id: null,
    label: t('bottomNav.all'),
    count: store.filteredTotal ?? 0,
  };
  const cats = store.categories
    .filter((cat) => !/^(all|tous|tout)$/i.test(cat.title.trim()))
    .map((cat) => ({
      id: cat.id,
      label: cat.title,
      count: store.filteredCountsByCategory?.[cat.id] ?? 0,
    }));
  return [all, ...cats];
});

function selectCategory(id: number | null) {
  store.setActiveCategory(id);
}
</script>

<template>
  <nav data-onboard="bottom-nav" class="fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-800/50 bg-zinc-950/90 backdrop-blur-xl">
    <div class="mx-auto max-w-screen-2xl">
      <div class="flex items-center gap-1 overflow-x-auto px-2 py-2 scrollbar-none sm:justify-center sm:gap-2">
        <button
          v-for="tab in tabs"
          :key="tab.id ?? 'all'"
          :class="[
            'flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
            store.activeCategory === tab.id
              ? 'bg-zinc-100 text-zinc-900'
              : 'text-zinc-400 hover:text-zinc-200',
          ]"
          @click="selectCategory(tab.id)"
        >
          <span>{{ tab.label }}</span>
          <span
            v-if="tab.count > 0"
            :class="[
              'min-w-5 rounded-full px-1.5 py-0.5 text-center text-xs font-semibold',
              store.activeCategory === tab.id
                ? 'bg-zinc-900 text-zinc-100'
                : 'bg-zinc-800 text-zinc-400',
            ]"
          >
            {{ tab.count }}
          </span>
        </button>
      </div>
    </div>
  </nav>
</template>
