import Redis from "ioredis";

// In-memory fallback cache when Redis is offline or not configured
class MemoryCache {
  constructor() {
    this.store = new Map();
  }

  async get(key) {
    const item = this.store.get(key);
    if (!item) return null;
    if (item.expiry && Date.now() > item.expiry) {
      this.store.delete(key);
      return null;
    }
    return item.value;
  }

  async set(key, value, ttlSeconds = 3600) {
    const expiry = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
    this.store.set(key, { value, expiry });
    return "OK";
  }

  async del(patternOrKey) {
    if (patternOrKey.includes("*")) {
      const regex = new RegExp(`^${patternOrKey.replace(/\*/g, ".*")}$`);
      for (const k of this.store.keys()) {
        if (regex.test(k)) this.store.delete(k);
      }
    } else {
      this.store.delete(patternOrKey);
    }
    return 1;
  }
}

const memoryFallback = new MemoryCache();
let redisClient = null;
let isRedisConnected = false;

const redisUrl = process.env.REDIS_URL || (process.env.REDIS_HOST ? `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT || 6379}` : null);

if (redisUrl) {
  try {
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      connectTimeout: 4000,
      retryStrategy: (times) => (times > 3 ? null : Math.min(times * 1000, 3000)),
    });

    redisClient.on("connect", () => {
      isRedisConnected = true;
      console.log("Redis Connected successfully.");
    });

    redisClient.on("error", (err) => {
      isRedisConnected = false;
      console.warn(`[Redis Caching] Redis error: ${err.message}. Using in-memory fallback.`);
    });
  } catch (err) {
    console.warn(`[Redis Caching] Could not initialize Redis client. Using in-memory fallback.`);
  }
} else {
  console.log("[Redis Caching] REDIS_URL not set. Running with high-performance in-memory cache.");
}

/**
 * Get value from cache (parsed JSON or raw string)
 */
export async function getCache(key) {
  try {
    if (isRedisConnected && redisClient) {
      const data = await redisClient.get(key);
      return data ? JSON.parse(data) : null;
    }
    return await memoryFallback.get(key);
  } catch (err) {
    return await memoryFallback.get(key);
  }
}

/**
 * Set value in cache with TTL in seconds
 */
export async function setCache(key, value, ttlSeconds = 3600) {
  try {
    if (isRedisConnected && redisClient) {
      await redisClient.set(key, JSON.stringify(value), "EX", ttlSeconds);
      return;
    }
    await memoryFallback.set(key, value, ttlSeconds);
  } catch (err) {
    await memoryFallback.set(key, value, ttlSeconds);
  }
}

/**
 * Delete cache key or wildcard pattern
 */
export async function delCache(patternOrKey) {
  try {
    if (isRedisConnected && redisClient) {
      if (patternOrKey.includes("*")) {
        const keys = await redisClient.keys(patternOrKey);
        if (keys.length > 0) {
          await redisClient.del(...keys);
        }
      } else {
        await redisClient.del(patternOrKey);
      }
    }
  } catch (err) {
    // fallback
  }
  await memoryFallback.del(patternOrKey);
}

/**
 * Express Route Middleware for Automatic Caching
 * Usage: router.get('/endpoint', cacheMiddleware(3600), handler)
 */
export function cacheMiddleware(ttlSeconds = 3600) {
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== "GET") return next();

    const cacheKey = `cache:${req.originalUrl || req.url}`;
    try {
      const cached = await getCache(cacheKey);
      if (cached) {
        res.setHeader("X-Cache", "HIT");
        return res.json(cached);
      }

      // Intercept res.json to populate cache
      res.setHeader("X-Cache", "MISS");
      const originalJson = res.json.bind(res);
      res.json = (body) => {
        // Only cache successful 200 responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          setCache(cacheKey, body, ttlSeconds).catch(() => {});
        }
        return originalJson(body);
      };
      next();
    } catch {
      next();
    }
  };
}

export default {
  getCache,
  setCache,
  delCache,
  cacheMiddleware,
};
