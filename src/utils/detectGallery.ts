const CAPTION_PATTERNS = [
  /cr[eé]dit\s*(photo|image|illustration)/i,
  /illustration\s+d[e']/i,
  /\(cr[eé]dit\s/i,
  /©/,
  /\bgetty\b/i,
  /\breuters\b/i,
  /\bafp\b/i,
  /couverture\s+par/i,
  /cover\s+by/i,
  /image\s*:/i,
  /photo\s*:/i,
];

export function isGalleryContent(content: string): boolean {
  // Replace block tags with newlines before stripping HTML
  const text = content
    .replace(/<\/(p|div|li|br|h[1-6])>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .trim();

  if (text.length === 0) return false;

  const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return false;

  const captionCount = lines.filter((line) =>
    CAPTION_PATTERNS.some((p) => p.test(line)),
  ).length;

  // If 50%+ of lines are image captions/credits, it's a gallery
  return captionCount / lines.length >= 0.5;
}
