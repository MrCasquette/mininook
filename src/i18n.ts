import { createI18n } from 'vue-i18n';

const LOCALE_KEY = 'mininook_locale';
const FALLBACK_LOCALE = 'en';

const modules = import.meta.glob('./locales/*.json', { eager: true }) as Record<
  string,
  { default: Record<string, unknown> }
>;

const messages: Record<string, Record<string, unknown>> = {};
for (const [path, mod] of Object.entries(modules)) {
  const code = path.match(/\/([^/]+)\.json$/)?.[1];
  if (code) messages[code] = mod.default;
}

export interface AvailableLocale {
  code: string;
  name: string;
}

export function getAvailableLocales(): AvailableLocale[] {
  return Object.entries(messages)
    .map(([code, msg]) => {
      const meta = (msg as { _meta?: { name?: string } })._meta;
      return { code, name: meta?.name ?? code };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

function detectInitialLocale(): string {
  const stored = localStorage.getItem(LOCALE_KEY);
  if (stored && messages[stored]) return stored;
  const browser = navigator.language.slice(0, 2).toLowerCase();
  if (messages[browser]) return browser;
  if (messages.fr) return 'fr';
  return FALLBACK_LOCALE;
}

const initial = detectInitialLocale();

export const i18n = createI18n({
  legacy: false,
  locale: initial,
  fallbackLocale: FALLBACK_LOCALE,
  messages: messages as Record<string, Record<string, string>>,
});

document.documentElement.lang = initial;

export function setLocale(code: string): void {
  if (!messages[code]) return;
  i18n.global.locale.value = code;
  localStorage.setItem(LOCALE_KEY, code);
  document.documentElement.lang = code;
}
