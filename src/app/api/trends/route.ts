import { NextResponse } from 'next/server';
import { generateTrendData, scoreTrend, refreshTrends } from '@/lib/trends';

export async function GET() {
  try {
    const trends = await generateTrendData();

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

export async function POST() {
  try {
    refreshTrends();
    const trends = await generateTrendData();

    const enrichedTrends = trends.map(trend => ({
      ...trend,
      potentialLabel: scoreTrend(trend),
    }));

    return NextResponse.json({
      trends: enrichedTrends,
      fetchedAt: new Date().toISOString(),
      refreshed: true,
    });
  } catch (error) {
    console.error('Trends refresh error:', error);
    return NextResponse.json(
      { error: 'Failed to refresh trends' },
      { status: 500 }
    );
  }
}
