import { NextResponse } from 'next/server';
import { generateTrendData, refreshTrends } from '@/lib/trends';
import { generateConceptsFromTrends } from '@/lib/generator';
import { learnFromTrends } from '@/lib/learner';
import { saveDailyOutput, hasTodayOutput, DailyOutput } from '@/lib/daily-store';
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // Verify cron secret (Vercel sends CRON_SECRET in Authorization header)
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if already generated today (idempotency)
    if (hasTodayOutput()) {
      return NextResponse.json({
        status: 'skipped',
        message: 'Today\'s content already generated',
      });
    }

    // Step 1: Clear cache and fetch fresh trends
    refreshTrends();
    const trends = await generateTrendData();

    // Step 2: Run learning loop on new trends
    const learningResult = await learnFromTrends(trends);

    // Step 3: Generate day's scripts using trend-driven engine
    const concepts = generateConceptsFromTrends(trends, 3);

    // Step 4: Calculate stats
    const categoryCounts: Record<string, number> = {};
    concepts.forEach(c => {
      categoryCounts[c.category] = (categoryCounts[c.category] || 0) + 1;
    });

    const topTrend = trends.length > 0
      ? trends.sort((a, b) => b.score - a.score)[0].topic
      : 'none';

    const avgScore = trends.length > 0
      ? Math.round(trends.reduce((sum, t) => sum + t.score, 0) / trends.length)
      : 0;

    // Step 5: Store results
    const dailyOutput: DailyOutput = {
      id: uuidv4(),
      date: new Date().toISOString(),
      generatedAt: new Date().toISOString(),
      concepts,
      trends,
      stats: {
        totalConcepts: concepts.length,
        categoryCounts,
        topTrend,
        avgScore,
      },
    };

    saveDailyOutput(dailyOutput);

    // Return summary
    return NextResponse.json({
      status: 'success',
      generated: {
        concepts: concepts.length,
        trends: trends.length,
        categoryCounts,
        topTrend,
      },
      learning: learningResult,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Daily generation cron error:', error);
    return NextResponse.json(
      {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
