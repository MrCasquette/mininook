/**
 * Reading time calculator.
 * Based on research: average French adult reads 200-250 words/min for articles.
 */

const WORDS_PER_MINUTE = 220;

export function calculateReadingTimeFromWords(wordCount: number): number {
  if (wordCount <= 0) return 0;
  return Math.max(1, Math.round(wordCount / WORDS_PER_MINUTE));
}

export function countWordsInHtml(html: string): number {
  const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  if (!text) return 0;
  return text.split(/\s+/).length;
}

export function calculateReadingTimeFromHtml(html: string): number {
  return calculateReadingTimeFromWords(countWordsInHtml(html));
}
