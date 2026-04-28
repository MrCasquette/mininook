import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import router from '@/router';
import { STEPS, type OnboardingEvent } from '@/onboarding/steps';

const STEP_KEY = 'mininook_onboarding_step';
const COMPLETED_KEY = 'mininook_onboarded';

export const useOnboardingStore = defineStore('onboarding', () => {
  const active = ref(false);
  const stepIndex = ref(0);

  const currentStep = computed(() => STEPS[stepIndex.value] ?? null);
  const total = computed(() => STEPS.length);

  function start() {
    active.value = true;
    stepIndex.value = 0;
    persist();
  }

  function next() {
    if (stepIndex.value >= STEPS.length - 1) {
      finish();
      return;
    }
    stepIndex.value += 1;
    persist();
  }

  function skipStep() {
    next();
  }

  function skipAll() {
    finish();
  }

  function finish() {
    active.value = false;
    localStorage.setItem(COMPLETED_KEY, 'true');
    localStorage.removeItem(STEP_KEY);
    // Drop the user back on the main feed once the tour ends.
    router.push({ name: 'feed' }).catch(() => {});
  }

  /**
   * Components call this when an action they're tied to happens. The store
   * checks if it matches the current step's expected event and auto-advances.
   */
  function recordEvent(event: OnboardingEvent) {
    if (!active.value) return;
    const step = currentStep.value;
    if (!step || !step.advanceOn) return;
    if (step.advanceOn === event) next();
  }

  /**
   * Decide whether to start, resume, or skip the tour based on persisted state.
   * Called once at app boot, after auth.
   */
  function bootstrap() {
    if (localStorage.getItem(COMPLETED_KEY) === 'true') return;
    const saved = localStorage.getItem(STEP_KEY);
    if (saved !== null) {
      const idx = Number(saved);
      stepIndex.value = Number.isFinite(idx) && idx >= 0 && idx < STEPS.length ? idx : 0;
      active.value = true;
    } else {
      start();
    }
  }

  function persist() {
    localStorage.setItem(STEP_KEY, String(stepIndex.value));
  }

  return {
    active,
    stepIndex,
    currentStep,
    total,
    start,
    next,
    skipStep,
    skipAll,
    finish,
    recordEvent,
    bootstrap,
  };
});
