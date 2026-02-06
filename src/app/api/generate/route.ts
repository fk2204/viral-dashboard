import { NextRequest, NextResponse } from "next/server";
import { generateTrendData } from "@/lib/trends";
import { generateFiveConcepts } from "@/lib/generator";
import { v4 as uuidv4 } from "uuid";
import { Generation } from "@/types";
import { cacheGeneration } from "@/lib/concept-cache";
import { handleApiError } from "@/lib/error-handler";
import { withRateLimit } from "@/middleware/rate-limit";

async function handlePost(req: NextRequest) {
  try {
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

    // Cache generation for reflexion analysis (48h TTL)
    cacheGeneration(generation);

    return NextResponse.json(generation);
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
