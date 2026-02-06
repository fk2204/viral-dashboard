import { NextRequest, NextResponse } from "next/server";
import {
  reflectOnPerformance,
  getReflexionSummary,
} from "@/lib/learning/reflexion";
import {
  getCritiques,
  getInsights,
  getAdjustments,
} from "@/lib/learning/reflexion-storage";
import { ViralConcept, PerformanceFeedback } from "@/types";
import { withRateLimit } from "@/middleware/rate-limit";
import { handleApiError } from "@/lib/error-handler";

/**
 * POST /api/reflexion
 * Trigger reflexion analysis on a concept + feedback pair
 */
async function handlePost(request: NextRequest) {
  try {
    const body = await request.json();
    const { concept, feedback } = body;

    if (!concept || !feedback) {
      return NextResponse.json(
        { error: 'Missing required fields: concept and feedback' },
        { status: 400 }
      );
    }

    // Validate concept structure
    if (!concept.id || !concept.title || !concept.category) {
      return NextResponse.json(
        { error: 'Invalid concept structure' },
        { status: 400 }
      );
    }

    // Validate feedback structure
    if (!feedback.conceptId || !feedback.platform || !feedback.metrics) {
      return NextResponse.json(
        { error: 'Invalid feedback structure' },
        { status: 400 }
      );
    }

    // Run reflexion
    const critique = await reflectOnPerformance(
      concept as ViralConcept,
      feedback as PerformanceFeedback
    );

    return NextResponse.json({
      success: true,
      critique: {
        id: critique.id,
        gap: critique.performanceGap.gap,
        gapPercentage: critique.performanceGap.gapPercentage,
        direction: critique.performanceGap.direction,
        critique: critique.critique,
        hypothesizedReasons: critique.hypothesizedReasons,
        scoringIssues: critique.scoringIssues,
        adjustmentPlan: critique.adjustmentPlan,
        confidenceLevel: critique.confidenceLevel,
        appliedAt: critique.appliedAt,
      },
      message: `Reflexion complete: ${critique.performanceGap.direction} by ${Math.abs(critique.performanceGap.gapPercentage)}%`,
    });
  } catch (error) {
    const { error: errorMessage, statusCode, code } = handleApiError(
      error,
      "Failed to run reflexion",
      { endpoint: "/api/reflexion", method: "POST" }
    );

    return NextResponse.json({ error: errorMessage, code }, { status: statusCode });
  }
}

/**
 * GET /api/reflexion
 * Retrieve reflexion history and stats
 */
async function handleGet(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'summary';
    const limit = parseInt(searchParams.get('limit') || '20');

    if (type === 'critiques') {
      const critiques = await getCritiques(limit);
      return NextResponse.json({ critiques });
    }

    if (type === 'insights') {
      const category = searchParams.get('category') || undefined;
      const insights = await getInsights(category);
      return NextResponse.json({ insights });
    }

    if (type === 'adjustments') {
      const adjustments = await getAdjustments(limit);
      return NextResponse.json({ adjustments });
    }

    // Default: return summary
    const summary = getReflexionSummary();
    const recentCritiques = getCritiques(5);
    const recentInsights = getInsights();
    const recentAdjustments = getAdjustments(5);

    return NextResponse.json({
      summary,
      recent: {
        critiques: recentCritiques.slice(0, 5),
        insights: recentInsights.slice(0, 5),
        adjustments: recentAdjustments.slice(0, 5),
      },
    });
  } catch (error) {
    const { error: errorMessage, statusCode, code } = handleApiError(
      error,
      "Failed to retrieve reflexion data",
      { endpoint: "/api/reflexion", method: "GET" }
    );

    return NextResponse.json({ error: errorMessage, code }, { status: statusCode });
  }
}

// Apply rate limiting: 10 requests per 10 seconds
export const POST = withRateLimit(handlePost);
export const GET = withRateLimit(handleGet);
