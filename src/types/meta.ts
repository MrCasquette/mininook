export interface EntryMeta {
  image: string | null;
  isPaywall: boolean;
  readingTime: number;
  excerpt: string;
  resolved: boolean;
  /** True while a background image fetch is in flight for this entry. */
  imagePending?: boolean;
}
