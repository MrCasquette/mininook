import type { Enclosure } from '@/types/miniflux';

export function extractImageUrl(content: string, enclosures: Enclosure[] | null): string | null {
  return (
    fromEnclosures(enclosures) ??
    fromImgSrc(content) ??
    fromImgSrcset(content) ??
    fromDataSrc(content) ??
    fromPictureSource(content) ??
    fromOgMeta(content)
  );
}

function fromEnclosures(enclosures: Enclosure[] | null): string | null {
  if (!enclosures) return null;
  const image = enclosures.find((e) => e.mime_type.startsWith('image/'));
  return image?.url ?? null;
}

function fromImgSrc(content: string): string | null {
  const match = content.match(/<img[^>]+src=["']([^"']+)["']/);
  return match?.[1] ?? null;
}

function fromImgSrcset(content: string): string | null {
  const match = content.match(/<img[^>]+srcset=["']([^"']+)["']/);
  if (!match) return null;
  const first = match[1].split(',')[0].trim().split(/\s+/)[0];
  return first || null;
}

function fromDataSrc(content: string): string | null {
  const match = content.match(/<img[^>]+data-src=["']([^"']+)["']/);
  return match?.[1] ?? null;
}

function fromPictureSource(content: string): string | null {
  const match = content.match(/<source[^>]+srcset=["']([^"']+)["']/);
  if (!match) return null;
  const first = match[1].split(',')[0].trim().split(/\s+/)[0];
  return first || null;
}

function fromOgMeta(content: string): string | null {
  const match = content.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/);
  return match?.[1] ?? null;
}
