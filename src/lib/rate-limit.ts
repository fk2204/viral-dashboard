/**
 * Rate limiting with sliding window algorithm
 * Uses in-memory storage for development, Upstash Redis for production
 */

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

interface RateLimitConfig {
  limit: number;
  windowMs: number;
}

// In-memory storage for development
const requestCounts = new Map<string, { count: number; resetAt: number }>();

/**
 * Check rate limit for identifier
 */
export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = { limit: 10, windowMs: 10000 }
): Promise<RateLimitResult> {
  // Skip rate limiting in development
  if (process.env.NODE_ENV === "development" && !process.env.UPSTASH_REDIS_REST_URL) {
    return {
      success: true,
      limit: config.limit,
      remaining: config.limit,
      reset: Date.now() + config.windowMs,
    };
  }

  // Use Upstash Redis in production if configured
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    return checkRateLimitWithRedis(identifier, config);
  }

  // Fallback to in-memory rate limiting
  return checkRateLimitInMemory(identifier, config);
}

/**
 * In-memory rate limiting (for development)
 */
function checkRateLimitInMemory(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const record = requestCounts.get(identifier);

  // No record or expired window
  if (!record || now > record.resetAt) {
    requestCounts.set(identifier, {
      count: 1,
      resetAt: now + config.windowMs,
    });

    return {
      success: true,
      limit: config.limit,
      remaining: config.limit - 1,
      reset: now + config.windowMs,
    };
  }

  // Within window
  record.count++;

  if (record.count > config.limit) {
    return {
      success: false,
      limit: config.limit,
      remaining: 0,
      reset: record.resetAt,
    };
  }

  return {
    success: true,
    limit: config.limit,
    remaining: config.limit - record.count,
    reset: record.resetAt,
  };
}

/**
 * Redis-based rate limiting (for production)
 */
async function checkRateLimitWithRedis(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  try {
    const { Ratelimit } = await import("@upstash/ratelimit");
    const { Redis } = await import("@upstash/redis");

    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });

    const ratelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(
        config.limit,
        `${config.windowMs}ms`
      ),
      analytics: true,
      prefix: "viral-dashboard",
    });

    const result = await ratelimit.limit(identifier);

    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    };
  } catch (error) {
    console.error("Redis rate limit error:", error);
    // Fallback to in-memory on Redis error
    return checkRateLimitInMemory(identifier, config);
  }
}

/**
 * Clean up expired in-memory entries
 */
export function cleanupExpiredEntries(): void {
  const now = Date.now();
  for (const [key, record] of requestCounts.entries()) {
    if (now > record.resetAt) {
      requestCounts.delete(key);
    }
  }
}

// Periodic cleanup every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(cleanupExpiredEntries, 5 * 60 * 1000);
}
