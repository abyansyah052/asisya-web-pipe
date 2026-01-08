// =============================================
// IN-MEMORY CACHE WITH REDIS FALLBACK
// Untuk dashboard dan frequently accessed data
// =============================================

import { Redis } from '@upstash/redis';

// Initialize Redis connection (only if credentials are provided)
let redis: Redis | null = null;
let redisDisabled = false; // Flag to disable after multiple failures
let redisFailCount = 0;
const MAX_REDIS_FAILURES = 3;

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
}

// In-memory cache fallback (for when Redis is not available)
const memoryCache = new Map<string, { data: unknown; expires: number }>();

// =============================================
// GET CACHED DATA
// =============================================
export async function getCached<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds: number = 60
): Promise<T> {
    // Try Redis first (if not disabled after failures)
    if (redis && !redisDisabled) {
        try {
            const cached = await redis.get<T>(key);
            if (cached) {
                redisFailCount = 0; // Reset on success
                return cached;
            }

            // Cache miss - fetch fresh data
            const data = await fetcher();
            
            // Store in Redis (fire and forget)
            redis.setex(key, ttlSeconds, JSON.stringify(data)).catch(() => {});
            
            redisFailCount = 0; // Reset on success
            return data;
        } catch (error) {
            redisFailCount++;
            if (redisFailCount >= MAX_REDIS_FAILURES) {
                console.warn(`Redis disabled after ${MAX_REDIS_FAILURES} failures. Using memory cache.`);
                redisDisabled = true;
            }
            // Fall through to memory cache
        }
    }

    // Fallback to in-memory cache
    const now = Date.now();
    const cached = memoryCache.get(key);
    
    if (cached && cached.expires > now) {
        return cached.data as T;
    }

    // Cache miss - fetch fresh data
    const data = await fetcher();
    
    // Store in memory cache
    memoryCache.set(key, {
        data,
        expires: now + (ttlSeconds * 1000)
    });

    // Clean up expired entries periodically
    if (memoryCache.size > 1000) {
        cleanupMemoryCache();
    }

    return data;
}

// =============================================
// INVALIDATE CACHE
// =============================================
export async function invalidateCache(pattern: string): Promise<void> {
    // Invalidate in Redis
    if (redis) {
        try {
            if (pattern.includes('*')) {
                const keys = await redis.keys(pattern);
                if (keys.length > 0) {
                    await redis.del(...keys);
                }
            } else {
                await redis.del(pattern);
            }
        } catch (error) {
            console.error('Redis invalidation error:', error);
        }
    }

    // Also invalidate in memory cache
    if (pattern.includes('*')) {
        const regex = new RegExp('^' + pattern.replace('*', '.*') + '$');
        for (const key of memoryCache.keys()) {
            if (regex.test(key)) {
                memoryCache.delete(key);
            }
        }
    } else {
        memoryCache.delete(pattern);
    }
}

// =============================================
// SET CACHE DIRECTLY
// =============================================
export async function setCache<T>(
    key: string,
    data: T,
    ttlSeconds: number = 60
): Promise<void> {
    // Store in Redis
    if (redis) {
        try {
            await redis.setex(key, ttlSeconds, JSON.stringify(data));
        } catch (error) {
            console.error('Redis set error:', error);
        }
    }

    // Also store in memory cache
    memoryCache.set(key, {
        data,
        expires: Date.now() + (ttlSeconds * 1000)
    });
}

// =============================================
// CLEANUP EXPIRED MEMORY CACHE
// =============================================
function cleanupMemoryCache(): void {
    const now = Date.now();
    for (const [key, value] of memoryCache.entries()) {
        if (value.expires < now) {
            memoryCache.delete(key);
        }
    }
}

// =============================================
// CACHE STATS (for monitoring)
// =============================================
export function getCacheStats() {
    return {
        redisConnected: !!redis,
        memoryCacheSize: memoryCache.size,
    };
}
