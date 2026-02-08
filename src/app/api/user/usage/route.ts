/**
 * API Route: Get User's Quota Usage
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, validateApiKey } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    // Support both Clerk auth and API key auth
    const authHeader = req.headers.get("authorization");

    let user;
    if (authHeader?.startsWith("Bearer ")) {
      const apiKey = authHeader.substring(7);
      const validatedUser = await validateApiKey(apiKey);

      if (!validatedUser) {
        return NextResponse.json(
          { error: "Invalid API key" },
          { status: 401 }
        );
      }
      user = validatedUser;
    } else {
      // Use Clerk auth
      user = await getAuthenticatedUser();
    }

    return NextResponse.json({
      subscription: {
        tier: user.subscriptionTier,
        status: "active",
      },
      quota: {
        total: user.monthlyQuota,
        used: user.usedQuota,
        remaining: user.monthlyQuota - user.usedQuota,
        percentage: ((user.usedQuota / user.monthlyQuota) * 100).toFixed(1),
      },
      tenant: {
        id: user.tenantId,
      },
    });
  } catch (error) {
    console.error("Get usage error:", error);
    return NextResponse.json(
      { error: "Failed to fetch usage" },
      { status: 500 }
    );
  }
}
