import { NextRequest, NextResponse } from 'next/server';
import { recordPerformance } from '@/lib/learning/performance-tracker';
import { Category } from '@/types';

const VALID_CATEGORIES: Category[] = [
  'news', 'absurd', 'luxury', 'emotional', 'tech', 'cartoon',
  'gaming', 'fitness', 'food', 'finance', 'music', 'relationships',
];

const VALID_PLATFORMS = ['tiktok', 'youtube-shorts'] as const;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    const { conceptId, conceptTitle, category, platform, metrics, variantId } = body;

    if (!conceptId || typeof conceptId !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid conceptId' },
        { status: 400 }
      );
    }

    if (!conceptTitle || typeof conceptTitle !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid conceptTitle' },
        { status: 400 }
      );
    }

    if (!VALID_CATEGORIES.includes(category)) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}` },
        { status: 400 }
      );
    }

    if (!VALID_PLATFORMS.includes(platform)) {
      return NextResponse.json(
        { error: `Invalid platform. Must be one of: ${VALID_PLATFORMS.join(', ')}` },
        { status: 400 }
      );
    }

    if (!metrics || typeof metrics !== 'object') {
      return NextResponse.json(
        { error: 'Missing metrics object' },
        { status: 400 }
      );
    }

    const { views, likes, shares, comments } = metrics;

    if (typeof views !== 'number' || views < 0) {
      return NextResponse.json({ error: 'views must be a non-negative number' }, { status: 400 });
    }
    if (typeof likes !== 'number' || likes < 0) {
      return NextResponse.json({ error: 'likes must be a non-negative number' }, { status: 400 });
    }
    if (typeof shares !== 'number' || shares < 0) {
      return NextResponse.json({ error: 'shares must be a non-negative number' }, { status: 400 });
    }
    if (typeof comments !== 'number' || comments < 0) {
      return NextResponse.json({ error: 'comments must be a non-negative number' }, { status: 400 });
    }

    // Record the performance feedback
    const entry = recordPerformance({
      conceptId,
      conceptTitle,
      category,
      platform,
      metrics: { views, likes, shares, comments },
      ...(variantId ? { variantId } : {}),
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
    console.error('Feedback API error:', error);
    return NextResponse.json(
      { error: 'Failed to process feedback' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const { getRecentFeedback, getPlatformComparison, getTopPerformingCategories } = await import('@/lib/learning/performance-tracker');

    const recent = getRecentFeedback(10);
    const platformComparison = getPlatformComparison();
    const topCategories = getTopPerformingCategories(5);

    return NextResponse.json({
      recent,
      platformComparison,
      topCategories,
    });
  } catch (error) {
    console.error('Feedback GET error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve feedback data' },
      { status: 500 }
    );
  }
}
