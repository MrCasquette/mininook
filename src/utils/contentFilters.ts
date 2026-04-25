/**
 * Content filters — each function detects or removes a specific type of noise.
 * All operate on DOM elements for precision.
 */

/** Check if an element is an author byline */
export function isAuthorLine(el: Element): boolean {
  const text = (el.textContent ?? '').trim();
  if (text.length > 200 || text.length === 0) return false;

  return (
    /^par\s+[A-ZÀ-Ú]/i.test(text) ||
    /r[eé]dac(tion|teur|trice)/i.test(text) ||
    /journaliste/i.test(text) ||
    /chroniqueu(r|se)/i.test(text) ||
    /correspondant(e)?(\s+(à|en|au))/i.test(text) ||
    /envoy[eé](e)?\s+sp[eé]cial/i.test(text) ||
    /^[\w\s.-]{3,40}\s*[-–—]\s*(r[eé]dac|journa|envoy)/i.test(text)
  );
}

/** Check if an element is a publication date */
export function isPublicationDate(el: Element): boolean {
  const text = (el.textContent ?? '').trim();
  if (text.length > 150 || text.length === 0) return false;

  return (
    /^publi[eé]\s+le/i.test(text) ||
    /^mis\s+[àa]\s+jour/i.test(text) ||
    /^(date|updated|published)\s*[:\-–]/i.test(text) ||
    /^publi[eé].*mis [àa] jour/i.test(text) ||
    /^\d{1,2}\s+(janvier|f[eé]vrier|mars|avril|mai|juin|juillet|ao[uû]t|septembre|octobre|novembre|d[eé]cembre)\s+\d{4}(\s+\d{1,2}[h:]\d{2})?$/i.test(text) ||
    /^\d{1,2}\/\d{1,2}\/\d{4}/i.test(text)
  );
}

/** Check if an element is a reading time indicator */
export function isReadingTime(el: Element): boolean {
  const text = (el.textContent ?? '').trim();
  if (text.length > 80) return false;

  return (
    /^temps de lecture/i.test(text) ||
    /^lecture\s*[:\-–]/i.test(text) ||
    /^\d+\s*min\s*(de\s+lecture)?$/i.test(text)
  );
}

/** Check if an element is a view counter */
export function isViewCounter(el: Element): boolean {
  const text = (el.textContent ?? '').trim();
  return /^\d[\d\s]*vues?$/i.test(text);
}

/** Check if an element is advertising or sponsored content */
export function isAdvertising(el: Element): boolean {
  const text = (el.textContent ?? '').trim();

  // Check attributes
  if (el.getAttribute('rel') === 'sponsored') return true;
  if (el.classList.contains('btn-call-to-action')) return true;
  if (el.getAttribute('data-tracking-category')?.includes('affiliate')) return true;

  // Check text patterns
  if (text.length > 300) return false;
  return (
    /^advertisement$/i.test(text) ||
    /^publicit[eé]$/i.test(text) ||
    /^s.abonner [àa]/i.test(text) ||
    /contient des liens affili/i.test(text) ||
    /l.e-commerçant nous reversera/i.test(text) ||
    /codes? promo/i.test(text) ||
    /encore plus d.économies/i.test(text)
  );
}

/** Check if an element is a social/newsletter CTA */
export function isSocialCTA(el: Element): boolean {
  const text = (el.textContent ?? '').trim();
  if (text.length > 300) return false;

  return (
    /suivez.*actualit[eé].*sur/i.test(text) ||
    /google actualit[eé]s/i.test(text) ||
    /sur (la chaîne|notre chaîne) whatsapp/i.test(text) ||
    /rejoignez.nous sur/i.test(text) ||
    /suivez.nous sur/i.test(text) ||
    /retrouvez.nous sur/i.test(text) ||
    /newsletter/i.test(text) ||
    /recevez .{0,20}(notre|nos|les) .{0,20}(newsletter|mail|email)/i.test(text) ||
    /^partager\s*:?\s*$/i.test(text)
  );
}

/** Check if an element is a navigation element (breadcrumb, prev/next) */
export function isNavigation(el: Element): boolean {
  const text = (el.textContent ?? '').trim();
  if (text.length > 80) return false;

  return (
    /^(pr[eé]c[eé]dent|suivant|previous|next)$/i.test(text) ||
    /^derni[eè]res (news|actus|actualit)/i.test(text) ||
    /^cr[eé]er un (contenu|compte)/i.test(text) ||
    /^(accueil|home)\s*$/i.test(text)
  );
}

/** Check if an element is an external article recommendation */
export function isArticleRecommendation(el: Element): boolean {
  const text = (el.textContent ?? '').trim();

  // "A propos de X" section headers
  if (/^[àa] propos de\s/i.test(text) && text.length < 80) return true;

  // Category label alone ("News jeu", "News culture", "Science-Fiction")
  if (/^news\s+(jeu|culture|tech|cin[eé]ma|s[eé]rie)/i.test(text) && text.length < 40) return true;

  // Text with date suffix (article listing): "Titre de l'article 08 avr., 17:56"
  if (/\d{2}\s+\w{3,4}\.,\s+\d{2}:\d{2}\s*$/.test(text)) return true;

  // Text with relative time suffix: "Titre Il y a 7 heures"
  if (/il y a \d+\s+(heure|minute|jour|semaine)/i.test(text) && el.tagName !== 'TIME') return true;

  return false;
}

/** Check if an element is a title duplicate */
export function isTitleDuplicate(el: Element, articleTitle: string): boolean {
  if (!articleTitle) return false;
  const text = (el.textContent ?? '').trim().toLowerCase();
  const title = articleTitle.toLowerCase().trim();
  if (title.length < 10) return false;

  return text.includes(title) && el.tagName !== 'H1';
}

/** Check if a paragraph is "real prose" — actual article content */
export function isProseContent(el: Element): boolean {
  const tag = el.tagName;
  const text = (el.textContent ?? '').trim();

  // Headings are structural content
  if (/^H[2-6]$/.test(tag) && text.length > 5) return true;

  // Figures are content
  if (tag === 'FIGURE') return true;

  // Blockquotes are content
  if (tag === 'BLOCKQUOTE') return true;

  // Substantial paragraph ending with punctuation
  if (tag === 'P' && text.length > 80 && /[.!?»")]\s*$/.test(text)) {
    // Exclude if it has a date pattern (article listing)
    if (/\d{2}\s+\w{3,4}\.,\s+\d{2}:\d{2}/.test(text)) return false;
    if (/il y a \d+\s+(heure|minute|jour)/i.test(text)) return false;
    return true;
  }

  return false;
}

/** Check if an element is noise (any type) */
export function isNoise(el: Element, articleTitle: string = ''): boolean {
  return (
    isAuthorLine(el) ||
    isPublicationDate(el) ||
    isReadingTime(el) ||
    isViewCounter(el) ||
    isAdvertising(el) ||
    isSocialCTA(el) ||
    isNavigation(el) ||
    isArticleRecommendation(el) ||
    isTitleDuplicate(el, articleTitle)
  );
}
