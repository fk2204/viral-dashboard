import { NextRequest, NextResponse } from "next/server";
import { generateTrendData } from "@/lib/trends";
import { generateFiveConcepts } from "@/lib/generator";
import { v4 as uuidv4 } from "uuid";
import { Generation } from "@/types";
import { cacheGeneration } from "@/lib/concept-cache";
import { handleApiError } from "@/lib/error-handler";
import { withRateLimit } from "@/middleware/rate-limit";
import { getAuthenticatedUser, checkQuota, decrementQuota } from "@/lib/auth";
import { saveGeneration } from "@/lib/storage-prisma";

async function handlePost(req: NextRequest) {
  try {
    // Authenticate user and set tenant context
    const user = await getAuthenticatedUser();

    // Check quota
    const { allowed, remaining } = await checkQuota();
    if (!allowed) {
      return NextResponse.json(
        {
          error: "Quota exceeded",
          code: "QUOTA_EXCEEDED",
          details: `You've used all ${user.monthlyQuota} concepts this month. Upgrade your plan or wait for quota reset.`,
        },
        { status: 429 }
      );
    }

    // Generate trend data (now async - fetches from APIs)
    const trends = await generateTrendData();

    // Generate 5 diverse concepts
    const concepts = generateFiveConcepts(trends);

    // Create generation object
    const generation: Generation = {
      id: uuidv4(),
      date: new Date().toISOString(),
      concepts,
      trends,
      isFavorite: false,
    };

    // Save to database (tenant-scoped)
    await saveGeneration(generation);

    // Cache generation for reflexion analysis (48h TTL)
    cacheGeneration(generation);

    // Decrement quota (5 concepts generated)
    await decrementQuota(5);

    return NextResponse.json({
      ...generation,
      quota: {
        used: user.usedQuota + 5,
        total: user.monthlyQuota,
        remaining: remaining - 5,
      },
    });
  } catch (error) {
    const { error: errorMessage, statusCode, code } = handleApiError(
      error,
      "Failed to generate concepts",
      { endpoint: "/api/generate", method: "POST" }
    );

    return NextResponse.json({ error: errorMessage, code }, { status: statusCode });
  }
}

// Apply rate limiting: 10 requests per 10 seconds
export const POST = withRateLimit(handlePost);
