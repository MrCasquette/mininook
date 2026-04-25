import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { initClient } from '@/services/miniflux';

const SERVER_URL_KEY = 'mininook_server_url';
const AUTH_SCHEME_KEY = 'mininook_auth_scheme';
const AUTH_VALUE_KEY = 'mininook_auth_value';

export type AuthScheme = 'token' | 'basic';

function encodeBasic(username: string, password: string): string {
  const bytes = new TextEncoder().encode(`${username}:${password}`);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

export const useSettingsStore = defineStore('settings', () => {
  const serverUrl = ref('');
  const authScheme = ref<AuthScheme>('token');
  const authValue = ref('');

  const isConfigured = computed(
    () => serverUrl.value !== '' && authValue.value !== '',
  );
  const status = computed<'connected' | 'disconnected'>(() =>
    isConfigured.value ? 'connected' : 'disconnected',
  );

  function configureWithToken(url: string, apiKey: string) {
    serverUrl.value = url;
    authScheme.value = 'token';
    authValue.value = apiKey;
    initClient(url, 'token', apiKey);
    localStorage.setItem(SERVER_URL_KEY, url);
    localStorage.setItem(AUTH_SCHEME_KEY, 'token');
    localStorage.setItem(AUTH_VALUE_KEY, apiKey);
  }

  function configureWithBasic(url: string, username: string, password: string) {
    const value = encodeBasic(username, password);
    serverUrl.value = url;
    authScheme.value = 'basic';
    authValue.value = value;
    initClient(url, 'basic', value);
    localStorage.setItem(SERVER_URL_KEY, url);
    localStorage.setItem(AUTH_SCHEME_KEY, 'basic');
    localStorage.setItem(AUTH_VALUE_KEY, value);
  }

  function disconnect() {
    serverUrl.value = '';
    authScheme.value = 'token';
    authValue.value = '';
    localStorage.removeItem(SERVER_URL_KEY);
    localStorage.removeItem(AUTH_SCHEME_KEY);
    localStorage.removeItem(AUTH_VALUE_KEY);
  }

  function loadFromStorage() {
    const url = localStorage.getItem(SERVER_URL_KEY);
    const scheme = localStorage.getItem(AUTH_SCHEME_KEY) as AuthScheme | null;
    const value = localStorage.getItem(AUTH_VALUE_KEY);
    if (url && value && (scheme === 'token' || scheme === 'basic')) {
      serverUrl.value = url;
      authScheme.value = scheme;
      authValue.value = value;
      initClient(url, scheme, value);
    }
  }

  return {
    serverUrl,
    authScheme,
    authValue,
    isConfigured,
    status,
    configureWithToken,
    configureWithBasic,
    disconnect,
    loadFromStorage,
  };
});
