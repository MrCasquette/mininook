<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import PaywallIcon from '@/components/atoms/icons/PaywallIcon.vue';
import { useEntriesStore } from '@/stores/entries';
import { sortCategories, getDefaultCategoryId, displayCategoryTitle } from '@/utils/sortCategories';
import type { DateRange } from '@/stores/entries';
import type { Feed } from '@/types/miniflux';

const { t } = useI18n();
const entriesStore = useEntriesStore();

const expanded = ref(false);

const hasAdvancedFilter = computed(
  () => entriesStore.dateRange !== 'all' || entriesStore.feedFilter !== null,
);

const defaultCategoryId = computed(() =>
  getDefaultCategoryId(entriesStore.categories),
);

/**
 * Feeds available in the dropdown, scoped to the active category.
 *  - No active category: all feeds, grouped by category via <optgroup>.
 *  - Active category: only that category's feeds, flat list (no group).
 * The feed filter is meant as a sub-filter inside the current category.
 */
const feedsByCategory = computed(() => {
  const groups: Array<{ id: number; title: string; feeds: Feed[] }> = [];
  const cats = entriesStore.activeCategory !== null
    ? entriesStore.categories.filter((c) => c.id === entriesStore.activeCategory)
    : sortCategories(entriesStore.categories);
  for (const cat of cats) {
    const matching = entriesStore.feeds
      .filter((f) => f.category.id === cat.id)
      .sort((a, b) => a.title.localeCompare(b.title));
    if (matching.length === 0) continue;
    groups.push({
      id: cat.id,
      title: displayCategoryTitle(cat, defaultCategoryId.value, t),
      feeds: matching,
    });
  }
  return groups;
});

const showOptGroups = computed(() => entriesStore.activeCategory === null);

function toggleExpanded() {
  expanded.value = !expanded.value;
}

function onDateChange(e: Event) {
  entriesStore.setDateRange((e.target as HTMLSelectElement).value as DateRange);
}

function onFeedChange(e: Event) {
  const v = (e.target as HTMLSelectElement).value;
  entriesStore.setFeedFilter(v === '' ? null : Number(v));
}
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
          v-tooltip="entriesStore.showRead ? t('filters.showReadOff') : t('filters.showReadOn')"
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
          :class="[
            'rounded-lg p-2 transition-colors hover:bg-zinc-800',
            entriesStore.hidePaywall ? 'text-red-400' : 'text-amber-400',
          ]"
          v-tooltip="entriesStore.hidePaywall ? t('filters.paywallShow') : t('filters.paywallHide')"
          @click="entriesStore.toggleHidePaywall"
        >
          <PaywallIcon :barred="entriesStore.hidePaywall" class="h-5 w-5" />
        </button>
        <button
          :class="[
            'rounded-lg p-2 transition-colors hover:bg-zinc-800',
            entriesStore.dedupEnabled ? 'text-blue-400' : 'text-zinc-400 hover:text-zinc-200',
          ]"
          v-tooltip="entriesStore.dedupEnabled ? t('filters.dedupOff') : t('filters.dedupOn')"
          @click="entriesStore.toggleDedup"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="12 2 2 7 12 12 22 7 12 2" />
            <polyline points="2 17 12 22 22 17" />
            <polyline points="2 12 12 17 22 12" />
          </svg>
        </button>
        <button
          :class="[
            'relative rounded-lg p-2 transition-colors hover:bg-zinc-800',
            expanded || hasAdvancedFilter ? 'text-zinc-100' : 'text-zinc-400 hover:text-zinc-200',
          ]"
          v-tooltip="expanded ? t('filters.moreHide') : t('filters.moreShow')"
          :aria-expanded="expanded"
          @click="toggleExpanded"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5 transition-transform"
            :class="expanded ? 'rotate-180' : ''"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
          <span
            v-if="hasAdvancedFilter"
            class="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-blue-400 ring-2 ring-zinc-950"
          />
        </button>
      </div>
    </div>

    <Transition
      enter-active-class="overflow-hidden transition-all duration-200 ease-out"
      enter-from-class="max-h-0 opacity-0"
      enter-to-class="max-h-72 opacity-100"
      leave-active-class="overflow-hidden transition-all duration-150 ease-in"
      leave-from-class="max-h-72 opacity-100"
      leave-to-class="max-h-0 opacity-0"
    >
      <div v-if="expanded" class="border-t border-zinc-800/50">
        <div class="mx-auto flex max-w-screen-2xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-end sm:justify-end sm:px-6 lg:px-8">
          <label class="flex flex-col gap-1">
            <span class="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
              {{ t('filters.date') }}
            </span>
            <select
              :value="entriesStore.dateRange"
              class="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm text-zinc-100 outline-none ring-zinc-700 transition focus:ring-2"
              @change="onDateChange"
            >
              <option value="all">{{ t('filters.dateAll') }}</option>
              <option value="today">{{ t('filters.dateToday') }}</option>
              <option value="week">{{ t('filters.dateWeek') }}</option>
              <option value="month">{{ t('filters.dateMonth') }}</option>
            </select>
          </label>

          <label class="flex flex-col gap-1">
            <span class="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
              {{ t('filters.feed') }}
            </span>
            <select
              :value="entriesStore.feedFilter ?? ''"
              class="max-w-[14rem] rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm text-zinc-100 outline-none ring-zinc-700 transition focus:ring-2"
              @change="onFeedChange"
            >
              <option value="">{{ t('filters.feedAll') }}</option>
              <template v-if="showOptGroups">
                <optgroup
                  v-for="group in feedsByCategory"
                  :key="group.id"
                  :label="group.title"
                >
                  <option
                    v-for="feed in group.feeds"
                    :key="feed.id"
                    :value="String(feed.id)"
                  >
                    {{ feed.title }}
                  </option>
                </optgroup>
              </template>
              <template v-else>
                <option
                  v-for="feed in feedsByCategory[0]?.feeds ?? []"
                  :key="feed.id"
                  :value="String(feed.id)"
                >
                  {{ feed.title }}
                </option>
              </template>
            </select>
          </label>

          <button
            v-if="hasAdvancedFilter"
            class="self-end rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:border-zinc-700 hover:text-zinc-100"
            @click="entriesStore.resetAdvancedFilters()"
          >
            {{ t('filters.reset') }}
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>
