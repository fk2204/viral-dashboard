import { NextRequest, NextResponse } from "next/server";
import { runBatchReflexion } from "@/lib/learning/reflexion";
import { getRecentFeedback } from "@/lib/learning/performance-tracker";
import { updateEffectivenessScores } from "@/lib/learning/effectiveness-scorer";
import { getConcept } from "@/lib/concept-cache";
import { handleApiError, ERROR_CODES } from "@/lib/error-handler";
import { ViralConcept } from "@/types";

/**
 * POST /api/cron/reflexion
 * Daily reflexion cron job — analyzes all recent performance data
 * Run this via Vercel Cron or manual trigger
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron authorization (if using Vercel Cron)
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔄 Starting daily reflexion analysis...');

    // 1. Get recent feedback (last 7 days)
    const recentFeedback = getRecentFeedback(100); // last 100 entries
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const feedbackToAnalyze = recentFeedback.filter(f => {
      const reportedDate = new Date(f.reportedAt);
      return reportedDate >= sevenDaysAgo;
    });

    console.log(`📊 Found ${feedbackToAnalyze.length} feedback entries to analyze`);

    if (feedbackToAnalyze.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No new feedback to analyze",
        stats: {
          critiquesGenerated: 0,
          adjustmentsApplied: 0,
          insightsExtracted: 0,
        },
      });
    }

    // 2. Retrieve concepts from server-side cache
    const conceptsMap = new Map<string, ViralConcept>();
    let cacheHits = 0;
    let cacheMisses = 0;

    for (const feedback of feedbackToAnalyze) {
      const concept = getConcept(feedback.conceptId);
      if (concept) {
        conceptsMap.set(feedback.conceptId, concept);
        cacheHits++;
      } else {
        cacheMisses++;
      }
    }

    console.log(`📦 Cache hits: ${cacheHits}, misses: ${cacheMisses}`);

    if (cacheHits === 0) {
      console.log(`⏭️ No concepts in cache - all feedback >48h old`);
      return NextResponse.json({
        success: true,
        message: "No cached concepts available for analysis",
        stats: {
          feedbackAnalyzed: 0,
          cacheHits: 0,
          cacheMisses,
          critiquesGenerated: 0,
          adjustmentsApplied: 0,
          insightsExtracted: 0,
        },
      });
    }

    // 3. Run batch reflexion on cached concepts
    console.log(`🤖 Running batch reflexion on ${cacheHits} concepts...`);

    const feedbackWithConcepts = feedbackToAnalyze.filter((f) =>
      conceptsMap.has(f.conceptId)
    );

    const concepts = feedbackWithConcepts.map(
      (f) => conceptsMap.get(f.conceptId)!
    );

    const results = await runBatchReflexion(feedbackWithConcepts, concepts);

    console.log(`✅ Batch reflexion complete:`, results);

    // 4. Update effectiveness scores based on new data
    console.log("📈 Updating effectiveness scores...");
    const effectivenessUpdate = updateEffectivenessScores();
    console.log(`✅ Effectiveness scores updated. Confidence: ${effectivenessUpdate.confidence}`);

    // 5. Return summary
    return NextResponse.json({
      success: true,
      message: "Daily reflexion analysis complete",
      stats: {
        feedbackAnalyzed: feedbackWithConcepts.length,
        cacheHits,
        cacheMisses,
        critiquesGenerated: results.critiquesGenerated,
        adjustmentsApplied: results.adjustmentsApplied,
        insightsExtracted: results.insightsExtracted,
        effectivenessConfidence: effectivenessUpdate.confidence,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const { error: errorMessage, statusCode, code } = handleApiError(
      error,
      "Reflexion cron failed",
      { endpoint: "/api/cron/reflexion", method: "POST" }
    );

    return NextResponse.json({ error: errorMessage, code }, { status: statusCode });
  }
}

/**
 * GET /api/cron/reflexion
 * Get status of last reflexion run
 */
export async function GET() {
  try {
    const { getReflexionSummary } = await import("@/lib/learning/reflexion");
    const { getStats } = await import("@/lib/concept-cache");

    const summary = getReflexionSummary();
    const cacheStats = getStats();

    return NextResponse.json({
      summary,
      cacheStats,
      message: "Reflexion system status",
    });
  } catch (error) {
    const { error: errorMessage, statusCode, code } = handleApiError(
      error,
      "Failed to get reflexion status",
      { endpoint: "/api/cron/reflexion", method: "GET" }
    );

    return NextResponse.json({ error: errorMessage, code }, { status: statusCode });
  }
}
