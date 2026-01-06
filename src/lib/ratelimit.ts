import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// =============================================
// OPTIMIZED RATE LIMITING FOR 800 CONCURRENT USERS
// =============================================

// Initialize Redis connection (only if credentials are provided)
const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  })
  : null;

// =============================================
// Rate Limiter Factory with Timeout
// =============================================

function createRateLimiter(
  windowSize: number,
  windowUnit: 's' | 'm' | 'h',
  prefix: string
): Ratelimit | null {
  if (!redis) return null;

  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(windowSize, `${windowSize} ${windowUnit}` as `${number} s` | `${number} m` | `${number} h`),
    analytics: false, // Disable analytics for better performance
    prefix: `rl:${prefix}`,
    ephemeralCache: new Map(), // Use in-memory cache for performance
  });
}

// Login Rate Limiter: 10 attempts per 15 minutes (more generous)
export const loginRateLimiter = createRateLimiter(10, 'm', 'login');

// Submit Exam Rate Limiter: 5 submissions per 5 minutes
export const submitRateLimiter = createRateLimiter(5, 'm', 'submit');

// API Rate Limiter: 300 requests per minute (for 800 users)
export const apiRateLimiter = createRateLimiter(300, 'm', 'api');

// =============================================
// Non-blocking Rate Limit Check
// =============================================

export async function checkRateLimit(
  limiter: Ratelimit | null,
  identifier: string,
  timeoutMs: number = 1000
): Promise<{ success: boolean; remaining?: number; reset?: number }> {
  // No limiter configured
  if (!limiter) {
    // In production without rate limiter = FAIL CLOSED (reject)
    if (process.env.NODE_ENV === 'production') {
      console.error('🚨 CRITICAL: Rate limiter not configured in production');
      return { success: false };
    }
    // In development = allow (for testing)
    console.warn('⚠️ Rate limiting bypassed in development mode');
    return { success: true };
  }

  try {
    // Race between rate limit check and timeout
    const result = await Promise.race([
      limiter.limit(identifier),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs))
    ]);

    // Timeout occurred - FAIL CLOSED in production
    if (result === null) {
      if (process.env.NODE_ENV === 'production') {
        console.error('🚨 Rate limit timeout - blocking request');
        return { success: false };
      }
      console.warn('⚠️ Rate limit timeout, allowing in dev');
      return { success: true };
    }

    return {
      success: result.success,
      remaining: result.remaining,
      reset: result.reset,
    };
  } catch (error) {
    // Redis error - FAIL CLOSED in production
    console.error('❌ Rate limit error:', error);
    if (process.env.NODE_ENV === 'production') {
      return { success: false };
    }
    return { success: true };
  }
}
