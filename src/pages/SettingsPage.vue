<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import AppLayout from '@/layouts/AppLayout.vue';
import { getAvailableLocales, setLocale } from '@/i18n';
import { useSettingsStore } from '@/stores/settings';
import { useOnboardingStore } from '@/stores/onboarding';

const { t, locale } = useI18n();
const settingsStore = useSettingsStore();
const onboardingStore = useOnboardingStore();
const { serverUrl, authScheme } = storeToRefs(settingsStore);

const locales = computed(() => getAvailableLocales());

const schemeLabel = computed(() =>
  authScheme.value === 'token'
    ? t('settings.accountSchemeToken')
    : t('settings.accountSchemeBasic'),
);

const displayServer = computed(() =>
  serverUrl.value.replace(/^https?:\/\//, '').replace(/\/$/, ''),
);

const confirmingDisconnect = ref(false);

function onLocaleChange(e: Event) {
  const code = (e.target as HTMLSelectElement).value;
  setLocale(code);
}

function requestDisconnect() {
  confirmingDisconnect.value = true;
}

function cancelDisconnect() {
  confirmingDisconnect.value = false;
}

function confirmDisconnect() {
  settingsStore.disconnect();
}

function replayTour() {
  onboardingStore.start();
}
</script>

<template>
  <AppLayout>
    <div class="mx-auto max-w-xl pt-8">
      <h1 data-onboard="settings-page" class="text-2xl font-semibold tracking-tight text-zinc-100">
        {{ t('settings.title') }}
      </h1>

      <div class="mt-8 space-y-6">
        <!-- Language -->
        <section
          class="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 ring-1 ring-zinc-800/40"
        >
          <label class="flex flex-col gap-2">
            <span class="text-sm font-medium text-zinc-200">
              {{ t('settings.languageLabel') }}
            </span>
            <select
              :value="locale"
              class="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none ring-zinc-700 transition focus:ring-2"
              @change="onLocaleChange"
            >
              <option v-for="l in locales" :key="l.code" :value="l.code">
                {{ l.name }}
              </option>
            </select>
            <span class="text-xs text-zinc-500">{{ t('settings.languageHint') }}</span>
          </label>
        </section>

        <!-- Account -->
        <section
          class="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 ring-1 ring-zinc-800/40"
        >
          <h2 class="text-sm font-medium text-zinc-200">{{ t('settings.accountTitle') }}</h2>

          <dl class="mt-4 space-y-2 text-sm">
            <div class="flex items-center justify-between gap-3">
              <dt class="text-zinc-500">{{ t('settings.accountServerLabel') }}</dt>
              <dd class="truncate font-mono text-xs text-zinc-300">{{ displayServer }}</dd>
            </div>
            <div class="flex items-center justify-between gap-3">
              <dt class="text-zinc-500">{{ t('login.apiKeyLabel') }} / {{ t('login.usernameLabel') }}</dt>
              <dd class="text-xs text-zinc-300">{{ schemeLabel }}</dd>
            </div>
          </dl>

          <div class="mt-5 flex items-center justify-between gap-2">
            <p class="text-xs text-zinc-500">{{ t('settings.disconnectHint') }}</p>
            <template v-if="confirmingDisconnect">
              <div class="flex shrink-0 items-center gap-2">
                <button
                  class="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-500"
                  @click="confirmDisconnect"
                >
                  {{ t('settings.disconnectConfirm') }}
                </button>
                <button
                  class="rounded-lg p-1.5 text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-300"
                  :aria-label="t('common.cancel')"
                  v-tooltip="t('common.cancel')"
                  @click="cancelDisconnect"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                  </svg>
                </button>
              </div>
            </template>
            <button
              v-else
              class="shrink-0 rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-1.5 text-xs font-semibold text-red-300 transition hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-200"
              @click="requestDisconnect"
            >
              {{ t('settings.disconnect') }}
            </button>
          </div>
        </section>

        <!-- Onboarding -->
        <section
          class="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 ring-1 ring-zinc-800/40"
        >
          <h2 class="text-sm font-medium text-zinc-200">{{ t('settings.onboardingTitle') }}</h2>
          <div class="mt-4 flex items-center justify-between gap-3">
            <p class="text-xs text-zinc-500">{{ t('settings.onboardingHint') }}</p>
            <button
              class="shrink-0 rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-zinc-700 hover:text-zinc-100"
              @click="replayTour"
            >
              {{ t('settings.replayTour') }}
            </button>
          </div>
        </section>
      </div>
    </div>
  </AppLayout>
</template>
