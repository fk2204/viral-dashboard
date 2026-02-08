/**
 * Rate limit middleware for API routes
 *
 * Supports both IP-based and user-based rate limiting
 */

import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { createRateLimitError } from "@/lib/error-handler";
import { auth } from "@clerk/nextjs/server";
import { validateApiKey } from "@/lib/auth";

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
 *
 * Priority: User ID > API Key > IP Address
 */
async function getIdentifier(req: NextRequest): Promise<string> {
  // 1. Try Clerk authentication (user session)
  try {
    const { userId } = await auth();
    if (userId) {
      return `user:${userId}`;
    }
  } catch (error) {
    // Not authenticated via Clerk
  }

  // 2. Try API key authentication
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const apiKey = authHeader.substring(7);
    try {
      const user = await validateApiKey(apiKey);
      if (user) {
        return `apikey:${user.userId}`;
      }
    } catch (error) {
      // Invalid API key, fall through to IP-based rate limiting
    }
  }

  // 3. Fallback to IP-based rate limiting
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return `ip:${forwarded.split(",")[0].trim()}`;
  }

  const realIp = req.headers.get("x-real-ip");
  if (realIp) {
    return `ip:${realIp}`;
  }

  // Last resort
  return "ip:anonymous";
}
