<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import LogoIcon from '@/components/atoms/LogoIcon.vue';
import SearchModal from '@/components/organisms/SearchModal.vue';
import UserMenu from '@/components/organisms/UserMenu.vue';
import { useOnboardingStore } from '@/stores/onboarding';

const { t } = useI18n();
const onboardingStore = useOnboardingStore();

const searchOpen = ref(false);

function openSearch() {
  searchOpen.value = true;
  onboardingStore.recordEvent('search-opened');
}
function closeSearch() {
  searchOpen.value = false;
}

function onKeyDown(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    searchOpen.value = !searchOpen.value;
    if (searchOpen.value) onboardingStore.recordEvent('search-opened');
  }
}

onMounted(() => window.addEventListener('keydown', onKeyDown));
onBeforeUnmount(() => window.removeEventListener('keydown', onKeyDown));
</script>

<template>
  <header class="sticky top-0 z-40 border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-xl">
    <div class="mx-auto flex h-14 max-w-screen-2xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
      <router-link
        :to="{ name: 'feed' }"
        class="brand flex shrink-0 items-end gap-2 text-zinc-300 transition-colors hover:text-white"
        active-class="is-active"
      >
        <LogoIcon class="h-7 w-auto text-white" />
        <span class="-mb-0.5 text-lg font-semibold leading-none tracking-tight">
          MiniNook
        </span>
      </router-link>

      <div class="flex shrink-0 items-center gap-2">
        <button
          type="button"
          data-onboard="search-button"
          class="shrink-0 rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-800/60 hover:text-zinc-100"
          v-tooltip="t('search.title')"
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
        <UserMenu />
      </div>
    </div>
  </header>
  <SearchModal :open="searchOpen" @close="closeSearch" />
</template>

<style scoped>
.brand.is-active {
  color: #fff;
}
</style>
