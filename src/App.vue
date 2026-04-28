<script setup lang="ts">
import { onMounted, watch } from 'vue';
import { RouterView } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useSettingsStore } from '@/stores/settings';
import { useOnboardingStore } from '@/stores/onboarding';
import LoginScreen from '@/components/organisms/LoginScreen.vue';
import OnboardingOverlay from '@/components/organisms/OnboardingOverlay.vue';

const settingsStore = useSettingsStore();
const onboardingStore = useOnboardingStore();
const { isConfigured } = storeToRefs(settingsStore);

onMounted(() => {
  settingsStore.loadFromStorage();
  if (isConfigured.value) onboardingStore.bootstrap();
});

// When user logs in fresh, bootstrap the tour. When they log out, finish.
watch(isConfigured, (now) => {
  if (now) onboardingStore.bootstrap();
});
</script>

<template>
  <template v-if="isConfigured">
    <RouterView />
    <OnboardingOverlay />
  </template>
  <LoginScreen v-else />
</template>
