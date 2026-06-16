/**
 * Simple in-memory cache for API responses.
 * Uses LRU-like expiration based on TTL.
 */

type CacheEntry<T = unknown> = {
  value: T;
  expiresAt: number;
};

const cache = new Map<string, CacheEntry>();

type CacheOptions = {
  ttl?: number; // Time to live in milliseconds (default: 60s)
  tags?: string[]; // Tags for grouped invalidation
};

export function cached<T>(
  key: string,
  fn: () => Promise<T>,
  options: CacheOptions = {},
): Promise<T> {
  const { ttl = 60_000, tags } = options;

  const entry = cache.get(key);
  if (entry && entry.expiresAt > Date.now()) {
    return Promise.resolve(entry.value as T);
  }

  // If expired or missing, fetch and cache
  return fn().then((value) => {
    cache.set(key, { value, expiresAt: Date.now() + ttl });

    // Optionally store tag mapping for invalidation
    if (tags?.length) {
      for (const tag of tags) {
        const tagKey = `__tag:${tag}`;
        const tagEntries = cache.get(tagKey);
        if (tagEntries) {
          (tagEntries.value as string[]).push(key);
        } else {
          cache.set(tagKey, { value: [key], expiresAt: Date.now() + ttl * 10 });
        }
      }
    }

    return value;
  });
}

/**
 * Invalidate cache entries by tag or specific key.
 */
export function invalidateCache(keyOrTag: string): void {
  // Try exact key match first
  cache.delete(keyOrTag);

  // Try tag-based invalidation
  const tagKey = `__tag:${keyOrTag}`;
  const tagEntries = cache.get(tagKey);
  if (tagEntries && Array.isArray(tagEntries.value)) {
    for (const key of tagEntries.value as string[]) {
      cache.delete(key);
    }
    cache.delete(tagKey);
  }
}

/**
 * Clear entire cache (use sparingly).
 */
export function clearCache(): void {
  cache.clear();
}

/**
 * Get cache statistics (for debugging).
 */
export function getCacheStats(): { size: number; keys: string[] } {
  return {
    size: cache.size,
    keys: Array.from(cache.keys()).filter((k) => !k.startsWith('__tag:')),
  };
}
