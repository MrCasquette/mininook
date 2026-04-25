import { createRouter, createWebHistory } from 'vue-router';
import { useSettingsStore } from '@/stores/settings';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'feed',
      component: () => import('@/pages/FeedPage.vue'),
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('@/pages/RegisterPage.vue'),
    },
    {
      path: '/handle',
      name: 'handle',
      component: () => import('@/pages/HandlePage.vue'),
    },
    {
      path: '/bookmarks',
      name: 'bookmarks',
      component: () => import('@/pages/BookmarksPage.vue'),
    },
    {
      path: '/dismissed',
      name: 'dismissed',
      component: () => import('@/pages/DismissedPage.vue'),
    },
    {
      path: '/article/:id',
      name: 'article',
      component: () => import('@/pages/ArticlePage.vue'),
      props: true,
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('@/pages/SettingsPage.vue'),
    },
  ],
});

router.beforeEach(() => {
  const settingsStore = useSettingsStore();
  settingsStore.loadFromStorage();
});

export default router;
