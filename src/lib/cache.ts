interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class TrendCache {
  private store = new Map<string, CacheEntry<unknown>>();

  set<T>(key: string, data: T, ttlMinutes: number): void {
    this.store.set(key, {
      data,
      expiresAt: Date.now() + ttlMinutes * 60 * 1000,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.data as T;
  }

  clear(key?: string): void {
    if (key) {
      this.store.delete(key);
    } else {
      this.store.clear();
    }
  }

  has(key: string): boolean {
    const entry = this.store.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return false;
    }
    return true;
  }
}

export const trendCache = new TrendCache();

export const CACHE_KEYS = {
  YOUTUBE_TRENDS: 'YOUTUBE_TRENDS',
  REDDIT_TRENDS: 'REDDIT_TRENDS',
  GNEWS_TRENDS: 'GNEWS_TRENDS',
  GOOGLE_TRENDS: 'GOOGLE_TRENDS',
  TIKTOK_CREATIVE: 'TIKTOK_CREATIVE',
  COMBINED_TRENDS: 'COMBINED_TRENDS',
} as const;

export const CACHE_TTL = {
  YOUTUBE: 120,  // 2 hours
  REDDIT: 60,    // 1 hour
  GNEWS: 180,    // 3 hours
  GOOGLE_TRENDS: 90,  // 1.5 hours
  TIKTOK_CREATIVE: 60,  // 1 hour
  COMBINED: 60,  // 1 hour
} as const;
