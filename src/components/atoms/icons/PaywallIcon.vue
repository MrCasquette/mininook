<script setup lang="ts">
defineProps<{
  /** When true, draw a diagonal slash through the icon (filter active). */
  barred?: boolean;
}>();
</script>

<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <!-- Padlock body -->
    <rect x="4" y="11" width="16" height="10" rx="2" />
    <!-- Shackle -->
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    <!-- Euro sign in the body -->
    <path d="M14.5 14.5a2.5 2.5 0 1 0 0 4" />
    <line x1="9.5" y1="15.7" x2="13" y2="15.7" />
    <line x1="9.5" y1="17.3" x2="13" y2="17.3" />
    <!-- Diagonal slash when barred -->
    <line v-if="barred" x1="3" y1="3" x2="21" y2="21" />
  </svg>
</template>
