import { NextResponse } from 'next/server';
import { generateTrendData, scoreTrend } from '@/lib/trends';

export async function GET() {
  try {
    const trends = generateTrendData();

    const enrichedTrends = trends.map(trend => ({
      ...trend,
      potentialLabel: scoreTrend(trend),
    }));

    return NextResponse.json({
      trends: enrichedTrends,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Trends fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trends' },
      { status: 500 }
    );
  }
}
