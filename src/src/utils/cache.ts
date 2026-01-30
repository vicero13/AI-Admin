export interface ICache {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<boolean>;
  exists(key: string): Promise<boolean>;
  clear(): Promise<void>;
  getStats(): CacheStats;
  keys(): Promise<string[]>;
  size(): Promise<number>;
  destroy(): Promise<void>;
}

export interface CacheEntry<T> {
  value: T;
  expiresAt: number | null;
  createdAt: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  size: number;
}

export interface CacheOptions {
  defaultTTL?: number;
  cleanupInterval?: number;
  maxSize?: number;
}

export class Cache implements ICache {
  private store: Map<string, CacheEntry<unknown>>;
  private stats: { hits: number; misses: number };
  private defaultTTL: number | null;
  private maxSize: number;
  private cleanupTimer: ReturnType<typeof setInterval> | null;

  constructor(options: CacheOptions = {}) {
    this.store = new Map();
    this.stats = { hits: 0, misses: 0 };
    this.defaultTTL = options.defaultTTL ?? null;
    this.maxSize = options.maxSize ?? Infinity;
    this.cleanupTimer = null;

    const cleanupInterval = options.cleanupInterval ?? 60_000;
    if (cleanupInterval > 0) {
      this.cleanupTimer = setInterval(() => this.cleanup(), cleanupInterval);
      if (this.cleanupTimer.unref) {
        this.cleanupTimer.unref();
      }
    }
  }

  get<T>(key: string): Promise<T | undefined> {
    const entry = this.store.get(key);

    if (!entry) {
      this.stats.misses++;
      return Promise.resolve(undefined);
    }

    if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.stats.misses++;
      return Promise.resolve(undefined);
    }

    this.stats.hits++;
    return Promise.resolve(entry.value as T);
  }

  set<T>(key: string, value: T, ttl?: number): Promise<void> {
    if (this.store.size >= this.maxSize && !this.store.has(key)) {
      const firstKey = this.store.keys().next().value;
      if (firstKey !== undefined) {
        this.store.delete(firstKey);
      }
    }

    const effectiveTTL = ttl ?? this.defaultTTL;
    const expiresAt = effectiveTTL !== null ? Date.now() + effectiveTTL : null;

    this.store.set(key, {
      value,
      expiresAt,
      createdAt: Date.now(),
    });

    return Promise.resolve();
  }

  delete(key: string): Promise<boolean> {
    return Promise.resolve(this.store.delete(key));
  }

  exists(key: string): Promise<boolean> {
    const entry = this.store.get(key);

    if (!entry) {
      return Promise.resolve(false);
    }

    if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return Promise.resolve(false);
    }

    return Promise.resolve(true);
  }

  clear(): Promise<void> {
    this.store.clear();
    this.stats.hits = 0;
    this.stats.misses = 0;
    return Promise.resolve();
  }

  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: total > 0 ? this.stats.hits / total : 0,
      size: this.store.size,
    };
  }

  keys(): Promise<string[]> {
    return Promise.resolve(Array.from(this.store.keys()));
  }

  size(): Promise<number> {
    return Promise.resolve(this.store.size);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (entry.expiresAt !== null && now > entry.expiresAt) {
        this.store.delete(key);
      }
    }
  }

  destroy(): Promise<void> {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.store.clear();
    return Promise.resolve();
  }
}

export const cache = new Cache({ defaultTTL: 300_000, cleanupInterval: 60_000 });

export default cache;
