import { invoke } from '@tauri-apps/api/core';

const PROXIED_HOSTS: Record<string, string> = {
  'i.f1g.fr': 'https://www.lefigaro.fr/',
};

const cache = new Map<string, Promise<string | null>>();

export function needsProxy(url: string): boolean {
  try {
    return new URL(url).hostname in PROXIED_HOSTS;
  } catch {
    return false;
  }
}

function defaultReferer(url: string): string | null {
  try {
    return PROXIED_HOSTS[new URL(url).hostname] ?? null;
  } catch {
    return null;
  }
}

/**
 * Rewrite image URL to a smaller, card-friendly variant when the CDN exposes
 * size hints in the path. Idempotent and synchronous — no extra fetch.
 *
 *   - i.f1g.fr : force /704x396_cropupscale/ (also bypasses the og:image
 *     anti-hotlink protection on /_crop/).
 *   - cdn8.futura-sciences.com : force /s640/ (instead of /a1280/, /s960/, …).
 */
export function optimizeImageUrl(url: string): string {
  try {
    const u = new URL(url);
    const host = u.hostname;

    if (host === 'i.f1g.fr') {
      u.pathname = u.pathname.replace(
        /\/\d+x\d+_crop(?:upscale)?\//,
        '/704x396_cropupscale/',
      );
    }

    if (host === 'cdn8.futura-sciences.com') {
      u.pathname = u.pathname.replace(/\/[as]\d+\//, '/s640/');
    }

    return u.toString();
  } catch {
    return url;
  }
}

async function dataUrlToBlobUrl(dataUrl: string): Promise<string> {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

export function proxyImage(url: string, referer?: string): Promise<string | null> {
  if (!needsProxy(url)) return Promise.resolve(null);
  const ref = referer ?? defaultReferer(url);
  if (!ref) return Promise.resolve(null);

  const cached = cache.get(url);
  if (cached) return cached;

  const fetchUrl = optimizeImageUrl(url);
  const promise = invoke<string>('fetch_image_proxied', { url: fetchUrl, referer: ref })
    .then(dataUrlToBlobUrl)
    .catch((e: unknown) => {
      console.warn('[imageProxy] failed', fetchUrl, 'referer:', ref, e);
      return null;
    });
  cache.set(url, promise);
  return promise;
}
