<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';
import { useSettingsStore } from '@/stores/settings';

const { t } = useI18n();
const route = useRoute();
const settingsStore = useSettingsStore();

const open = ref(false);
const triggerRef = ref<HTMLButtonElement | null>(null);
const menuRef = ref<HTMLDivElement | null>(null);

interface MenuItem {
  routeName: string;
  labelKey: string;
}

const items: MenuItem[] = [
  { routeName: 'handle', labelKey: 'nav.handle' },
  { routeName: 'register', labelKey: 'nav.register' },
  { routeName: 'bookmarks', labelKey: 'nav.bookmarks' },
  { routeName: 'dismissed', labelKey: 'nav.dismissed' },
];

const isOnPersonalRoute = computed(() => {
  const personalRoutes = new Set([
    'handle',
    'register',
    'bookmarks',
    'dismissed',
    'categories',
    'settings',
  ]);
  return personalRoutes.has(route.name as string);
});

function toggle() {
  open.value = !open.value;
}

function close() {
  open.value = false;
}

function onDocumentClick(e: MouseEvent) {
  if (!open.value) return;
  const target = e.target as Node;
  if (
    triggerRef.value?.contains(target) ||
    menuRef.value?.contains(target)
  ) {
    return;
  }
  close();
}

function onKeyDown(e: KeyboardEvent) {
  if (open.value && e.key === 'Escape') {
    e.preventDefault();
    close();
    triggerRef.value?.focus();
  }
}

function disconnect() {
  close();
  settingsStore.disconnect();
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick);
  document.addEventListener('keydown', onKeyDown);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick);
  document.removeEventListener('keydown', onKeyDown);
});
</script>

<template>
  <div class="relative">
    <button
      ref="triggerRef"
      type="button"
      :class="[
        'shrink-0 rounded-full p-1.5 transition-colors hover:bg-zinc-800/60',
        isOnPersonalRoute ? 'text-white ring-1 ring-zinc-700' : 'text-zinc-400 hover:text-zinc-100',
      ]"
      v-tooltip="t('nav.userMenu')"
      :aria-label="t('nav.userMenu')"
      :aria-expanded="open"
      aria-haspopup="menu"
      @click="toggle"
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
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="10" r="3" />
        <path d="M6.168 18.849A4 4 0 0 1 10 16h4a4 4 0 0 1 3.834 2.855" />
      </svg>
    </button>

    <Transition
      enter-active-class="transition duration-100 ease-out"
      enter-from-class="opacity-0 -translate-y-1"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-75 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-1"
    >
      <div
        v-if="open"
        ref="menuRef"
        role="menu"
        class="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/95 shadow-2xl shadow-black/40 backdrop-blur-xl"
      >
        <ul class="py-1">
          <li v-for="item in items" :key="item.routeName">
            <router-link
              :to="{ name: item.routeName }"
              class="flex items-center px-4 py-2 text-sm text-zinc-300 transition-colors hover:bg-zinc-800/80 hover:text-zinc-100"
              active-class="bg-zinc-800/60 text-white"
              role="menuitem"
              @click="close"
            >
              {{ t(item.labelKey) }}
            </router-link>
          </li>
        </ul>
        <div class="h-px bg-zinc-800/80" />
        <ul class="py-1">
          <li>
            <router-link
              :to="{ name: 'settings' }"
              class="flex items-center px-4 py-2 text-sm text-zinc-300 transition-colors hover:bg-zinc-800/80 hover:text-zinc-100"
              active-class="bg-zinc-800/60 text-white"
              role="menuitem"
              @click="close"
            >
              {{ t('nav.settings') }}
            </router-link>
          </li>
        </ul>
        <div class="h-px bg-zinc-800/80" />
        <ul class="py-1">
          <li>
            <button
              type="button"
              class="flex w-full items-center px-4 py-2 text-left text-sm text-red-300 transition-colors hover:bg-red-500/10 hover:text-red-200"
              role="menuitem"
              @click="disconnect"
            >
              {{ t('nav.signOut') }}
            </button>
          </li>
        </ul>
      </div>
    </Transition>
  </div>
</template>
