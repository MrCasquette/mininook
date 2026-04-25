<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useEntriesStore } from '@/stores/entries';

const { t } = useI18n();
const store = useEntriesStore();

const tabs = computed(() => {
  const isAllActive = store.activeCategory === null;
  const all = {
    id: null,
    label: t('bottomNav.all'),
    count: isAllActive ? store.visibleTotal : store.totalUnread,
    suffix: isAllActive && store.hasMore ? '+' : '',
  };
  const cats = store.categories
    .filter((cat) => !/^(all|tous|tout)$/i.test(cat.title.trim()))
    .map((cat) => {
      const isActive = store.activeCategory === cat.id;
      return {
        id: cat.id,
        label: cat.title,
        count: isActive ? store.visibleTotal : store.unreadByCategory[cat.id] || 0,
        suffix: isActive && store.hasMore ? '+' : '',
      };
    });
  return [all, ...cats];
});

function selectCategory(id: number | null) {
  store.setActiveCategory(id);
}
</script>

<template>
  <nav class="fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-800/50 bg-zinc-950/90 backdrop-blur-xl">
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
            {{ tab.count }}{{ tab.suffix }}
          </span>
        </button>
      </div>
    </div>
  </nav>
</template>
