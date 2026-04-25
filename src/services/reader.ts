import Defuddle from 'defuddle';
import { getExtractor } from '@/services/extractors';

export interface ParsedArticle {
  title: string;
  content: string;
  excerpt: string;
  siteName: string | null;
  heroImage: string | null;
  heroCaption: string | null;
  author: string | null;
  wordCount: number;
}

/**
 * Pipeline:
 *   1. Defuddle (generic content extractor)
 *   2. Per-publisher Extractor for fine-grained cleanup (optional)
 */
export async function parseArticle(html: string, url: string): Promise<ParsedArticle | null> {
  const doc = new DOMParser().parseFromString(html, 'text/html');

  const base = doc.createElement('base');
  base.href = url;
  doc.head.prepend(base);

  const result = new Defuddle(doc, { url }).parse();
  if (!result?.content) return null;

  let content = result.content;
  let heroCaption: string | null = null;

  const extractor = getExtractor(url);
  if (extractor) {
    const contentDoc = new DOMParser().parseFromString(content, 'text/html');
    const extracted = extractor.clean(contentDoc, { title: result.title || '', url });
    heroCaption = extracted.heroCaption;
    content = contentDoc.body.innerHTML;
  }

  const heroImage = isValidHero(result.image) ? result.image : extractHeroImage(html, url);

  return {
    title: result.title || '',
    content,
    excerpt: result.description || '',
    siteName: dedupSiteName(result.site),
    heroImage,
    heroCaption,
    author: result.author || null,
    wordCount: result.wordCount || 0,
  };
}

const JUNK_IMAGE_PATTERNS = [
  /\.svg$/i,
  /error/i,
  /placeholder/i,
  /spacer/i,
  /blank\./i,
  /1x1/,
  /pixel/i,
  /logo/i,
  /icon/i,
  /favicon/i,
  /badge/i,
  /avatar/i,
  /assets\/(error|icon|logo)/i,
  /^data:image\/gif/i,
  /R0lGODlhAQAB/,
];

function isJunkImage(url: string): boolean {
  return JUNK_IMAGE_PATTERNS.some((pattern) => pattern.test(url));
}

function isValidHero(url: string | undefined): url is string {
  return typeof url === 'string' && url.length > 0 && !isJunkImage(url);
}

function extractHeroImage(html: string, baseUrl: string): string | null {
  const doc = new DOMParser().parseFromString(html, 'text/html');

  const ogImage = doc.querySelector('meta[property="og:image"]')?.getAttribute('content');
  if (ogImage && !isJunkImage(ogImage)) return resolveUrl(ogImage, baseUrl);

  const twImage = doc.querySelector('meta[name="twitter:image"]')?.getAttribute('content');
  if (twImage && !isJunkImage(twImage)) return resolveUrl(twImage, baseUrl);

  for (const img of doc.querySelectorAll('img')) {
    const src = img.getAttribute('src') || img.getAttribute('data-src');
    if (!src || isJunkImage(src)) continue;
    const w = parseInt(img.getAttribute('width') || '0', 10);
    const h = parseInt(img.getAttribute('height') || '0', 10);
    if ((w > 0 && w < 100) || (h > 0 && h < 100)) continue;
    return resolveUrl(src, baseUrl);
  }

  return null;
}

function dedupSiteName(name: string | undefined): string | null {
  if (!name) return null;
  const parts = name.split(/\s*,\s*/).map((p) => p.trim()).filter(Boolean);
  const unique = Array.from(new Set(parts));
  return unique.join(', ') || null;
}

function resolveUrl(url: string, base: string): string {
  try {
    return new URL(url, base).href;
  } catch {
    return url;
  }
}
