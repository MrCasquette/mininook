<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';

const emit = defineEmits<{ close: [] }>();

const { tm, rt } = useI18n();

interface Slide {
  title: string;
  desc: string;
}

const slides = computed<Slide[]>(() => {
  const raw = tm('onboarding.slides') as Slide[];
  return raw.map((s) => ({ title: rt(s.title), desc: rt(s.desc) }));
});

const current = ref(0);

function next() {
  if (current.value < slides.value.length - 1) current.value++;
  else done();
}
function prev() {
  if (current.value > 0) current.value--;
}
function done() {
  localStorage.setItem('mininook_onboarded', 'true');
  emit('close');
}
</script>

<template>
  <div
    class="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm"
    @click.self="done"
  >
    <div class="flex w-full max-w-md flex-col gap-5 rounded-2xl bg-zinc-900 p-6 ring-1 ring-zinc-800/80">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-1.5">
          <span
            v-for="(_, i) in slides"
            :key="i"
            :class="[
              'h-1.5 rounded-full transition-all',
              i === current ? 'w-6 bg-zinc-100' : 'w-1.5 bg-zinc-700',
            ]"
          />
        </div>
        <button
          class="rounded-lg p-1 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
          :title="$t('common.close')"
          @click="done"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 6 6 18" /><path d="m6 6 12 12" />
          </svg>
        </button>
      </div>

      <div class="min-h-[7rem]">
        <h2 class="text-xl font-bold leading-tight text-zinc-100">{{ slides[current].title }}</h2>
        <p class="mt-3 text-sm leading-relaxed text-zinc-400">{{ slides[current].desc }}</p>
      </div>

      <div class="flex items-center justify-between gap-2">
        <button
          v-if="current > 0"
          class="rounded-lg px-3 py-2 text-sm text-zinc-400 transition-colors hover:text-zinc-100"
          @click="prev"
        >
          {{ $t('onboarding.previous') }}
        </button>
        <span v-else />
        <button
          class="rounded-xl bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-900 transition hover:bg-white"
          @click="next"
        >
          {{ current === slides.length - 1 ? $t('onboarding.done') : $t('onboarding.next') }}
        </button>
      </div>
    </div>
  </div>
</template>
