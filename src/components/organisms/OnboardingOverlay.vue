<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { autoUpdate, flip, offset, shift, useFloating } from '@floating-ui/vue';
import { useOnboardingStore } from '@/stores/onboarding';
import type { OnboardingStep } from '@/onboarding/steps';

const { t } = useI18n();
const store = useOnboardingStore();
const router = useRouter();
const route = useRoute();

const targetEl = ref<HTMLElement | null>(null);
const tooltipEl = ref<HTMLElement | null>(null);
const spotlightRect = ref<DOMRect | null>(null);

/**
 * Clamp the target rect to the viewport so a target that spans well past the
 * fold (e.g. the entire feed grid) still produces a tooltip anchored to its
 * visible portion. Without this, floating-ui places the tooltip at the bottom
 * of an off-screen rect.
 */
const clampedRect = computed<DOMRect | null>(() => {
  const r = spotlightRect.value;
  if (!r) return null;
  const top = Math.max(r.top, 0);
  const left = Math.max(r.left, 0);
  const bottom = Math.min(r.bottom, window.innerHeight);
  const right = Math.min(r.right, window.innerWidth);
  const width = Math.max(0, right - left);
  const height = Math.max(0, bottom - top);
  return {
    top,
    left,
    bottom,
    right,
    width,
    height,
    x: left,
    y: top,
    toJSON() {
      return this;
    },
  } as DOMRect;
});

/**
 * If the clamped rect is essentially the whole viewport, floating-ui has no
 * room to place the tooltip and ends up fighting flip/shift, leaving the card
 * partially clipped. In that case we render the tooltip at a fixed corner.
 */
const isOversized = computed(() => {
  const r = clampedRect.value;
  if (!r) return false;
  // Only fall back to fixed-corner when BOTH dimensions are oversized — a
  // full-width but short element (filter bar, top nav) still anchors fine.
  return r.height > window.innerHeight * 0.85 && r.width > window.innerWidth * 0.85;
});

/** Virtual reference for floating-ui based on the clamped rect. */
const floatingReference = computed(() =>
  clampedRect.value && !isOversized.value
    ? { getBoundingClientRect: () => clampedRect.value as DOMRect }
    : null,
);

const { floatingStyles } = useFloating(floatingReference, tooltipEl, {
  placement: 'bottom',
  middleware: [offset(16), flip({ padding: 16 }), shift({ padding: 16 })],
  whileElementsMounted: autoUpdate,
});

const currentStep = computed<OnboardingStep | null>(() => store.currentStep);
const isCentered = computed(() => currentStep.value?.centered ?? false);
const isLast = computed(() => store.stepIndex === store.total - 1);
const isManual = computed(
  () => !currentStep.value?.advanceOn && !currentStep.value?.centered,
);

let scrollHandler: (() => void) | null = null;
let resizeObserver: ResizeObserver | null = null;

