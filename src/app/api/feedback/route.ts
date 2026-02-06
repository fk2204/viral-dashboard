import { NextRequest, NextResponse } from "next/server";
import { recordPerformance } from "@/lib/learning/performance-tracker";
import { reflectOnPerformance } from "@/lib/learning/reflexion";
import { validateFeedbackRequest } from "@/lib/validators";
import { getConcept } from "@/lib/concept-cache";
import { handleApiError, ERROR_CODES } from "@/lib/error-handler";
import { withRateLimit } from "@/middleware/rate-limit";
import { PerformanceFeedback } from "@/types";

async function handlePost(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request with comprehensive checks
    const validation = validateFeedbackRequest(body);

    if (!validation.valid) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validation.errors,
          code: ERROR_CODES.VALIDATION_FAILED,
        },
        { status: 400 }
      );
    }

    const { conceptId, category, platform, metrics } = validation.data!;

    // Retrieve concept from cache to get title
    const concept = getConcept(conceptId);
    const conceptTitle = concept?.title || "Unknown Concept";

    // Build feedback entry
    const feedbackData = {
      conceptId,
      conceptTitle,
      category,
      platform,
      metrics,
    };

    // Record the performance feedback
    const entry = recordPerformance(feedbackData);

    // Auto-trigger reflexion analysis (async, don't block response)
    triggerReflexionAnalysis(conceptId, entry).catch((err) => {
      console.error("Reflexion auto-trigger failed:", err);
      // Don't fail the request if reflexion fails
    });

    return NextResponse.json({
      success: true,
      entry: {
        id: entry.id,
        engagementRate: entry.engagementRate,
        reportedAt: entry.reportedAt,
      },
      message: `Performance recorded: ${entry.engagementRate}% engagement rate`,
    });
  } catch (error) {
    const { error: errorMessage, statusCode, code } = handleApiError(
      error,
      "Failed to process feedback",
      { endpoint: "/api/feedback", method: "POST" }
    );

    return NextResponse.json({ error: errorMessage, code }, { status: statusCode });
  }
}

/**
 * Helper: Trigger reflexion analysis asynchronously
 */
async function triggerReflexionAnalysis(
  conceptId: string,
  feedback: PerformanceFeedback
): Promise<void> {
  try {
    // Retrieve concept from server-side cache
    const concept = getConcept(conceptId);

    if (!concept) {
      console.log(`⏭️ Reflexion skipped - concept not in cache (>48h old or not generated)`);
      return;
    }

    // Run reflexion analysis
    const critique = await reflectOnPerformance(concept, feedback);

    console.log(`✅ Reflexion complete for ${conceptId}`);
    console.log(`   Confidence: ${critique.confidenceLevel}`);
    console.log(`   Predicted: ${critique.performanceGap.predictedVirality.toFixed(1)}%, Actual: ${critique.performanceGap.actualViralityScore.toFixed(1)}%`);
    console.log(`   Gap: ${critique.performanceGap.gap.toFixed(1)}%`);
  } catch (error) {
    console.error("Reflexion analysis error:", error);
  }
}

async function handleGet(req: NextRequest) {
  try {
    const {
      getRecentFeedback,
      getPlatformComparison,
      getTopPerformingCategories,
    } = await import("@/lib/learning/performance-tracker");

    const recent = getRecentFeedback(10);
    const platformComparison = getPlatformComparison();
    const topCategories = getTopPerformingCategories(5);

    return NextResponse.json({
      recent,
      platformComparison,
      topCategories,
    });
  } catch (error) {
    const { error: errorMessage, statusCode, code } = handleApiError(
      error,
      "Failed to retrieve feedback data",
      { endpoint: "/api/feedback", method: "GET" }
    );

    return NextResponse.json({ error: errorMessage, code }, { status: statusCode });
  }
}

// Apply rate limiting: 10 requests per 10 seconds
export const POST = withRateLimit(handlePost);
export const GET = withRateLimit(handleGet);
