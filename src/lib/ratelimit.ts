import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// =============================================
// RATE LIMITING - PRODUCTION ONLY
// Staging (Vercel) = disabled, Production (VPS) = enabled
// =============================================

// Check if this is staging environment (Vercel preview)
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || '';
const IS_STAGING = APP_URL.includes('vercel.app') || APP_URL.includes('localhost');
const IS_PRODUCTION = APP_URL.includes('kfarma.asisyaconsulting.id');

// Only initialize Redis for production
const redis = IS_PRODUCTION && process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

// =============================================
// Rate Limiter Factory
// =============================================

function createRateLimiter(
  windowSize: number,
  windowUnit: 's' | 'm' | 'h',
  prefix: string
): Ratelimit | null {
  // Skip rate limiting for staging
  if (IS_STAGING || !redis) return null;

  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(windowSize, `${windowSize} ${windowUnit}` as `${number} s` | `${number} m` | `${number} h`),
    analytics: false,
    prefix: `rl:prod:${prefix}`,
    ephemeralCache: new Map(),
  });
}

// Login Rate Limiter: 10 attempts per 15 minutes
export const loginRateLimiter = createRateLimiter(10, 'm', 'login');

// Submit Exam Rate Limiter: 5 submissions per 5 minutes
export const submitRateLimiter = createRateLimiter(5, 'm', 'submit');

// API Rate Limiter: 300 requests per minute
export const apiRateLimiter = createRateLimiter(300, 'm', 'api');

// =============================================
// Rate Limit Check Function
// =============================================

export async function checkRateLimit(
  limiter: Ratelimit | null,
  identifier: string,
  timeoutMs: number = 1000,
  failOpen: boolean = false // ✅ NEW: Allow fail-open for critical paths
): Promise<{ success: boolean; remaining?: number; reset?: number }> {
  
  // Staging = always allow (no rate limiting)
  if (IS_STAGING) {
    return { success: true };
  }

  // Production without limiter configured
  if (!limiter) {
    if (failOpen) {
      console.warn('⚠️ Rate limiter not configured - allowing request (fail-open mode)');
      return { success: true };
    }
    console.error('🚨 CRITICAL: Rate limiter not configured in production');
    return { success: false };
  }

  try {
    const result = await Promise.race([
      limiter.limit(identifier),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs))
    ]);

    // Timeout handling
    if (result === null) {
      if (failOpen) {
        console.warn('⚠️ Rate limit timeout - allowing request (fail-open mode)');
        return { success: true };
      }
      console.error('🚨 Rate limit timeout - blocking request');
      return { success: false };
    }

    return {
      success: result.success,
      remaining: result.remaining,
      reset: result.reset,
    };
  } catch (error) {
    console.error('❌ Rate limit error:', error);
    // ✅ SECURITY FIX: Fail-open for critical paths (exam submit) to prevent Redis outage = total outage
    if (failOpen) {
      console.warn('⚠️ Rate limit error - allowing request (fail-open mode)');
      return { success: true };
    }
    return { success: false };
  }
}

// =============================================
// Helper: Get client IP from request headers
// =============================================

export function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  if (realIP) {
    return realIP;
  }
  return 'unknown';
}
