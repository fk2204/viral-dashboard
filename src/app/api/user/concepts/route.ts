/**
 * API Route: Get User's Concepts (Tenant-Scoped)
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, validateApiKey } from "@/lib/auth";
import { getGenerations } from "@/lib/storage-prisma";

export async function GET(req: NextRequest) {
  try {
    // Support both Clerk auth and API key auth
    const authHeader = req.headers.get("authorization");

    if (authHeader?.startsWith("Bearer ")) {
      const apiKey = authHeader.substring(7);
      const user = await validateApiKey(apiKey);

      if (!user) {
        return NextResponse.json(
          { error: "Invalid API key" },
          { status: 401 }
        );
      }
    } else {
      // Use Clerk auth
      await getAuthenticatedUser();
    }

    // Get tenant-scoped generations
    const generations = await getGenerations();

    return NextResponse.json({
      total: generations.length,
      generations,
    });
  } catch (error) {
    console.error("Get concepts error:", error);
    return NextResponse.json(
      { error: "Failed to fetch concepts" },
      { status: 500 }
    );
  }
}
