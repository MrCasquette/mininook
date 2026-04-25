import type { Entry } from '@/types/miniflux';

export interface DeduplicatedEntry {
  entry: Entry;
  duplicates: Entry[];
}

export function deduplicateEntries(entries: Entry[]): DeduplicatedEntry[] {
  // Pass 1: bucket by normalized URL and hash — O(n), handles most duplicates.
  const byKey = new Map<string, Entry[]>();
  const order: string[] = [];

  for (const entry of entries) {
    const urlKey = `u:${normalizeUrl(entry.url)}`;
    const hashKey = entry.hash ? `h:${entry.hash}` : null;

    // Prefer matching an existing bucket keyed by URL or hash
    let bucketKey: string | null = null;
    if (byKey.has(urlKey)) bucketKey = urlKey;
    else if (hashKey && byKey.has(hashKey)) bucketKey = hashKey;

    if (bucketKey) {
      byKey.get(bucketKey)!.push(entry);
    } else {
      byKey.set(urlKey, [entry]);
      order.push(urlKey);
      // Also index under hash so later entries with same hash collapse here
      if (hashKey && !byKey.has(hashKey)) byKey.set(hashKey, byKey.get(urlKey)!);
    }
  }

  // Build initial groups (preserving insertion order)
  const seenBuckets = new Set<Entry[]>();
  const groups: Entry[][] = [];
  for (const key of order) {
    const bucket = byKey.get(key);
    if (!bucket || seenBuckets.has(bucket)) continue;
    seenBuckets.add(bucket);
    groups.push(bucket);
  }

  // Pass 2: fuzzy title match only across group representatives — O(g²) with g << n.
  const merged: Entry[][] = [];
  const mergedInto = new Set<number>();

  for (let i = 0; i < groups.length; i++) {
    if (mergedInto.has(i)) continue;
    const current = groups[i];
    const representative = current[0];

    for (let j = i + 1; j < groups.length; j++) {
      if (mergedInto.has(j)) continue;
      const other = groups[j][0];
      if (titleSimilarity(representative.title, other.title) >= 0.85) {
        current.push(...groups[j]);
        mergedInto.add(j);
      }
    }

    merged.push(current);
  }

  return merged.map((bucket) => ({
    entry: bucket[0],
    duplicates: bucket.slice(1),
  }));
}

function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    u.searchParams.delete('utm_source');
    u.searchParams.delete('utm_medium');
    u.searchParams.delete('utm_campaign');
    u.searchParams.delete('utm_content');
    u.searchParams.delete('utm_term');
    u.searchParams.delete('ref');
    u.searchParams.delete('fbclid');
    u.pathname = u.pathname.replace(/\/+$/, '');
    return u.origin + u.pathname + u.search;
  } catch {
    return url;
  }
}

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function titleSimilarity(a: string, b: string): number {
  const na = normalizeTitle(a);
  const nb = normalizeTitle(b);

  if (na === nb) return 1;
  if (na.length === 0 || nb.length === 0) return 0;

  const bigramsA = toBigrams(na);
  const bigramsB = toBigrams(nb);

  let matches = 0;
  const pool = [...bigramsB];
  for (const bigram of bigramsA) {
    const idx = pool.indexOf(bigram);
    if (idx !== -1) {
      matches++;
      pool.splice(idx, 1);
    }
  }

  return (2 * matches) / (bigramsA.length + bigramsB.length);
}

function toBigrams(str: string): string[] {
  const bigrams: string[] = [];
  for (let i = 0; i < str.length - 1; i++) {
    bigrams.push(str.slice(i, i + 2));
  }
  return bigrams;
}
