/**
 * Rate limit middleware for API routes
 */

import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { createRateLimitError } from "@/lib/error-handler";

interface RateLimitConfig {
  limit: number;
  windowMs: number;
}

/**
 * Wrap API route handler with rate limiting
 */
export function withRateLimit(
  handler: (req: NextRequest) => Promise<NextResponse>,
  config: RateLimitConfig = { limit: 10, windowMs: 10000 }
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    // Get identifier from request
    const identifier = getIdentifier(req);

    // Check rate limit
    const result = await checkRateLimit(identifier, config);

    // Add rate limit headers
    const headers = {
      "X-RateLimit-Limit": result.limit.toString(),
      "X-RateLimit-Remaining": result.remaining.toString(),
      "X-RateLimit-Reset": result.reset.toString(),
    };

    // Rate limit exceeded
    if (!result.success) {
      const error = createRateLimitError(result.reset);
      return NextResponse.json(
        { error: error.userMessage, code: error.code },
        { status: error.statusCode, headers }
      );
    }

    // Execute handler
    const response = await handler(req);

    // Add rate limit headers to response
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  };
}

/**
 * Get identifier for rate limiting
 */
function getIdentifier(req: NextRequest): string {
  // Try to get IP from headers (for proxy/load balancer scenarios)
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  const realIp = req.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  // Fallback to a generic identifier
  return "anonymous";
}
