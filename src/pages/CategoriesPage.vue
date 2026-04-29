<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import AppLayout from '@/layouts/AppLayout.vue';
import { getClient } from '@/services/miniflux';
import { sortCategories, getDefaultCategoryId, displayCategoryTitle } from '@/utils/sortCategories';
import { useOnboardingStore } from '@/stores/onboarding';
import type { Category, Feed } from '@/types/miniflux';

const { t } = useI18n();
const onboardingStore = useOnboardingStore();

const categories = ref<Category[]>([]);
const feeds = ref<Feed[]>([]);
const loading = ref(true);

const newName = ref('');
const creating = ref(false);
const createError = ref<string | null>(null);

const editingId = ref<number | null>(null);
const editingTitle = ref('');
const renaming = ref<Set<number>>(new Set());
const renameErrors = ref<Record<number, string>>({});

const pendingDelete = ref<number | null>(null);
const deleting = ref<Set<number>>(new Set());
const deleteErrors = ref<Record<number, string>>({});

const defaultCategoryId = computed(() => getDefaultCategoryId(categories.value));

function catLabel(cat: Category): string {
  return displayCategoryTitle(cat, defaultCategoryId.value, t);
}

const feedsCountByCategory = computed(() => {
  const map: Record<number, number> = {};
  for (const f of feeds.value) {
    map[f.category.id] = (map[f.category.id] ?? 0) + 1;
  }
  return map;
});

onMounted(async () => {
  await reload();
});

async function reload() {
  loading.value = true;
  try {
    const [c, f] = await Promise.all([
      getClient().getCategories(),
      getClient().getFeeds(),
    ]);
    categories.value = sortCategories(c);
    feeds.value = f;
  } catch (e) {
    console.warn('[categories] load failed', e);
  } finally {
    loading.value = false;
  }
}

async function create() {
  const name = newName.value.trim();
  if (!name) return;
  creating.value = true;
  createError.value = null;
  try {
    const cat = await getClient().createCategory(name);
    categories.value.push(cat);
    categories.value = sortCategories(categories.value);
    newName.value = '';
    onboardingStore.recordEvent('category-created');
  } catch (e) {
    createError.value = e instanceof Error ? e.message : t('common.errorGeneric');
  } finally {
    creating.value = false;
  }
}

function startRename(cat: Category) {
  editingId.value = cat.id;
  editingTitle.value = cat.title;
  delete renameErrors.value[cat.id];
}

function cancelRename() {
  editingId.value = null;
  editingTitle.value = '';
}

async function confirmRename(cat: Category) {
  const next = editingTitle.value.trim();
  if (!next || next === cat.title) {
    cancelRename();
    return;
  }
  renaming.value.add(cat.id);
  try {
    await getClient().updateCategory(cat.id, next);
    cat.title = next;
    categories.value = sortCategories(categories.value);
    cancelRename();
  } catch (e) {
    renameErrors.value[cat.id] = e instanceof Error ? e.message : t('categories.renameError');
  } finally {
    renaming.value.delete(cat.id);
  }
}

function requestDelete(catId: number) {
  pendingDelete.value = catId;
}

function cancelDelete() {
  pendingDelete.value = null;
}

async function confirmDelete(cat: Category) {
  pendingDelete.value = null;
  if (feedsCountByCategory.value[cat.id] > 0) {
    deleteErrors.value[cat.id] = t('categories.deleteWithFeeds');
    return;
  }
  deleting.value.add(cat.id);
  delete deleteErrors.value[cat.id];
  try {
    await getClient().deleteCategory(cat.id);
    categories.value = categories.value.filter((c) => c.id !== cat.id);
  } catch (e) {
    deleteErrors.value[cat.id] = e instanceof Error ? e.message : t('categories.deleteError');
  } finally {
    deleting.value.delete(cat.id);
  }
}

function feedsCountLabel(catId: number): string {
  const n = feedsCountByCategory.value[catId] ?? 0;
  if (n === 0) return t('categories.feedsCountZero');
  return t('categories.feedsCount', { n });
}
</script>

