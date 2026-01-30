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

export class Cache {
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

  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);

    if (!entry) {
      this.stats.misses++;
      return undefined;
    }

    if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.stats.misses++;
      return undefined;
    }

    this.stats.hits++;
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttl?: number): void {
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
  }

  delete(key: string): boolean {
    return this.store.delete(key);
  }

  exists(key: string): boolean {
    const entry = this.store.get(key);

    if (!entry) {
      return false;
    }

    if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return false;
    }

    return true;
  }

  clear(): void {
    this.store.clear();
    this.stats.hits = 0;
    this.stats.misses = 0;
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

  keys(): string[] {
    return Array.from(this.store.keys());
  }

  size(): number {
    return this.store.size;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (entry.expiresAt !== null && now > entry.expiresAt) {
        this.store.delete(key);
      }
    }
  }

  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.store.clear();
  }
}

export const cache = new Cache({ defaultTTL: 300_000, cleanupInterval: 60_000 });

export default cache;
