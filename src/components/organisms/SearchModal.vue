<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { getClient } from '@/services/miniflux';
import type { Entry } from '@/types/miniflux';

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ close: [] }>();

const { t, locale } = useI18n();
const router = useRouter();

const query = ref('');
const results = ref<Entry[]>([]);
const total = ref(0);
const loading = ref(false);
const inputRef = ref<HTMLInputElement | null>(null);
const listRef = ref<HTMLUListElement | null>(null);
const selectedIndex = ref(0);

let debounceTimer: number | null = null;
let activeRequest = 0;

watch(
  () => props.open,
  async (isOpen) => {
    if (isOpen) {
      query.value = '';
      results.value = [];
      total.value = 0;
      await nextTick();
      inputRef.value?.focus();
    }
  },
);

watch(query, (value) => {
  if (debounceTimer) window.clearTimeout(debounceTimer);
  selectedIndex.value = 0;
  const trimmed = value.trim();
  if (trimmed.length < 2) {
    results.value = [];
    total.value = 0;
    loading.value = false;
    return;
  }
  loading.value = true;
  debounceTimer = window.setTimeout(() => {
    void runSearch(trimmed);
  }, 300);
});

watch(results, () => {
  selectedIndex.value = 0;
});

function scrollSelectedIntoView() {
  void nextTick(() => {
    const list = listRef.value;
    if (!list) return;
    const item = list.children[selectedIndex.value] as HTMLElement | undefined;
    item?.scrollIntoView({ block: 'nearest' });
  });
}

async function runSearch(term: string) {
  const reqId = ++activeRequest;
  try {
    const response = await getClient().getEntries({
      search: term,
      limit: 30,
      order: 'published_at',
      direction: 'desc',
    });
    if (reqId !== activeRequest) return;
    results.value = response.entries;
    total.value = response.total;
  } catch (e) {
    if (reqId !== activeRequest) return;
    console.warn('[search] failed', e);
    results.value = [];
    total.value = 0;
  } finally {
    if (reqId === activeRequest) loading.value = false;
  }
}

function openEntry(entry: Entry) {
  emit('close');
  router.push({ name: 'article', params: { id: String(entry.id) } });
}

function onKeyDown(e: KeyboardEvent) {
  if (!props.open) return;
  if (e.key === 'Escape') {
    e.preventDefault();
    emit('close');
    return;
  }
  if (results.value.length === 0) return;
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    selectedIndex.value = Math.min(selectedIndex.value + 1, results.value.length - 1);
    scrollSelectedIntoView();
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    selectedIndex.value = Math.max(selectedIndex.value - 1, 0);
    scrollSelectedIntoView();
  } else if (e.key === 'Home') {
    e.preventDefault();
    selectedIndex.value = 0;
    scrollSelectedIntoView();
  } else if (e.key === 'End') {
    e.preventDefault();
    selectedIndex.value = results.value.length - 1;
    scrollSelectedIntoView();
  } else if (e.key === 'Enter') {
    e.preventDefault();
    const entry = results.value[selectedIndex.value];
    if (entry) openEntry(entry);
  }
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(locale.value, { day: 'numeric', month: 'short', year: 'numeric' });
}

onMounted(() => window.addEventListener('keydown', onKeyDown));
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown);
  if (debounceTimer) window.clearTimeout(debounceTimer);
});
</script>

<template>
  <Transition
    enter-active-class="transition duration-150 ease-out"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition duration-100 ease-in"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="open"
      class="fixed inset-0 z-[100] flex items-start justify-center bg-black/70 px-4 pt-24 backdrop-blur-sm"
      @click.self="emit('close')"
    >
      <div
        class="flex max-h-[70vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/90 shadow-2xl shadow-black/50 backdrop-blur-2xl"
        @click.stop
      >
        <!-- Input -->
        <div class="flex items-center gap-3 border-b border-zinc-800/60 px-4 py-3">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5 shrink-0 text-zinc-500"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            ref="inputRef"
            v-model="query"
            type="text"
            :placeholder="t('search.placeholder')"
            class="flex-1 bg-transparent text-sm text-zinc-100 placeholder-zinc-500 outline-none"
          />
          <button
            class="shrink-0 rounded-md border border-zinc-700/80 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400"
            @click="emit('close')"
          >
            ESC
          </button>
        </div>

        <!-- Results / states -->
        <div class="flex-1 overflow-y-auto">
          <div
            v-if="!query.trim() || query.trim().length < 2"
            class="px-4 py-8 text-center text-xs text-zinc-500"
          >
            {{ t('search.empty') }}
          </div>

          <div
            v-else-if="loading"
            class="flex items-center justify-center px-4 py-8 text-xs text-zinc-500"
          >
            <span
              class="mr-2 inline-block h-3 w-3 animate-spin rounded-full border-2 border-zinc-700 border-t-zinc-300"
            />
            {{ t('search.loading') }}
          </div>

          <div
            v-else-if="results.length === 0"
            class="px-4 py-8 text-center text-xs text-zinc-500"
          >
            {{ t('search.noResults') }}
          </div>

          <ul v-else ref="listRef" class="flex flex-col">
            <li
              v-for="(entry, idx) in results"
              :key="entry.id"
              :class="[
                'cursor-pointer border-b border-zinc-800/40 px-4 py-3 transition-colors last:border-b-0',
                selectedIndex === idx ? 'bg-zinc-800/60' : 'hover:bg-zinc-800/40',
              ]"
              @mouseenter="selectedIndex = idx"
              @click="openEntry(entry)"
            >
              <p class="line-clamp-2 text-sm font-medium leading-snug text-zinc-100">
                {{ entry.title }}
              </p>
              <div class="mt-1 flex items-center gap-2 text-[11px] text-zinc-500">
                <span class="truncate">{{ entry.feed.title }}</span>
                <span class="opacity-50">•</span>
                <span class="shrink-0">{{ formatDate(entry.published_at) }}</span>
                <span
                  v-if="entry.status === 'read'"
                  class="ml-auto shrink-0 rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-500"
                >
                  ✓
                </span>
              </div>
            </li>
          </ul>
        </div>

        <!-- Footer -->
        <div
          v-if="total > 0 && !loading"
          class="shrink-0 border-t border-zinc-800/60 px-4 py-2 text-[11px] text-zinc-500"
        >
          {{ t('search.results', { n: total }, total) }}
        </div>
      </div>
    </div>
  </Transition>
</template>
