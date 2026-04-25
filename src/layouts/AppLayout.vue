<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import TopNav from '@/components/organisms/TopNav.vue';
import FeedFilters from '@/components/organisms/FeedFilters.vue';
import BottomNav from '@/components/organisms/BottomNav.vue';

const route = useRoute();
const showFilters = computed(() => route.name === 'feed');
</script>

<template>
  <div class="min-h-screen bg-zinc-950 text-zinc-100">
    <TopNav />
    <FeedFilters v-if="showFilters" />

    <main class="mx-auto max-w-screen-2xl px-4 pb-24 sm:px-6 lg:px-8">
      <slot />
    </main>

    <BottomNav />
  </div>
</template>
