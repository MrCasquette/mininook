<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { open as openExternal } from '@tauri-apps/plugin-shell';
import LogoIcon from '@/components/atoms/LogoIcon.vue';
import { useSettingsStore } from '@/stores/settings';
import { useEntriesStore } from '@/stores/entries';

type Mode = 'token' | 'basic';

const { t } = useI18n();
const settingsStore = useSettingsStore();
const entriesStore = useEntriesStore();

const mode = ref<Mode>('token');
const url = ref('');
const apiKey = ref('');
const username = ref('');
const password = ref('');
const submitting = ref(false);
const error = ref<string | null>(null);

const normalizedUrl = computed(() => {
  const v = url.value.trim();
  if (!v) return '';
  return /^https?:\/\//i.test(v) ? v : `https://${v}`;
});

const apiKeysUrl = computed(() => {
  if (!normalizedUrl.value) return '';
  return `${normalizedUrl.value.replace(/\/$/, '')}/keys`;
});

async function openApiKeysPage() {
  if (!apiKeysUrl.value) {
    error.value = t('login.errorMissingUrl');
    return;
  }
  try {
    await openExternal(apiKeysUrl.value);
  } catch (e) {
    error.value = e instanceof Error ? e.message : t('login.errorBrowserOpen');
  }
}

async function submit() {
  error.value = null;
  submitting.value = true;
  try {
    if (mode.value === 'token') {
      settingsStore.configureWithToken(normalizedUrl.value, apiKey.value.trim());
    } else {
      settingsStore.configureWithBasic(normalizedUrl.value, username.value, password.value);
    }
    await Promise.all([entriesStore.fetchEntries(), entriesStore.fetchCategories()]);
  } catch (e) {
    settingsStore.disconnect();
    error.value = e instanceof Error ? e.message : t('login.errorGeneric');
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div class="relative min-h-screen overflow-hidden bg-zinc-950 text-zinc-100">
    <!-- Aurora background -->
    <div class="pointer-events-none absolute inset-0">
      <div class="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-indigo-600/30 blur-3xl" />
      <div class="absolute top-1/3 -right-24 h-[28rem] w-[28rem] rounded-full bg-fuchsia-600/20 blur-3xl" />
      <div class="absolute -bottom-32 left-1/4 h-96 w-96 rounded-full bg-cyan-500/20 blur-3xl" />
    </div>

    <div class="relative flex min-h-screen items-center justify-center px-4 py-12">
      <div
        class="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-black/50 backdrop-blur-2xl"
      >
        <div class="flex flex-col items-center gap-2 text-center">
          <div
            class="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15"
          >
            <LogoIcon class="h-7 w-auto text-zinc-100" />
          </div>
          <h1 class="mt-2 text-2xl font-semibold tracking-tight">{{ t('login.title') }}</h1>
          <p class="text-sm text-zinc-400">{{ t('login.subtitle') }}</p>
        </div>

        <form class="mt-8 flex flex-col gap-3" @submit.prevent="submit">
          <label class="flex flex-col gap-1.5">
            <span class="text-xs font-medium text-zinc-400">{{ t('login.serverLabel') }}</span>
            <input
              v-model="url"
              type="url"
              :placeholder="t('login.serverPlaceholder')"
              required
              autocomplete="url"
              class="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 outline-none backdrop-blur transition focus:border-white/20 focus:bg-white/10 focus:ring-2 focus:ring-white/10"
            />
          </label>

          <template v-if="mode === 'token'">
            <label class="flex flex-col gap-1.5">
              <div class="flex items-center justify-between">
                <span class="text-xs font-medium text-zinc-400">{{ t('login.apiKeyLabel') }}</span>
                <button
                  type="button"
                  :disabled="!apiKeysUrl"
                  class="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-300 transition hover:text-indigo-200 disabled:cursor-not-allowed disabled:text-zinc-600"
                  @click="openApiKeysPage"
                >
                  {{ t('login.generateKey') }}
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M7 17 17 7" /><path d="M7 7h10v10" />
                  </svg>
                </button>
              </div>
              <input
                v-model="apiKey"
                type="password"
                :placeholder="t('login.apiKeyPlaceholder')"
                required
                class="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 outline-none backdrop-blur transition focus:border-white/20 focus:bg-white/10 focus:ring-2 focus:ring-white/10"
              />
            </label>
          </template>

          <template v-else>
            <label class="flex flex-col gap-1.5">
              <span class="text-xs font-medium text-zinc-400">{{ t('login.usernameLabel') }}</span>
              <input
                v-model="username"
                type="text"
                :placeholder="t('login.usernamePlaceholder')"
                autocomplete="username"
                required
                class="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 outline-none backdrop-blur transition focus:border-white/20 focus:bg-white/10 focus:ring-2 focus:ring-white/10"
              />
            </label>
            <label class="flex flex-col gap-1.5">
              <span class="text-xs font-medium text-zinc-400">{{ t('login.passwordLabel') }}</span>
              <input
                v-model="password"
                type="password"
                :placeholder="t('login.passwordPlaceholder')"
                autocomplete="current-password"
                required
                class="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 outline-none backdrop-blur transition focus:border-white/20 focus:bg-white/10 focus:ring-2 focus:ring-white/10"
              />
            </label>
          </template>

          <p
            v-if="error"
            class="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300"
          >
            {{ error }}
          </p>

          <button
            type="submit"
            :disabled="submitting"
            class="mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-100 px-4 py-3 text-sm font-semibold text-zinc-900 shadow-lg shadow-black/30 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span
              v-if="submitting"
              class="h-4 w-4 animate-spin rounded-full border-2 border-zinc-400 border-t-zinc-900"
            />
            {{ submitting ? t('login.submitting') : t('login.submit') }}
          </button>
        </form>

        <div class="mt-5 text-center">
          <button
            type="button"
            class="text-[11px] text-zinc-500 transition hover:text-zinc-300"
            @click="mode = mode === 'token' ? 'basic' : 'token'"
          >
            {{ mode === 'token' ? t('login.switchToBasic') : t('login.switchToToken') }}
          </button>
        </div>

        <div class="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-zinc-500">
          <span class="h-1.5 w-1.5 rounded-full bg-zinc-600" />
          {{ t('login.statusDisconnected') }}
        </div>
      </div>
    </div>
  </div>
</template>
