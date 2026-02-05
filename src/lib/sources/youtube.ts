import { TrendData, YouTubeTrendItem } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { trendCache, CACHE_KEYS, CACHE_TTL } from '../cache';

const YOUTUBE_CATEGORY_MAP: Record<string, TrendData['category']> = {
  '1': 'emotional',   // Film
  '2': 'luxury',      // Autos
  '10': 'emotional',  // Music
  '17': 'news',       // Sports
  '20': 'tech',       // Gaming
  '22': 'absurd',     // People
  '23': 'absurd',     // Comedy
  '24': 'absurd',     // Entertainment
  '25': 'news',       // News
  '26': 'tech',       // Howto
  '28': 'tech',       // Science
};

export async function fetchYouTubeTrending(
  regionCode = 'US',
  maxResults = 20
): Promise<TrendData[]> {
  // Check cache first
  const cached = trendCache.get<TrendData[]>(CACHE_KEYS.YOUTUBE_TRENDS);
  if (cached) {
    return cached;
  }

  // Get API key
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return [];
  }

  try {
    // Fetch from YouTube API
    const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&chart=mostPopular&regionCode=${regionCode}&maxResults=${maxResults}&key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();

    // Convert items to TrendData
    const trends = youtubeToTrendData(data.items || []);

    // Cache results
    trendCache.set(CACHE_KEYS.YOUTUBE_TRENDS, trends, CACHE_TTL.YOUTUBE);

    return trends;
  } catch (error) {
    console.warn('Error fetching YouTube trends:', error);
    return [];
  }
}

function youtubeToTrendData(items: YouTubeTrendItem[]): TrendData[] {
  return items.map((item) => {
    // Parse statistics
    const viewCount = parseInt(item.statistics.viewCount || '0');
    const likeCount = parseInt(item.statistics.likeCount || '0');
    const commentCount = parseInt(item.statistics.commentCount || '0');
    const engagementCount = viewCount + likeCount + commentCount;

    // Calculate time-based metrics
    const publishedAt = new Date(item.snippet.publishedAt).getTime();
    const now = Date.now();
    const hoursOld = Math.max(1, (now - publishedAt) / 3600000);
    const velocity = engagementCount / hoursOld;

    // Determine recency
    const ageInHours = (now - publishedAt) / 3600000;
    let recency: 'today' | 'yesterday' | 'older';
    if (ageInHours < 24) {
      recency = 'today';
    } else if (ageInHours < 48) {
      recency = 'yesterday';
    } else {
      recency = 'older';
    }

    // Map category
    const categoryId = item.snippet.categoryId || '';
    const category = YOUTUBE_CATEGORY_MAP[categoryId] || 'news';

    // Calculate visualPotential
    let visualPotential = 60;
    if (category === 'luxury' || category === 'absurd' || category === 'cartoon') {
      visualPotential += 15;
    } else if (category === 'emotional' || category === 'tech') {
      visualPotential += 10;
    } else if (category === 'news') {
      visualPotential += 5;
    }
    const engagementBonus = Math.min(20, Math.floor(engagementCount / 1000000));
    visualPotential = Math.min(100, visualPotential + engagementBonus);

    // Calculate emotionalImpact
    let emotionalImpact = 60;
    if (category === 'emotional') {
      emotionalImpact += 20;
    } else if (category === 'luxury') {
      emotionalImpact += 10;
    } else if (category === 'absurd') {
      emotionalImpact += 15;
    } else if (category === 'news' || category === 'tech') {
      emotionalImpact += 5;
    }
    const velocityBonus = Math.min(15, Math.floor(velocity / 1000));
    emotionalImpact = Math.min(100, emotionalImpact + velocityBonus);

    // Calculate shareability
    let shareability = 60;
    if (category === 'absurd' || category === 'cartoon') {
      shareability += 15;
    } else if (category === 'luxury') {
      shareability += 10;
    } else if (category === 'emotional') {
      shareability += 10;
    } else if (category === 'news' || category === 'tech') {
      shareability += 5;
    }
    const shareEngagementBonus = Math.min(20, Math.floor(engagementCount / 500000));
    shareability = Math.min(100, shareability + shareEngagementBonus);

    // Calculate final score with recency multiplier
    const recencyMultiplier = recency === 'today' ? 1.5 : recency === 'yesterday' ? 1.2 : 1.0;
    const score = ((visualPotential + emotionalImpact + shareability) / 3) * recencyMultiplier;

    // Truncate topic if needed
    const topic = item.snippet.title.length > 80
      ? item.snippet.title.substring(0, 80) + '...'
      : item.snippet.title;

    return {
      id: uuidv4(),
      topic,
      source: `YouTube - ${item.snippet.channelTitle}`,
      category,
      sourceApi: 'youtube' as const,
      sourceUrl: `https://youtube.com/watch?v=${item.id}`,
      platform: 'youtube' as const,
      timestamp: item.snippet.publishedAt,
      engagementCount,
      velocity,
      recency,
      relatedKeywords: item.snippet.tags?.slice(0, 5) || [],
      sentiment: 'neutral' as const,
      visualPotential,
      emotionalImpact,
      shareability,
      score,
    };
  });
}
