import { TrendData, RedditTrendItem } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { trendCache, CACHE_KEYS, CACHE_TTL } from '../cache';

const SUBREDDIT_CONFIG: Array<{ name: string; category: TrendData['category'] }> = [
  { name: 'TikTokCringe', category: 'absurd' },
  { name: 'videos', category: 'absurd' },
  { name: 'Unexpected', category: 'absurd' },
  { name: 'nextfuckinglevel', category: 'emotional' },
  { name: 'oddlysatisfying', category: 'emotional' },
  { name: 'BeAmazed', category: 'emotional' },
  { name: 'Damnthatsinteresting', category: 'news' },
  { name: 'ContentCreation', category: 'tech' },
  { name: 'NewTubers', category: 'tech' },
  { name: 'Futurology', category: 'tech' },
];

let redditAccessToken: string | null = null;
let tokenExpiresAt = 0;

async function getRedditToken(): Promise<string | null> {
  const clientId = process.env.REDDIT_CLIENT_ID;
  const clientSecret = process.env.REDDIT_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return null;
  }

  // Return cached token if still valid
  if (redditAccessToken && tokenExpiresAt > Date.now()) {
    return redditAccessToken;
  }

  try {
    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const response = await fetch('https://www.reddit.com/api/v1/access_token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'ViralDashboard/1.0',
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      console.warn('Failed to get Reddit token:', response.statusText);
      return null;
    }

    const data = await response.json();
    redditAccessToken = data.access_token;
    tokenExpiresAt = Date.now() + (data.expires_in * 1000) - 60000;

    return redditAccessToken;
  } catch (error) {
    console.warn('Error getting Reddit token:', error);
    return null;
  }
}

export async function fetchRedditTrending(): Promise<TrendData[]> {
  // Check cache first
  const cached = trendCache.get<TrendData[]>(CACHE_KEYS.REDDIT_TRENDS);
  if (cached) {
    return cached;
  }

  const token = await getRedditToken();
  if (!token) {
    return [];
  }

  // Fetch from all subreddits in parallel
  const results = await Promise.allSettled(
    SUBREDDIT_CONFIG.map(async (sub) => {
      const response = await fetch(
        `https://oauth.reddit.com/r/${sub.name}/hot?limit=5`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'User-Agent': 'ViralDashboard/1.0',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch r/${sub.name}`);
      }

      const data = await response.json();
      return {
        items: data.data.children as RedditTrendItem[],
        category: sub.category,
      };
    })
  );

  // Collect all successful results
  const allTrends: TrendData[] = [];
  for (const result of results) {
    if (result.status === 'fulfilled') {
      const trends = redditToTrendData(result.value.items, result.value.category);
      allTrends.push(...trends);
    }
  }

  // Cache the results
  trendCache.set(CACHE_KEYS.REDDIT_TRENDS, allTrends, CACHE_TTL.REDDIT);

  return allTrends;
}

function redditToTrendData(
  items: RedditTrendItem[],
  subredditCategory: TrendData['category']
): TrendData[] {
  return items.map((item) => {
    const data = item.data;
    const createdUtc = data.created_utc * 1000;
    const hoursOld = Math.max(1, (Date.now() - createdUtc) / 3600000);
    const engagementCount = data.score + data.num_comments;
    const velocity = engagementCount / hoursOld;

    // Determine recency
    const hoursSinceCreated = (Date.now() - createdUtc) / 3600000;
    let recency: TrendData['recency'];
    if (hoursSinceCreated < 24) {
      recency = 'today';
    } else if (hoursSinceCreated < 48) {
      recency = 'yesterday';
    } else {
      recency = 'older';
    }

    const recencyMultiplier = recency === 'today' ? 1.2 : recency === 'yesterday' ? 1.0 : 0.8;

    // Extract keywords from title
    const relatedKeywords = data.title
      .split(/\s+/)
      .filter((word) => word.length > 4)
      .map((word) => word.toLowerCase().replace(/[^a-z0-9]/g, ''))
      .filter((word) => word.length > 4)
      .slice(0, 5);

    // Determine sentiment from upvote ratio
    let sentiment: TrendData['sentiment'];
    if (data.upvote_ratio > 0.85) {
      sentiment = 'positive';
    } else if (data.upvote_ratio > 0.7) {
      sentiment = 'neutral';
    } else if (data.upvote_ratio > 0.5) {
      sentiment = 'mixed';
    } else {
      sentiment = 'negative';
    }

    // Calculate category bonuses
    const categoryBonuses: Record<TrendData['category'], { visual: number; emotional: number; share: number }> = {
      absurd: { visual: 15, emotional: 10, share: 15 },
      emotional: { visual: 10, emotional: 20, share: 10 },
      luxury: { visual: 15, emotional: 10, share: 10 },
      news: { visual: 5, emotional: 5, share: 0 },
      tech: { visual: 5, emotional: 0, share: 0 },
      cartoon: { visual: 15, emotional: 10, share: 15 },
      gaming: { visual: 12, emotional: 8, share: 12 },
      fitness: { visual: 10, emotional: 12, share: 8 },
      food: { visual: 14, emotional: 10, share: 10 },
      finance: { visual: 5, emotional: 5, share: 5 },
      music: { visual: 16, emotional: 15, share: 14 },
      relationships: { visual: 8, emotional: 18, share: 10 },
    };

    const bonus = categoryBonuses[subredditCategory];

    // Calculate visual potential
    const visualPotential =
      55 +
      bonus.visual +
      Math.min(15, Math.floor(data.score / 5000)) +
      (data.is_video ? 10 : 0);

    // Calculate emotional impact
    const emotionalImpact =
      55 +
      bonus.emotional +
      Math.min(15, Math.floor(data.num_comments / 500));

    // Calculate shareability
    const shareability =
      55 +
      bonus.share +
      Math.min(15, Math.floor(velocity / 500)) +
      (data.upvote_ratio > 0.9 ? 10 : 0);

    // Calculate final score
    const score = ((visualPotential + emotionalImpact + shareability) / 3) * recencyMultiplier;

    return {
      id: uuidv4(),
      topic: data.title.length > 80 ? data.title.substring(0, 80) + '...' : data.title,
      source: `Reddit - r/${data.subreddit}`,
      category: subredditCategory,
      sourceApi: 'reddit' as const,
      sourceUrl: `https://reddit.com${data.permalink}`,
      platform: 'reddit' as const,
      timestamp: new Date(createdUtc).toISOString(),
      engagementCount,
      velocity,
      recency,
      relatedKeywords,
      sentiment,
      visualPotential,
      emotionalImpact,
      shareability,
      score,
    };
  });
}