<template>
  <AppLayout>
    <div class="mx-auto max-w-2xl pt-6">
      <header class="mb-8 flex items-start justify-between gap-3">
        <div>
          <h1 class="text-2xl font-bold text-zinc-100">{{ t('categories.title') }}</h1>
          <p class="mt-2 text-sm text-zinc-500">{{ t('categories.subtitle') }}</p>
        </div>
        <router-link
          :to="{ name: 'handle' }"
          class="shrink-0 inline-flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-zinc-700 hover:text-zinc-100"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
          {{ t('handle.backToFeeds') }}
        </router-link>
      </header>

      <!-- Create form -->
      <section data-onboard="create-category" class="mb-8 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 ring-1 ring-zinc-800/40">
        <form class="flex flex-col gap-2 sm:flex-row sm:items-end" @submit.prevent="create">
          <input
            v-model="newName"
            type="text"
            :placeholder="t('categories.createPlaceholder')"
            class="flex-1 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 outline-none ring-zinc-700 transition focus:ring-2"
          />
          <button
            type="submit"
            :disabled="creating || !newName.trim()"
            class="shrink-0 rounded-xl bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-900 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {{ t('categories.create') }}
          </button>
        </form>
        <p
          v-if="createError"
          class="mt-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300"
        >
          {{ createError }}
        </p>
      </section>

      <!-- List -->
      <div v-if="loading" class="flex items-center justify-center pt-12">
        <div class="h-6 w-6 animate-spin rounded-full border-2 border-zinc-700 border-t-zinc-300" />
      </div>

      <div v-else-if="categories.length === 0" class="pt-8 text-center text-sm text-zinc-500">
        {{ t('categories.empty') }}
      </div>

      <ul v-else class="flex flex-col gap-2">
        <li
          v-for="cat in categories"
          :key="cat.id"
          class="rounded-xl border border-zinc-800/60 bg-zinc-900/50 px-4 py-3"
        >
          <div class="flex items-center gap-3">
            <!-- Rename mode -->
            <template v-if="editingId === cat.id">
              <input
                v-model="editingTitle"
                type="text"
                class="flex-1 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm text-zinc-100 outline-none ring-zinc-700 transition focus:ring-2"
                @keydown.enter.prevent="confirmRename(cat)"
                @keydown.escape="cancelRename"
              />
              <button
                class="shrink-0 rounded-md bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-900 hover:bg-white disabled:opacity-50"
                :disabled="renaming.has(cat.id) || !editingTitle.trim()"
                @click="confirmRename(cat)"
              >
                {{ t('common.save') }}
              </button>
              <button
                class="shrink-0 rounded-md p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
                v-tooltip="t('common.cancel')"
                @click="cancelRename"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                </svg>
              </button>
            </template>

            <!-- Display mode -->
            <template v-else>
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-medium text-zinc-100">{{ catLabel(cat) }}</p>
                <p class="text-[11px] text-zinc-500">{{ feedsCountLabel(cat.id) }}</p>
              </div>

              <template v-if="pendingDelete === cat.id">
                <button
                  class="shrink-0 rounded-lg bg-red-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-50"
                  :disabled="deleting.has(cat.id)"
                  @click="confirmDelete(cat)"
                >
                  {{ t('common.confirm') }}
                </button>
                <button
                  class="shrink-0 rounded-md p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
                  v-tooltip="t('common.cancel')"
                  @click="cancelDelete"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                  </svg>
                </button>
              </template>

              <template v-else>
                <button
                  class="shrink-0 rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
                  v-tooltip="t('categories.rename')"
                  @click="startRename(cat)"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                  </svg>
                </button>
                <button
                  class="shrink-0 rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-red-950/50 hover:text-red-400 disabled:opacity-50"
                  v-tooltip="t('categories.delete')"
                  :disabled="deleting.has(cat.id)"
                  @click="requestDelete(cat.id)"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </template>
            </template>
          </div>

          <p
            v-if="renameErrors[cat.id]"
            class="mt-2 text-xs text-red-400"
          >
            {{ renameErrors[cat.id] }}
          </p>
          <p
            v-if="deleteErrors[cat.id]"
            class="mt-2 text-xs text-red-400"
          >
            {{ deleteErrors[cat.id] }}
          </p>
        </li>
      </ul>
    </div>
  </AppLayout>
</template>
