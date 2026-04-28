import type { Category } from '@/types/miniflux';

/**
 * Sort categories alphabetically, but pin the Miniflux *default* category first.
 *
 * The default category is the one created when the user account was provisioned —
 * always the lowest id since Miniflux assigns ids monotonically per user.
 */
export function sortCategories(cats: Category[]): Category[] {
  if (cats.length === 0) return [];
  const defaultId = getDefaultCategoryId(cats);
  return [...cats].sort((a, b) => {
    if (a.id === defaultId) return -1;
    if (b.id === defaultId) return 1;
    return a.title.localeCompare(b.title);
  });
}

export function getDefaultCategoryId(cats: Category[]): number | null {
  if (cats.length === 0) return null;
  return Math.min(...cats.map((c) => c.id));
}

/**
 * Display title for a category. If it is the Miniflux default category AND
 * still bears the unlocalized "All" Miniflux name, replace it by the i18n
 * `categories.defaultName` so the bucket reads naturally in the UI's language.
 *
 * If the user renames the default category to something else, that title is
 * shown verbatim — the substitution only applies to the untouched default.
 */
export function displayCategoryTitle(
  cat: Category,
  defaultId: number | null,
  t: (key: string) => string,
): string {
  if (cat.id === defaultId && /^all$/i.test(cat.title.trim())) {
    return t('categories.defaultName');
  }
  return cat.title;
}
