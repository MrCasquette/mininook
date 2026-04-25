import { invoke } from '@tauri-apps/api/core';
import { parseArticle } from '@/services/reader';
import { detectPaywall } from '@/utils/detectPaywall';
import { extractImageUrl } from '@/utils/extractImage';
import type { Entry } from '@/types/miniflux';
import type { EntryMeta } from '@/types/meta';

export async function enrichEntry(entry: Entry): Promise<EntryMeta> {
  const rssMeta = buildFromRss(entry);

  try {
    const html = await invoke<string>('fetch_page', { url: entry.url });
    return await buildFromFullPage(html, entry, rssMeta);
  } catch {
    return rssMeta;
  }
}

export function buildFromRss(entry: Entry): EntryMeta {
  const image = extractImageUrl(entry.content, entry.enclosures);
  const { isPaywalled } = detectPaywall(entry.content);

  return {
    image,
    isPaywall: isPaywalled,
    readingTime: entry.reading_time,
    excerpt: stripHtml(entry.content).slice(0, 200),
    resolved: false,
  };
}

async function buildFromFullPage(html: string, entry: Entry, fallback: EntryMeta): Promise<EntryMeta> {
  const parsed = await parseArticle(html, entry.url);
  if (!parsed) return { ...fallback, resolved: true };

  const textContent = stripHtml(parsed.content);
  const wordCount = textContent.split(/\s+/).filter(Boolean).length;
  const readingTime = Math.max(1, Math.round(wordCount / 200));

  const metaPaywall = detectMetaPaywall(html);
  const contentPaywall = detectPaywall(parsed.content, html);
  const endsWithEllipsis = /[……]\s*$/.test(textContent) || /\.\.\.\s*$/.test(textContent);
  const isPaywall = contentPaywall.isPaywalled || metaPaywall || endsWithEllipsis;

  return {
    image: parsed.heroImage ?? fallback.image,
    isPaywall,
    readingTime,
    excerpt: textContent.slice(0, 200),
    resolved: true,
  };
}

function detectMetaPaywall(html: string): boolean {
  const jsonLdMatch = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  if (jsonLdMatch) {
    for (const block of jsonLdMatch) {
      if (/"isAccessibleForFree"\s*:\s*false/i.test(block)) return true;
      if (/"isAccessibleForFree"\s*:\s*"false"/i.test(block)) return true;
    }
  }

  const contentTierMatch = html.match(
    /<meta[^>]+(?:name|property)=["'](?:article:)?content_tier["'][^>]+content=["'](locked|metered|premium)["']/i,
  );
  if (contentTierMatch) return true;

  return false;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}
