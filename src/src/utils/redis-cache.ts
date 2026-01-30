import Redis from 'ioredis';
import { ICache, CacheStats, CacheOptions } from './cache';

export interface RedisCacheConfig extends CacheOptions {
  redis: {
    host: string;
    port: number;
    password?: string;
    db?: number;
    keyPrefix?: string;
  };
}

export class RedisCache implements ICache {
  private client: Redis;
  private stats: { hits: number; misses: number };
  private defaultTTL: number | null;
  private keyPrefix: string;
  private connected: boolean = false;

  constructor(config: RedisCacheConfig) {
    this.stats = { hits: 0, misses: 0 };
    this.defaultTTL = config.defaultTTL ?? null;
    this.keyPrefix = config.redis.keyPrefix ?? 'cache:';

    this.client = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      db: config.redis.db ?? 0,
      lazyConnect: false,
      retryStrategy: (times: number) => {
        if (times > 3) {
          console.warn('[RedisCache] Max reconnection attempts reached');
          return null;
        }
        return Math.min(times * 200, 2000);
      },
    });

    this.client.on('connect', () => {
      this.connected = true;
      console.log('[RedisCache] Connected to Redis');
    });

    this.client.on('error', (err: Error) => {
      this.connected = false;
      console.warn('[RedisCache] Redis error:', err.message);
    });

    this.client.on('close', () => {
      this.connected = false;
    });
  }

  private prefixedKey(key: string): string {
    return `${this.keyPrefix}${key}`;
  }

  async get<T>(key: string): Promise<T | undefined> {
    try {
      const raw = await this.client.get(this.prefixedKey(key));
      if (raw === null) {
        this.stats.misses++;
        return undefined;
      }
      this.stats.hits++;
      return JSON.parse(raw) as T;
    } catch (err) {
      console.warn('[RedisCache] get error:', (err as Error).message);
      this.stats.misses++;
      return undefined;
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      const effectiveTTL = ttl ?? this.defaultTTL;

      if (effectiveTTL !== null) {
        const ttlSeconds = Math.ceil(effectiveTTL / 1000);
        await this.client.set(this.prefixedKey(key), serialized, 'EX', ttlSeconds);
      } else {
        await this.client.set(this.prefixedKey(key), serialized);
      }
    } catch (err) {
      console.warn('[RedisCache] set error:', (err as Error).message);
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      const result = await this.client.del(this.prefixedKey(key));
      return result > 0;
    } catch (err) {
      console.warn('[RedisCache] delete error:', (err as Error).message);
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(this.prefixedKey(key));
      return result > 0;
    } catch (err) {
      console.warn('[RedisCache] exists error:', (err as Error).message);
      return false;
    }
  }

  async clear(): Promise<void> {
    try {
      const keys = await this.scanKeys();
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
      this.stats.hits = 0;
      this.stats.misses = 0;
    } catch (err) {
      console.warn('[RedisCache] clear error:', (err as Error).message);
    }
  }

  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: total > 0 ? this.stats.hits / total : 0,
      size: 0, // size is async; use size() method for accurate count
    };
  }

  async keys(): Promise<string[]> {
    try {
      const rawKeys = await this.scanKeys();
      return rawKeys.map((k) => k.slice(this.keyPrefix.length));
    } catch (err) {
      console.warn('[RedisCache] keys error:', (err as Error).message);
      return [];
    }
  }

  async size(): Promise<number> {
    try {
      const keys = await this.scanKeys();
      return keys.length;
    } catch (err) {
      console.warn('[RedisCache] size error:', (err as Error).message);
      return 0;
    }
  }

  async destroy(): Promise<void> {
    try {
      await this.client.quit();
      this.connected = false;
    } catch (err) {
      console.warn('[RedisCache] destroy error:', (err as Error).message);
    }
  }

  private async scanKeys(): Promise<string[]> {
    const pattern = `${this.keyPrefix}*`;
    const allKeys: string[] = [];
    let cursor = '0';

    do {
      const [nextCursor, keys] = await this.client.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        100,
      );
      cursor = nextCursor;
      allKeys.push(...keys);
    } while (cursor !== '0');

    return allKeys;
  }
}
