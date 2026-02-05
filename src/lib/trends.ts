import { TrendData } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { trendCache, CACHE_KEYS, CACHE_TTL } from './cache';
import { fetchYouTubeTrending } from './sources/youtube';
import { fetchRedditTrending } from './sources/reddit';
import { fetchGNewsTrending } from './sources/gnews';
import { fetchGoogleTrends } from './sources/google-trends';
import { fetchTikTokCreativeTrends } from './sources/tiktok-creative';

// ============================================================
// FALLBACK TOPICS (enhanced version of original hardcoded data)
// ============================================================
const FALLBACK_TOPICS: Array<{ topic: string; source: string; category: TrendData['category'] }> = [
  // TikTok viral trends
  { topic: 'AI-generated realistic humans', source: 'TikTok', category: 'tech' },
  { topic: 'Luxury lifestyle ASMR', source: 'TikTok', category: 'luxury' },
  { topic: 'Nostalgic 90s/2000s edits', source: 'TikTok', category: 'emotional' },
  { topic: 'Impossible camera angles', source: 'TikTok', category: 'absurd' },
  { topic: 'One-shot transitions', source: 'TikTok', category: 'tech' },
  { topic: 'Day in my life billionaire', source: 'TikTok', category: 'luxury' },
  { topic: 'Satisfying destruction videos', source: 'TikTok', category: 'absurd' },
  { topic: 'Time-lapse transformations', source: 'TikTok', category: 'emotional' },
  { topic: 'Glitch reality effects', source: 'TikTok', category: 'tech' },
  { topic: 'Celebrity deepfake parodies', source: 'TikTok', category: 'absurd' },

  // Breaking news topics
  { topic: 'New AI video model released', source: 'Tech News', category: 'news' },
  { topic: 'Climate event visualization', source: 'World News', category: 'news' },
  { topic: 'Space discovery announcement', source: 'Science News', category: 'news' },
  { topic: 'Viral internet moment', source: 'Social Media', category: 'news' },
  { topic: 'Major tech company update', source: 'Tech News', category: 'news' },

  // Meme culture
  { topic: 'Absurdist humor edit', source: 'Meme Culture', category: 'absurd' },
  { topic: 'Unexpected animal reactions', source: 'Viral Videos', category: 'absurd' },
  { topic: 'Extreme zoom dramatic effect', source: 'Meme Culture', category: 'absurd' },

  // Emotional content
  { topic: 'Reunion surprise moments', source: 'Heartwarming', category: 'emotional' },
  { topic: 'Childhood memory recreation', source: 'Nostalgia', category: 'emotional' },
  { topic: 'Before/after life changes', source: 'Inspirational', category: 'emotional' },

  // Luxury/aspirational
  { topic: 'Private jet morning routine', source: 'Luxury', category: 'luxury' },
  { topic: 'Penthouse apartment tour', source: 'Real Estate', category: 'luxury' },
  { topic: 'Supercar collection reveal', source: 'Automotive', category: 'luxury' },
  { topic: 'Yacht sunset dinner', source: 'Lifestyle', category: 'luxury' },

  // Cartoon/animation (new)
  { topic: 'Studio Ghibli aesthetic trend', source: 'Animation', category: 'cartoon' },
  { topic: 'Spider-Verse style edits', source: 'Viral Videos', category: 'cartoon' },
  { topic: 'Anime transformation trend', source: 'TikTok', category: 'cartoon' },
  { topic: 'Disney animation challenge', source: 'Social Media', category: 'cartoon' },

  // 2025-2026 specific trends
  { topic: 'Sora AI video generation', source: 'Tech News', category: 'tech' },
  { topic: 'Veo 3 cinematic AI clips', source: 'Tech News', category: 'tech' },
  { topic: 'AGI speculation debate', source: 'Tech News', category: 'tech' },
  { topic: 'Quiet luxury lifestyle', source: 'Fashion', category: 'luxury' },
  { topic: 'Cottagecore comeback 2026', source: 'TikTok', category: 'emotional' },
  { topic: 'NPC streaming trend', source: 'TikTok', category: 'absurd' },
  { topic: 'Liminal space exploration', source: 'Reddit', category: 'absurd' },
  { topic: 'Retro Y2K aesthetic revival', source: 'Fashion', category: 'emotional' },

  // Gaming trends
  { topic: 'New competitive season ranked update', source: 'Gaming', category: 'gaming' },
  { topic: 'Esports tournament insane clutch moment', source: 'Esports', category: 'gaming' },
  { topic: 'Indie game goes viral overnight', source: 'Gaming', category: 'gaming' },
  { topic: 'Speedrunner breaks impossible world record', source: 'Speedrunning', category: 'gaming' },

  // Fitness trends
  { topic: '30 day body transformation challenge', source: 'Fitness', category: 'fitness' },
  { topic: 'New workout trend taking over gyms', source: 'Fitness', category: 'fitness' },
  { topic: 'Science-backed exercise for maximum gains', source: 'Health', category: 'fitness' },
  { topic: 'Celebrity trainer reveals secret routine', source: 'Fitness', category: 'fitness' },

  // Food trends
  { topic: 'Viral recipe taking over social media', source: 'Food', category: 'food' },
  { topic: 'Street food hidden gem discovered', source: 'Food', category: 'food' },
  { topic: 'Chef hack that changes everything', source: 'Cooking', category: 'food' },
  { topic: 'New food trend everyone is trying', source: 'Food', category: 'food' },

  // Finance trends
  { topic: 'New passive income strategy revealed', source: 'Finance', category: 'finance' },
  { topic: 'Crypto market unexpected movement', source: 'Crypto', category: 'finance' },
  { topic: 'Side hustle paying thousands monthly', source: 'Finance', category: 'finance' },
  { topic: 'Market crash prediction from analyst', source: 'Investing', category: 'finance' },

  // Music trends
  { topic: 'New song breaking streaming records', source: 'Music', category: 'music' },
  { topic: 'Underground artist goes viral overnight', source: 'Music', category: 'music' },
  { topic: 'Remix that sounds better than original', source: 'Music', category: 'music' },
  { topic: 'Festival lineup announcement reactions', source: 'Music', category: 'music' },

  // Relationships trends
  { topic: 'Dating trend taking over gen-z', source: 'Relationships', category: 'relationships' },
  { topic: 'Relationship advice that changed everything', source: 'Relationships', category: 'relationships' },
  { topic: 'Red flag vs green flag debate viral', source: 'Dating', category: 'relationships' },
  { topic: 'Couple challenge going viral on TikTok', source: 'Relationships', category: 'relationships' },
];

