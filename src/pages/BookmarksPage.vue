<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import AppLayout from '@/layouts/AppLayout.vue';
import EntryCard from '@/components/molecules/EntryCard.vue';
import { useEntriesStore } from '@/stores/entries';
import type { Entry } from '@/types/miniflux';

const { t } = useI18n();
const router = useRouter();
const entriesStore = useEntriesStore();
const error = ref<string | null>(null);

function openArticle(entry: Entry) {
  entriesStore.markAsRead(entry.id).catch(() => {});
  router.push({ name: 'article', params: { id: String(entry.id) } });
}

function dismissEntry(entry: Entry) {
  entriesStore.dismiss(entry.id);
}

function bookmarkEntry(entry: Entry) {
  entriesStore.toggleBookmark(entry.id);
}

onMounted(async () => {
  try {
    await entriesStore.fetchBookmarks();
  } catch (e) {
    error.value = e instanceof Error ? e.message : t('common.errorConnection');
  }
});
</script>

<template>
  <AppLayout>
    <template #header-actions>
      <span class="text-sm text-zinc-500">{{ t('bookmarks.title') }}</span>
    </template>

    <h1 data-onboard="bookmarks-page" class="pt-6 text-2xl font-bold text-zinc-100">
      {{ t('bookmarks.title') }}
    </h1>

    <!-- Loading -->
    <div v-if="entriesStore.loading" class="flex items-center justify-center pt-32">
      <div class="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-zinc-300" />
    </div>

    <!-- Error -->
    <div v-else-if="error" class="flex items-center justify-center pt-32">
      <div class="rounded-2xl border border-red-900/50 bg-red-950/50 px-6 py-4 text-center">
        <p class="text-sm text-red-400">{{ error }}</p>
      </div>
    </div>

    <!-- Empty -->
    <div v-else-if="entriesStore.entries.length === 0" class="flex flex-col items-center justify-center gap-2 pt-32">
      <p class="text-lg font-medium text-zinc-400">{{ t('bookmarks.empty') }}</p>
      <p class="text-sm text-zinc-600">{{ t('bookmarks.emptyHint') }}</p>
    </div>

    <!-- Bookmarks grid -->
    <div v-else class="grid grid-cols-1 gap-4 pt-6 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
      <EntryCard
        v-for="entry in entriesStore.entries"
        :key="entry.id"
        :entry="entry"
        @open="openArticle"
        @dismiss="dismissEntry"
        @bookmark="bookmarkEntry"
      />
    </div>
  </AppLayout>
</template>
