<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import SearchModal from '@/components/organisms/SearchModal.vue';

const { t } = useI18n();

const navLinks = [
  { name: 'register', key: 'nav.register' },
  { name: 'handle', key: 'nav.handle' },
  { name: 'bookmarks', key: 'nav.bookmarks' },
  { name: 'dismissed', key: 'nav.dismissed' },
] as const;

const searchOpen = ref(false);

function openSearch() {
  searchOpen.value = true;
}
function closeSearch() {
  searchOpen.value = false;
}

function onKeyDown(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    searchOpen.value = !searchOpen.value;
  }
}

onMounted(() => window.addEventListener('keydown', onKeyDown));
onBeforeUnmount(() => window.removeEventListener('keydown', onKeyDown));
</script>

<template>
  <header class="sticky top-0 z-40 border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-xl">
    <div class="mx-auto flex h-14 max-w-screen-2xl items-center gap-6 px-4 sm:px-6 lg:px-8">
      <router-link
        :to="{ name: 'feed' }"
        class="brand shrink-0 text-lg font-semibold tracking-tight text-zinc-300 transition-colors hover:text-white"
        active-class="is-active"
      >
        MiniNook
      </router-link>
      <nav class="scrollbar-none flex flex-1 items-center gap-1 overflow-x-auto text-sm font-medium">
        <router-link
          v-for="link in navLinks"
          :key="link.name"
          :to="{ name: link.name }"
          class="nav-link relative shrink-0 px-2 py-2 text-zinc-400 transition-colors hover:text-zinc-100"
          active-class="is-active"
        >
          {{ t(link.key) }}
        </router-link>
      </nav>
      <button
        type="button"
        class="shrink-0 rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-800/60 hover:text-zinc-100"
        :title="t('search.title')"
        :aria-label="t('search.title')"
        @click="openSearch"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-5 w-5"
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
      </button>
      <router-link
        :to="{ name: 'settings' }"
        class="shrink-0 rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-800/60 hover:text-zinc-100"
        active-class="!text-white"
        :title="t('nav.settings')"
        :aria-label="t('nav.settings')"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-5 w-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="12" cy="12" r="3" />
          <path
            d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
          />
        </svg>
      </router-link>
    </div>
  </header>
  <SearchModal :open="searchOpen" @close="closeSearch" />
</template>

<style scoped>
.brand.is-active {
  color: #fff;
}

.nav-link.is-active {
  color: #fff;
}

.nav-link::after {
  content: '';
  position: absolute;
  left: 0.5rem;
  right: 0.5rem;
  bottom: -1px;
  height: 2px;
  background: #fff;
  transform: scaleX(0);
  transform-origin: center;
  transition: transform 0.2s ease;
  border-radius: 1px;
}

.nav-link.is-active::after {
  transform: scaleX(1);
}
</style>
