export type OnboardingEvent =
  | 'category-created'
  | 'feed-added'
  | 'article-read'
  | 'bookmark-or-dismiss'
  | 'category-filter-changed'
  | 'filter-toggled'
  | 'search-opened';

/**
 * One step of the guided tour. Either has a target selector to spotlight on the
 * current page, or none — a "centered" step rendered modal-style.
 *
 * `advanceOn` is the event that auto-advances the step; if omitted, the step
 * waits for the user to click "Suivant" (manual / informational steps).
 *
 * `route` indicates which named route this step expects. The overlay navigates
 * there before showing the step.
 *
 * `target` is a CSS selector resolved at runtime. It can also be a function
 * for steps whose target depends on the current route (e.g., step 4 has a
 * target on `feed` and a different target on `article`).
 */
export interface OnboardingStep {
  index: number; // 0-based
  titleKey: string;
  bodyKey: string;
  route?: string; // route name to navigate to before showing
  target?: string | ((currentRoute: string) => string | null);
  advanceOn?: OnboardingEvent;
  centered?: boolean; // render as a centered modal (no target, no spotlight)
}

export const STEPS: OnboardingStep[] = [
  {
    index: 0,
    titleKey: 'onboarding.steps.1.title',
    bodyKey: 'onboarding.steps.1.body',
    route: 'categories',
    target: '[data-onboard="create-category"]',
    advanceOn: 'category-created',
  },
  {
    index: 1,
    titleKey: 'onboarding.steps.2.title',
    bodyKey: 'onboarding.steps.2.body',
    route: 'handle',
    target: '[data-onboard="add-feed"]',
    advanceOn: 'feed-added',
  },
  {
    index: 2,
    titleKey: 'onboarding.steps.3.title',
    bodyKey: 'onboarding.steps.3.body',
    route: 'feed',
    target: '[data-onboard="card-first"]',
  },
  {
    index: 3,
    titleKey: 'onboarding.steps.4.title',
    bodyKey: 'onboarding.steps.4.body',
    target: (route) => {
      if (route === 'article') return '[data-onboard="mark-read"]';
      return '[data-onboard="card-first"]';
    },
    advanceOn: 'article-read',
  },
  {
    index: 4,
    titleKey: 'onboarding.steps.5.title',
    bodyKey: 'onboarding.steps.5.body',
    route: 'feed',
    target: '[data-onboard="card-first"]',
    advanceOn: 'bookmark-or-dismiss',
  },
  {
    index: 5,
    titleKey: 'onboarding.steps.6.title',
    bodyKey: 'onboarding.steps.6.body',
    route: 'feed',
    target: '[data-onboard="bottom-nav"]',
    advanceOn: 'category-filter-changed',
  },
  {
    index: 6,
    titleKey: 'onboarding.steps.7.title',
    bodyKey: 'onboarding.steps.7.body',
    route: 'feed',
    target: '[data-onboard="feed-filters"]',
    advanceOn: 'filter-toggled',
  },
  {
    index: 7,
    titleKey: 'onboarding.steps.8.title',
    bodyKey: 'onboarding.steps.8.body',
    target: '[data-onboard="search-button"]',
    advanceOn: 'search-opened',
  },
  {
    index: 8,
    titleKey: 'onboarding.steps.9.title',
    bodyKey: 'onboarding.steps.9.body',
    route: 'handle',
    target: '[data-onboard="manage-categories"]',
  },
  {
    index: 9,
    titleKey: 'onboarding.steps.10.title',
    bodyKey: 'onboarding.steps.10.body',
    route: 'bookmarks',
    target: '[data-onboard="bookmarks-page"]',
  },
  {
    index: 10,
    titleKey: 'onboarding.steps.11.title',
    bodyKey: 'onboarding.steps.11.body',
    route: 'dismissed',
    target: '[data-onboard="dismissed-page"]',
  },
  {
    index: 11,
    titleKey: 'onboarding.steps.12.title',
    bodyKey: 'onboarding.steps.12.body',
    route: 'settings',
    target: '[data-onboard="settings-page"]',
  },
  {
    index: 12,
    titleKey: 'onboarding.steps.13.title',
    bodyKey: 'onboarding.steps.13.body',
    centered: true,
  },
];
