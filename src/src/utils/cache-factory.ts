import { ICache, Cache, CacheOptions } from './cache';
import { RedisCache, RedisCacheConfig } from './redis-cache';

export interface CacheConfig extends CacheOptions {
  redis?: RedisCacheConfig['redis'];
}

export function createCache(config: CacheConfig): ICache {
  if (config.redis) {
    try {
      const redisCache = new RedisCache({
        ...config,
        redis: config.redis,
      });
      console.log('[Cache] Redis cache initialized');
      return redisCache;
    } catch (err) {
      console.warn('[Cache] Failed to create Redis cache, falling back to in-memory:', err);
    }
  }

  console.log('[Cache] Using in-memory cache');
  return new Cache(config);
}
