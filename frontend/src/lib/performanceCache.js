const memoryCache = new Map();

export function cacheKey(name, parts = {}) {
  return `${name}:${JSON.stringify(parts)}`;
}

export function getCached(key, maxAgeMs = 15000) {
  const item = memoryCache.get(key);

  if (!item) return null;

  if (Date.now() - item.time > maxAgeMs) {
    memoryCache.delete(key);
    return null;
  }

  return item.value;
}

export function setCached(key, value) {
  memoryCache.set(key, {
    value,
    time: Date.now()
  });

  return value;
}

export function clearCache(prefix = "") {
  if (!prefix) {
    memoryCache.clear();
    return;
  }

  for (const key of memoryCache.keys()) {
    if (key.startsWith(prefix)) {
      memoryCache.delete(key);
    }
  }
}

export async function cachedRequest(key, requestFn, maxAgeMs = 15000) {
  const cached = getCached(key, maxAgeMs);

  if (cached) return cached;

  const value = await requestFn();
  return setCached(key, value);
}
