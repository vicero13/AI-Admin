import { Cache } from '../../../src/utils/cache';

describe('Cache', () => {
  let cache: Cache;

  beforeEach(() => {
    jest.useFakeTimers();
    cache = new Cache({ defaultTTL: 5000, maxSize: 5, cleanupInterval: 0 });
  });

  afterEach(async () => {
    await cache.destroy();
    jest.useRealTimers();
  });

  describe('get/set', () => {
    it('stores and retrieves values', async () => {
      await cache.set('key1', 'value1');
      const result = await cache.get<string>('key1');
      expect(result).toBe('value1');
    });

    it('stores objects correctly', async () => {
      const obj = { name: 'test', count: 42 };
      await cache.set('obj', obj);
      const result = await cache.get<typeof obj>('obj');
      expect(result).toEqual(obj);
    });
  });

  describe('get missing key', () => {
    it('returns undefined for missing keys', async () => {
      const result = await cache.get('nonexistent');
      expect(result).toBeUndefined();
    });
  });

  describe('TTL expiration', () => {
    it('expires entries after TTL', async () => {
      await cache.set('ttl-key', 'ttl-value', 1000);

      const before = await cache.get<string>('ttl-key');
      expect(before).toBe('ttl-value');

      jest.advanceTimersByTime(1500);

      const after = await cache.get<string>('ttl-key');
      expect(after).toBeUndefined();
    });

    it('does not expire entries before TTL', async () => {
      await cache.set('ttl-key', 'ttl-value', 2000);

      jest.advanceTimersByTime(1000);

      const result = await cache.get<string>('ttl-key');
      expect(result).toBe('ttl-value');
    });

    it('uses default TTL when not specified', async () => {
      await cache.set('default-ttl', 'value');

      jest.advanceTimersByTime(4000);
      const before = await cache.get<string>('default-ttl');
      expect(before).toBe('value');

      jest.advanceTimersByTime(2000);
      const after = await cache.get<string>('default-ttl');
      expect(after).toBeUndefined();
    });
  });

  describe('eviction', () => {
    it('evicts oldest entry when maxSize is reached', async () => {
      await cache.set('a', 1);
      await cache.set('b', 2);
      await cache.set('c', 3);
      await cache.set('d', 4);
      await cache.set('e', 5);

      // Cache is full (maxSize=5). Adding one more should evict 'a'.
      await cache.set('f', 6);

      const evicted = await cache.get<number>('a');
      expect(evicted).toBeUndefined();

      const kept = await cache.get<number>('f');
      expect(kept).toBe(6);

      const size = await cache.size();
      expect(size).toBe(5);
    });
  });

  describe('delete', () => {
    it('removes an existing entry', async () => {
      await cache.set('del-key', 'del-value');

      const deleted = await cache.delete('del-key');
      expect(deleted).toBe(true);

      const result = await cache.get('del-key');
      expect(result).toBeUndefined();
    });

    it('returns false for non-existent key', async () => {
      const deleted = await cache.delete('nonexistent');
      expect(deleted).toBe(false);
    });
  });

  describe('exists', () => {
    it('returns true for existing key', async () => {
      await cache.set('exists-key', 'value');
      const result = await cache.exists('exists-key');
      expect(result).toBe(true);
    });

    it('returns false for missing key', async () => {
      const result = await cache.exists('missing');
      expect(result).toBe(false);
    });

    it('returns false for expired key', async () => {
      await cache.set('exp-key', 'value', 500);

      jest.advanceTimersByTime(600);

      const result = await cache.exists('exp-key');
      expect(result).toBe(false);
    });
  });

  describe('clear', () => {
    it('clears all entries and stats', async () => {
      await cache.set('k1', 'v1');
      await cache.set('k2', 'v2');
      await cache.get('k1'); // hit
      await cache.get('missing'); // miss

      await cache.clear();

      const size = await cache.size();
      expect(size).toBe(0);

      const stats = cache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.size).toBe(0);
    });
  });

  describe('getStats', () => {
    it('tracks hits and misses', async () => {
      await cache.set('stat-key', 'value');

      await cache.get('stat-key'); // hit
      await cache.get('stat-key'); // hit
      await cache.get('nonexistent'); // miss

      const stats = cache.getStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBeCloseTo(2 / 3);
      expect(stats.size).toBe(1);
    });

    it('returns zero hit rate when no accesses', () => {
      const stats = cache.getStats();
      expect(stats.hitRate).toBe(0);
    });
  });

  describe('keys', () => {
    it('returns all keys', async () => {
      await cache.set('x', 1);
      await cache.set('y', 2);
      await cache.set('z', 3);

      const keys = await cache.keys();
      expect(keys).toEqual(expect.arrayContaining(['x', 'y', 'z']));
      expect(keys.length).toBe(3);
    });
  });

  describe('size', () => {
    it('returns correct count', async () => {
      expect(await cache.size()).toBe(0);

      await cache.set('a', 1);
      expect(await cache.size()).toBe(1);

      await cache.set('b', 2);
      expect(await cache.size()).toBe(2);

      await cache.delete('a');
      expect(await cache.size()).toBe(1);
    });
  });

  describe('destroy', () => {
    it('clears all entries and stops cleanup timer', async () => {
      await cache.set('d-key', 'value');

      await cache.destroy();

      const size = await cache.size();
      expect(size).toBe(0);
    });
  });
});
