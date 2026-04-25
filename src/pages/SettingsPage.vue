<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import AppLayout from '@/layouts/AppLayout.vue';
import { getAvailableLocales, setLocale } from '@/i18n';

const { t, locale } = useI18n();
const locales = computed(() => getAvailableLocales());

function onChange(e: Event) {
  const code = (e.target as HTMLSelectElement).value;
  setLocale(code);
}
</script>

<template>
  <AppLayout>
    <div class="mx-auto max-w-xl pt-8">
      <h1 class="text-2xl font-semibold tracking-tight text-zinc-100">
        {{ t('settings.title') }}
      </h1>

      <div class="mt-8 space-y-6">
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
              @change="onChange"
            >
              <option v-for="l in locales" :key="l.code" :value="l.code">
                {{ l.name }}
              </option>
            </select>
            <span class="text-xs text-zinc-500">{{ t('settings.languageHint') }}</span>
          </label>
        </section>
      </div>
    </div>
  </AppLayout>
</template>