function resolveTarget() {
  const step = currentStep.value;
  if (!step || step.centered) {
    targetEl.value = null;
    spotlightRect.value = null;
    return;
  }

  const sel =
    typeof step.target === 'function'
      ? step.target((route.name as string) ?? '')
      : step.target;

  if (!sel) {
    targetEl.value = null;
    spotlightRect.value = null;
    return;
  }

  const el = document.querySelector(sel) as HTMLElement | null;
  targetEl.value = el;
  if (el) {
    spotlightRect.value = el.getBoundingClientRect();
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
}

function updateSpotlight() {
  if (!targetEl.value) return;
  spotlightRect.value = targetEl.value.getBoundingClientRect();
}

function attachListeners(el: HTMLElement) {
  scrollHandler = () => updateSpotlight();
  window.addEventListener('scroll', scrollHandler, true);
  window.addEventListener('resize', scrollHandler);
  // Defer to RAF so the observer's update doesn't synchronously trigger
  // a layout change inside the same observation tick.
  resizeObserver = new ResizeObserver(() => {
    requestAnimationFrame(updateSpotlight);
  });
  resizeObserver.observe(el);
}

function detachListeners() {
  if (scrollHandler) {
    window.removeEventListener('scroll', scrollHandler, true);
    window.removeEventListener('resize', scrollHandler);
    scrollHandler = null;
  }
  resizeObserver?.disconnect();
  resizeObserver = null;
}

watch(targetEl, (el) => {
  detachListeners();
  if (el) attachListeners(el);
});

watch(
  [() => store.active, () => store.stepIndex, () => route.name],
  async ([active]) => {
    if (!active) return;
    const step = currentStep.value;
    if (!step) return;
    // Reset target/spotlight state immediately so the spotlight doesn't slide
    // from the previous step's coordinates while the new page resolves.
    targetEl.value = null;
    spotlightRect.value = null;
    if (step.route && route.name !== step.route) {
      await router.push({ name: step.route });
    }
    // Let the page render before searching for the target
    await nextTick();
    setTimeout(resolveTarget, 200);
  },
  { immediate: true },
);

// Retry resolve if target wasn't found yet (page mid-render)
let retryTimer: number | null = null;
watch(
  () => store.stepIndex,
  () => {
    if (retryTimer) window.clearTimeout(retryTimer);
    retryTimer = window.setTimeout(() => {
      if (store.active && !targetEl.value && !isCentered.value) {
        resolveTarget();
      }
    }, 600);
  },
);

onMounted(() => {
  // If page just loaded and onboarding active, try resolving target
  if (store.active) {
    setTimeout(resolveTarget, 300);
  }
});

onBeforeUnmount(() => {
  detachListeners();
  if (retryTimer) window.clearTimeout(retryTimer);
});

const counterText = computed(() =>
  t('onboarding.stepCounter', { n: store.stepIndex + 1, total: store.total }),
);

const SPOTLIGHT_PADDING = 8;
const spotlightStyle = computed(() => {
  const r = clampedRect.value;
  if (!r || r.width === 0 || r.height === 0) return null;
  return {
    top: `${r.top - SPOTLIGHT_PADDING}px`,
    left: `${r.left - SPOTLIGHT_PADDING}px`,
    width: `${r.width + SPOTLIGHT_PADDING * 2}px`,
    height: `${r.height + SPOTLIGHT_PADDING * 2}px`,
  };
});
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="store.active && currentStep" class="pointer-events-none fixed inset-0 z-[200]">
        <!-- Centered modal style for the closing step -->
        <template v-if="isCentered">
          <div class="pointer-events-auto absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div class="absolute inset-0 flex items-center justify-center px-4">
            <div
              class="pointer-events-auto w-full max-w-md rounded-3xl border border-white/10 bg-zinc-900/95 p-7 shadow-2xl shadow-black/50 backdrop-blur-2xl"
            >
              <p class="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                {{ counterText }}
              </p>
              <h2 class="mt-2 text-xl font-semibold text-zinc-100">
                {{ t(currentStep.titleKey) }}
              </h2>
              <p class="mt-3 text-sm leading-relaxed text-zinc-400">
                {{ t(currentStep.bodyKey) }}
              </p>
              <div class="mt-6 flex justify-end">
                <button
                  class="rounded-xl bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-900 transition hover:bg-white"
                  @click="store.finish()"
                >
                  {{ t('onboarding.finish') }}
                </button>
              </div>
            </div>
          </div>
        </template>

        <!-- Spotlight + tooltip steps -->
        <template v-else>
          <!-- Spotlight cutout: the inner div has a giant outer box-shadow
               that dims everything around it. No CSS transition — the giant
               box-shadow doesn't tween cleanly. -->
          <div
            v-if="spotlightStyle"
            :key="`spotlight-${store.stepIndex}`"
            class="absolute rounded-xl ring-2 ring-white/40"
            :style="{
              ...spotlightStyle,
              boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.65)',
            }"
          />
          <!-- Fallback dim when no target yet (loading) -->
          <div
            v-else
            class="absolute inset-0 bg-black/65"
          />

          <!-- Tooltip card — only renders once we have a clamped rect to anchor to.
               During the brief gap between step changes (target reset → new target
               resolved), the tooltip stays unmounted instead of flashing at (0,0).
               If the target rect is oversized, we anchor to a fixed corner instead. -->
          <div
            v-if="clampedRect"
            ref="tooltipEl"
            :style="
              isOversized
                ? { position: 'fixed', bottom: '1.5rem', right: '1.5rem' }
                : floatingStyles
            "
            class="pointer-events-auto z-[210] w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-white/10 bg-zinc-900/95 p-5 shadow-2xl shadow-black/50 backdrop-blur-2xl"
          >
            <div class="flex items-start justify-between gap-3">
              <p class="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                {{ counterText }}
              </p>
              <button
                class="-m-1 rounded-lg p-1 text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-200"
                :title="t('onboarding.skipAll')"
                :aria-label="t('onboarding.skipAll')"
                @click="store.skipAll()"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                </svg>
              </button>
            </div>
            <h2 class="mt-2 text-base font-semibold text-zinc-100">
              {{ t(currentStep.titleKey) }}
            </h2>
            <p class="mt-2 text-sm leading-relaxed text-zinc-400">
              {{ t(currentStep.bodyKey) }}
            </p>

            <div class="mt-5 flex items-center justify-between gap-2">
              <button
                class="text-[11px] text-zinc-500 transition hover:text-zinc-300"
                @click="store.skipStep()"
              >
                {{ t('onboarding.skipStep') }}
              </button>
              <button
                v-if="isManual || isLast"
                class="rounded-lg bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-900 transition hover:bg-white"
                @click="store.next()"
              >
                {{ isLast ? t('onboarding.finish') : t('onboarding.next') }}
              </button>
              <span
                v-else
                class="text-[11px] italic text-zinc-600"
              >
                {{ t('onboarding.next') }} →
              </span>
            </div>
          </div>
        </template>
      </div>
    </Transition>
  </Teleport>
</template>