// ============================================================
// SCORING UTILITIES
// ============================================================
function calculateScore(
  visualPotential: number,
  emotionalImpact: number,
  shareability: number,
  recency: 'today' | 'yesterday' | 'older'
): number {
  const recencyMultiplier = recency === 'today' ? 1.5 : recency === 'yesterday' ? 1.2 : 1.0;
  return ((visualPotential + emotionalImpact + shareability) / 3) * recencyMultiplier;
}

function generateFallbackTrend(item: { topic: string; source: string; category: TrendData['category'] }): TrendData {
  const recencyOptions: ('today' | 'yesterday' | 'older')[] = ['today', 'today', 'today', 'yesterday', 'older'];
  const recency = recencyOptions[Math.floor(Math.random() * recencyOptions.length)];

  const visualPotential = Math.floor(Math.random() * 30) + 70;
  const emotionalImpact = Math.floor(Math.random() * 30) + 70;
  const shareability = Math.floor(Math.random() * 30) + 70;

  return {
    id: uuidv4(),
    topic: item.topic,
    source: item.source,
    category: item.category,
    recency,
    visualPotential,
    emotionalImpact,
    shareability,
    score: calculateScore(visualPotential, emotionalImpact, shareability, recency),
    sourceApi: 'fallback',
    platform: 'general',
    timestamp: new Date().toISOString(),
  };
}

