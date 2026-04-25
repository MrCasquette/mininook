<script setup lang="ts">
import { onMounted } from 'vue';
import { RouterView } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useSettingsStore } from '@/stores/settings';
import LoginScreen from '@/components/organisms/LoginScreen.vue';

const settingsStore = useSettingsStore();
const { isConfigured } = storeToRefs(settingsStore);

onMounted(() => {
  settingsStore.loadFromStorage();
});
</script>

<template>
  <RouterView v-if="isConfigured" />
  <LoginScreen v-else />
</template>
