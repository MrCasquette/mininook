import { invoke } from '@tauri-apps/api/core';
import type {
  Category,
  DiscoveredFeed,
  EntriesResponse,
  Entry,
  EntryQueryParams,
  EntryStatus,
  Feed,
  FeedCounters,
  Icon,
} from '@/types/miniflux';

type AuthScheme = 'token' | 'basic';

class MinifluxClient {
  private baseUrl: string;
  private authScheme: AuthScheme;
  private authValue: string;

  constructor(baseUrl: string, authScheme: AuthScheme, authValue: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.authScheme = authScheme;
    this.authValue = authValue;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const method = (options.method ?? 'GET').toString().toUpperCase();
    const body = typeof options.body === 'string' ? options.body : undefined;
    const text = await invoke<string>('mf_request', {
      baseUrl: this.baseUrl,
      authScheme: this.authScheme,
      authValue: this.authValue,
      method,
      path: `/v1${path}`,
      body,
    });
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  private buildQuery(params: EntryQueryParams): string {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined) continue;
      if (Array.isArray(value)) {
        for (const v of value) searchParams.append(key, String(v));
      } else {
        searchParams.set(key, String(value));
      }
    }
    const qs = searchParams.toString();
    return qs ? `?${qs}` : '';
  }

  // Feeds
  async getFeeds(): Promise<Feed[]> {
    return this.request('/feeds');
  }

  async getFeed(feedId: number): Promise<Feed> {
    return this.request(`/feeds/${feedId}`);
  }

  async createFeed(feedUrl: string, categoryId: number): Promise<{ feed_id: number }> {
    return this.request('/feeds', {
      method: 'POST',
      body: JSON.stringify({ feed_url: feedUrl, category_id: categoryId }),
    });
  }

  async discoverFeeds(url: string): Promise<DiscoveredFeed[]> {
    return this.request('/discover', {
      method: 'POST',
      body: JSON.stringify({ url }),
    });
  }

  async deleteFeed(feedId: number): Promise<void> {
    return this.request(`/feeds/${feedId}`, { method: 'DELETE' });
  }

  async refreshFeed(feedId: number): Promise<void> {
    return this.request(`/feeds/${feedId}/refresh`, { method: 'PUT' });
  }

  async refreshAllFeeds(): Promise<void> {
    return this.request('/feeds/refresh', { method: 'PUT' });
  }

  async getFeedCounters(): Promise<FeedCounters> {
    return this.request('/feeds/counters');
  }

  // Categories
  async getCategories(): Promise<Category[]> {
    return this.request('/categories');
  }

  async createCategory(title: string): Promise<Category> {
    return this.request('/categories', {
      method: 'POST',
      body: JSON.stringify({ title }),
    });
  }

  async updateCategory(categoryId: number, title: string): Promise<Category> {
    return this.request(`/categories/${categoryId}`, {
      method: 'PUT',
      body: JSON.stringify({ title }),
    });
  }

  async deleteCategory(categoryId: number): Promise<void> {
    return this.request(`/categories/${categoryId}`, { method: 'DELETE' });
  }

  async updateFeed(feedId: number, payload: { category_id?: number; title?: string }): Promise<Feed> {
    return this.request(`/feeds/${feedId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async getCategoryEntries(categoryId: number, params: EntryQueryParams = {}): Promise<EntriesResponse> {
    return this.request(`/categories/${categoryId}/entries${this.buildQuery(params)}`);
  }

  async getFeedEntries(feedId: number, params: EntryQueryParams = {}): Promise<EntriesResponse> {
    return this.request(`/feeds/${feedId}/entries${this.buildQuery(params)}`);
  }

  // Entries
  async getEntries(params: EntryQueryParams = {}): Promise<EntriesResponse> {
    return this.request(`/entries${this.buildQuery(params)}`);
  }

  async getEntry(entryId: number): Promise<Entry> {
    return this.request(`/entries/${entryId}`);
  }

  async updateEntryStatus(entryIds: number[], status: EntryStatus): Promise<void> {
    return this.request('/entries', {
      method: 'PUT',
      body: JSON.stringify({ entry_ids: entryIds, status }),
    });
  }

  async toggleBookmark(entryId: number): Promise<void> {
    return this.request(`/entries/${entryId}/bookmark`, { method: 'PUT' });
  }

  async fetchEntryContent(entryId: number): Promise<{ content: string }> {
    return this.request(`/entries/${entryId}/fetch-content`);
  }

  // Icons
  async getFeedIcon(feedId: number): Promise<Icon> {
    return this.request(`/feeds/${feedId}/icon`);
  }
}

let client: MinifluxClient | null = null;

export function initClient(
  baseUrl: string,
  authScheme: AuthScheme,
  authValue: string,
): MinifluxClient {
  client = new MinifluxClient(baseUrl, authScheme, authValue);
  return client;
}

export function getClient(): MinifluxClient {
  if (!client) throw new Error('Miniflux client not initialized. Call initClient() first.');
  return client;
}

export type { MinifluxClient };