// ============================================================
// MAIN TREND FETCHER (async, with caching + fallback)
// ============================================================
export async function generateTrendData(): Promise<TrendData[]> {
  // Check combined cache first
  const cached = trendCache.get<TrendData[]>(CACHE_KEYS.COMBINED_TRENDS);
  if (cached) {
    console.log('Returning cached trends');
    return cached;
  }

  console.log('Fetching fresh trend data from APIs...');

  // Fetch from all 5 sources in parallel
  const [youtubeResult, redditResult, gnewsResult, googleTrendsResult, tiktokResult] = await Promise.allSettled([
    fetchYouTubeTrending(),
    fetchRedditTrending(),
    fetchGNewsTrending(),
    fetchGoogleTrends(),
    fetchTikTokCreativeTrends(),
  ]);

  const youtubeTrends = youtubeResult.status === 'fulfilled' ? youtubeResult.value : [];
  const redditTrends = redditResult.status === 'fulfilled' ? redditResult.value : [];
  const gnewsTrends = gnewsResult.status === 'fulfilled' ? gnewsResult.value : [];
  const googleTrends = googleTrendsResult.status === 'fulfilled' ? googleTrendsResult.value : [];
  const tiktokTrends = tiktokResult.status === 'fulfilled' ? tiktokResult.value : [];

  console.log(`Sources: YouTube=${youtubeTrends.length}, Reddit=${redditTrends.length}, GNews=${gnewsTrends.length}, GoogleTrends=${googleTrends.length}, TikTok=${tiktokTrends.length}`);

  // Apply source weights by selecting proportional amounts
  // YouTube 25%, Reddit 20%, GNews 15%, Google Trends 20%, TikTok Creative 20%
  const targetTotal = 30;
  const youtubeSlice = youtubeTrends
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.ceil(targetTotal * 0.25));
  const redditSlice = redditTrends
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.ceil(targetTotal * 0.2));
  const gnewsSlice = gnewsTrends
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.ceil(targetTotal * 0.15));
  const googleSlice = googleTrends
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.ceil(targetTotal * 0.2));
  const tiktokSlice = tiktokTrends
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.ceil(targetTotal * 0.2));

  let combined = [...youtubeSlice, ...redditSlice, ...gnewsSlice, ...googleSlice, ...tiktokSlice];

  // If we have fewer than 10 trends, supplement with fallback data
  if (combined.length < 10) {
    const needed = 10 - combined.length;
    const shuffledFallbacks = [...FALLBACK_TOPICS].sort(() => Math.random() - 0.5);
    const fallbackTrends = shuffledFallbacks
      .slice(0, needed)
      .map(generateFallbackTrend);
    combined = [...combined, ...fallbackTrends];
    console.log(`Added ${fallbackTrends.length} fallback trends to reach minimum`);
  }

  // Sort by score descending
  combined.sort((a, b) => b.score - a.score);

  // Cache combined results
  trendCache.set(CACHE_KEYS.COMBINED_TRENDS, combined, CACHE_TTL.COMBINED);

  return combined;
}

// ============================================================
// CACHE REFRESH
// ============================================================
export function refreshTrends(): void {
  trendCache.clear();
  console.log('Trend cache cleared - next fetch will pull fresh data');
}

// ============================================================
// BACKWARD COMPATIBLE UTILITIES
// ============================================================
export function getTopTrendsByCategory(trends: TrendData[]): Record<string, TrendData[]> {
  const categories: Record<string, TrendData[]> = {
    news: [],
    absurd: [],
    luxury: [],
    emotional: [],
    tech: [],
    cartoon: [],
    gaming: [],
    fitness: [],
    food: [],
    finance: [],
    music: [],
    relationships: [],
  };

  trends.forEach(trend => {
    const category = trend.category;
    if (category && categories[category]) {
      categories[category].push(trend);
    }
  });

  return categories;
}

export function scoreTrend(trend: TrendData): string {
  if (trend.score >= 130) return 'VIRAL POTENTIAL';
  if (trend.score >= 110) return 'HIGH POTENTIAL';
  if (trend.score >= 90) return 'GOOD POTENTIAL';
  return 'MODERATE';
}
