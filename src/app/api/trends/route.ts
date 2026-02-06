import { NextRequest, NextResponse } from "next/server";
import { generateTrendData, scoreTrend, refreshTrends } from "@/lib/trends";
import { withRateLimit } from "@/middleware/rate-limit";
import { handleApiError } from "@/lib/error-handler";

async function handleGet(req: NextRequest) {
  try {
    const trends = await generateTrendData();

    const enrichedTrends = trends.map((trend) => ({
      ...trend,
      potentialLabel: scoreTrend(trend),
    }));

    return NextResponse.json({
      trends: enrichedTrends,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    const { error: errorMessage, statusCode, code } = handleApiError(
      error,
      "Failed to fetch trends",
      { endpoint: "/api/trends", method: "GET" }
    );

    return NextResponse.json({ error: errorMessage, code }, { status: statusCode });
  }
}

async function handlePost(req: NextRequest) {
  try {
    refreshTrends();
    const trends = await generateTrendData();

    const enrichedTrends = trends.map((trend) => ({
      ...trend,
      potentialLabel: scoreTrend(trend),
    }));

    return NextResponse.json({
      trends: enrichedTrends,
      fetchedAt: new Date().toISOString(),
      refreshed: true,
    });
  } catch (error) {
    const { error: errorMessage, statusCode, code } = handleApiError(
      error,
      "Failed to refresh trends",
      { endpoint: "/api/trends", method: "POST" }
    );

    return NextResponse.json({ error: errorMessage, code }, { status: statusCode });
  }
}

// Apply rate limiting: 10 requests per 10 seconds
export const GET = withRateLimit(handleGet);
export const POST = withRateLimit(handlePost);
