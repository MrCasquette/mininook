export interface Category {
  id: number;
  title: string;
  user_id: number;
  hide_globally: boolean;
}

export interface Feed {
  id: number;
  user_id: number;
  feed_url: string;
  site_url: string;
  title: string;
  checked_at: string;
  parsing_error_count: number;
  parsing_error_message: string;
  category: Category;
  icon?: FeedIcon;
}

export interface FeedIcon {
  feed_id: number;
  icon_id: number;
}

export interface Enclosure {
  id: number;
  user_id: number;
  entry_id: number;
  url: string;
  mime_type: string;
  size: number;
  media_progression: number;
}

export interface Entry {
  id: number;
  user_id: number;
  feed_id: number;
  status: EntryStatus;
  hash: string;
  title: string;
  url: string;
  comments_url: string;
  published_at: string;
  created_at: string;
  changed_at: string;
  content: string;
  author: string;
  share_code: string;
  starred: boolean;
  reading_time: number;
  enclosures: Enclosure[] | null;
  feed: Feed;
  tags: string[];
}

export type EntryStatus = 'unread' | 'read' | 'removed';

export type EntryDirection = 'asc' | 'desc';

export type EntryOrder = 'id' | 'status' | 'published_at' | 'category_title' | 'category_id';

export interface EntryQueryParams {
  status?: EntryStatus | EntryStatus[];
  offset?: number;
  limit?: number;
  order?: EntryOrder;
  direction?: EntryDirection;
  before?: number;
  after?: number;
  before_entry_id?: number;
  after_entry_id?: number;
  starred?: boolean;
  search?: string;
  category_id?: number;
}

export interface EntriesResponse {
  total: number;
  entries: Entry[];
}

export interface FeedCounters {
  reads: Record<string, number>;
  unreads: Record<string, number>;
}

export interface Icon {
  id: number;
  data: string;
  mime_type: string;
}
