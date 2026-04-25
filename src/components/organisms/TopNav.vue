<script setup lang="ts">
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const navLinks = [
  { name: 'feed', key: 'nav.feed' },
  { name: 'register', key: 'nav.register' },
  { name: 'handle', key: 'nav.handle' },
  { name: 'bookmarks', key: 'nav.bookmarks' },
  { name: 'dismissed', key: 'nav.dismissed' },
] as const;
</script>

<template>
  <header class="sticky top-0 z-40 border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-xl">
    <div class="mx-auto flex h-14 max-w-screen-2xl items-center gap-6 px-4 sm:px-6 lg:px-8">
      <router-link to="/" class="shrink-0 text-lg font-semibold tracking-tight hover:text-white">
        MiniNook
      </router-link>
      <nav class="flex flex-1 items-center gap-5 overflow-x-auto text-sm font-medium">
        <router-link
          v-for="link in navLinks"
          :key="link.name"
          :to="{ name: link.name }"
          class="shrink-0 text-zinc-400 transition-colors hover:text-zinc-100"
          active-class="text-zinc-100"
        >
          {{ t(link.key) }}
        </router-link>
      </nav>
      <router-link
        :to="{ name: 'settings' }"
        class="shrink-0 rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-800/60 hover:text-zinc-100"
        active-class="text-zinc-100"
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
</template>
