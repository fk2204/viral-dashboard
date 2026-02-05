import { TrendData } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { trendCache, CACHE_KEYS, CACHE_TTL } from '../cache';

// ============================================================
// TikTok Creative Center — Trending Hashtags + Topics
// Fetches from TikTok's public creative center data endpoints
// No API key required — uses public data
// ============================================================

// TikTok Creative Center public endpoints
const TIKTOK_TRENDING_URL = 'https://ads.tiktok.com/creative_radar_api/v1/popular_trend/hashtag/list';
const TIKTOK_KEYWORD_URL = 'https://ads.tiktok.com/creative_radar_api/v1/popular_trend/keyword/list';

// Category classification for TikTok trends
const TIKTOK_CATEGORY_KEYWORDS: Record<string, string[]> = {
  tech: ['ai', 'tech', 'apple', 'iphone', 'samsung', 'robot', 'coding', 'software', 'crypto', 'nft', 'blockchain', 'tesla', 'gadget', 'app'],
  gaming: ['game', 'gaming', 'gamer', 'esports', 'fortnite', 'minecraft', 'valorant', 'roblox', 'ps5', 'xbox', 'nintendo', 'cod', 'apex'],
  fitness: ['workout', 'gym', 'fitness', 'exercise', 'yoga', 'running', 'gains', 'muscle', 'weight', 'health', 'diet', 'protein'],
  food: ['recipe', 'food', 'cooking', 'baking', 'chef', 'kitchen', 'meal', 'eat', 'delicious', 'foodie', 'asmr', 'mukbang'],
  finance: ['money', 'invest', 'stock', 'crypto', 'income', 'hustle', 'wealth', 'budget', 'savings', 'trading', 'entrepreneur'],
  music: ['song', 'music', 'dance', 'singing', 'concert', 'beat', 'remix', 'dj', 'album', 'rap', 'pop', 'edm'],
  relationships: ['couple', 'dating', 'love', 'relationship', 'boyfriend', 'girlfriend', 'marriage', 'wedding', 'crush', 'ex'],
  luxury: ['luxury', 'rich', 'expensive', 'designer', 'gucci', 'louis', 'rolex', 'car', 'mansion', 'yacht', 'fashion', 'haul'],
  cartoon: ['anime', 'cartoon', 'cosplay', 'manga', 'disney', 'pixar', 'animation', 'otaku', 'weeb'],
  emotional: ['sad', 'cry', 'emotional', 'nostalgia', 'miss', 'memories', 'tribute', 'healing', 'mental', 'therapy', 'wholesome'],
  absurd: ['meme', 'funny', 'comedy', 'prank', 'challenge', 'trend', 'viral', 'duet', 'stitch', 'weird', 'cursed', 'unhinged'],
  news: ['breaking', 'news', 'update', 'alert', 'politics', 'world', 'election', 'protest', 'climate'],
};

// TikTok-native trending topics as intelligent fallback
const TIKTOK_NATIVE_TRENDS: Array<{
  topic: string;
  hashtag: string;
  category: TrendData['category'];
  popularity: number;
}> = [
  { topic: 'Get Ready With Me transformation', hashtag: '#grwm', category: 'luxury', popularity: 95 },
  { topic: 'What I Eat In A Day challenge', hashtag: '#whatieatinaday', category: 'food', popularity: 90 },
  { topic: 'Day In My Life aesthetic vlog', hashtag: '#dayinmylife', category: 'emotional', popularity: 88 },
  { topic: 'Outfit Of The Day fashion check', hashtag: '#ootd', category: 'luxury', popularity: 85 },
  { topic: 'Clean With Me satisfying ASMR', hashtag: '#cleanwithme', category: 'emotional', popularity: 82 },
  { topic: 'POV acting trend going viral', hashtag: '#pov', category: 'absurd', popularity: 92 },
  { topic: 'Storytime drama unfolding', hashtag: '#storytime', category: 'relationships', popularity: 88 },
  { topic: 'Transition edit breaking physics', hashtag: '#transition', category: 'tech', popularity: 86 },
  { topic: 'Duet reaction chain exploding', hashtag: '#duet', category: 'absurd', popularity: 84 },
  { topic: 'Gym transformation before after', hashtag: '#gymtok', category: 'fitness', popularity: 87 },
  { topic: 'BookTok recommendation going viral', hashtag: '#booktok', category: 'emotional', popularity: 80 },
  { topic: 'Small business order packing ASMR', hashtag: '#smallbusiness', category: 'finance', popularity: 83 },
  { topic: 'Makeup tutorial trending technique', hashtag: '#makeuptutorial', category: 'luxury', popularity: 89 },
  { topic: 'Pet content breaking hearts', hashtag: '#petsoftiktok', category: 'emotional', popularity: 91 },
  { topic: 'Street interview goes viral', hashtag: '#streetinterview', category: 'news', popularity: 86 },
  { topic: 'Anime edit goes insanely hard', hashtag: '#animeedit', category: 'cartoon', popularity: 85 },
  { topic: 'Dance trend taking over For You', hashtag: '#dancechallenge', category: 'music', popularity: 93 },
  { topic: 'Side hustle making thousands monthly', hashtag: '#sidehustle', category: 'finance', popularity: 84 },
  { topic: 'Relationship test going wrong', hashtag: '#couplechallenge', category: 'relationships', popularity: 87 },
  { topic: 'Gaming clutch moment insanity', hashtag: '#gamingtiktok', category: 'gaming', popularity: 82 },
  { topic: 'AI filter trend blowing up', hashtag: '#aifilter', category: 'tech', popularity: 90 },
  { topic: 'Recipe hack everyone is trying', hashtag: '#recipehack', category: 'food', popularity: 88 },
  { topic: 'Thrift haul incredible finds', hashtag: '#thrifthaul', category: 'luxury', popularity: 81 },
  { topic: 'Running challenge personal best', hashtag: '#runtok', category: 'fitness', popularity: 79 },
];

function classifyTikTokCategory(text: string): TrendData['category'] {
  const lower = text.toLowerCase();
  let bestCat: TrendData['category'] = 'absurd'; // TikTok default
  let bestScore = 0;

  for (const [cat, keywords] of Object.entries(TIKTOK_CATEGORY_KEYWORDS)) {
    const score = keywords.filter(kw => lower.includes(kw)).length;
    if (score > bestScore) {
      bestScore = score;
      bestCat = cat as TrendData['category'];
    }
  }
  return bestCat;
}

// Category-specific scoring for TikTok content
const categoryViralBonus: Record<TrendData['category'], number> = {
  news: 5, absurd: 18, luxury: 12, emotional: 14, tech: 10, cartoon: 12,
  gaming: 15, fitness: 10, food: 14, finance: 8, music: 16, relationships: 14,
};

/**
 * Attempt to fetch from TikTok Creative Center API
 * Falls back to curated TikTok-native trends if API is unavailable
 */
export async function fetchTikTokCreativeTrends(): Promise<TrendData[]> {
  // Check cache first
  const cached = trendCache.get<TrendData[]>(CACHE_KEYS.TIKTOK_CREATIVE);
  if (cached) {
    return cached;
  }

  let trends: TrendData[] = [];

  try {
    // Try fetching from TikTok Creative Center hashtag endpoint
    const response = await fetch(TIKTOK_TRENDING_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      body: JSON.stringify({
        page: 1,
        limit: 30,
        period: 7,       // last 7 days
        country_code: 'US',
        sort_by: 'popular',
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data?.data?.list && Array.isArray(data.data.list)) {
        trends = data.data.list.map((item: {
          hashtag_name?: string;
          hashtag_id?: string;
          trend_type?: number;
          video_views?: number;
          publish_cnt?: number;
          creators?: number;
        }) => {
          const hashtagName = item.hashtag_name || '';
          const topic = hashtagName.startsWith('#') ? hashtagName : `#${hashtagName}`;
          const category = classifyTikTokCategory(hashtagName);
          const videoViews = item.video_views || 0;
          const publishCount = item.publish_cnt || 0;

          const visualPotential = Math.min(100, 65 + categoryViralBonus[category] + Math.min(15, Math.floor(videoViews / 10000000)));
          const emotionalImpact = Math.min(100, 60 + categoryViralBonus[category] + Math.min(15, Math.floor(publishCount / 50000)));
          const shareability = Math.min(100, 70 + categoryViralBonus[category] + Math.min(10, Math.floor(videoViews / 5000000)));

          const recencyMultiplier = 1.4; // TikTok trends are fresh
          const score = ((visualPotential + emotionalImpact + shareability) / 3) * recencyMultiplier;

          return {
            id: uuidv4(),
            topic: `${topic} trend on TikTok`,
            source: 'TikTok Creative Center',
            category,
            sourceApi: 'tiktok-creative' as const,
            sourceUrl: `https://ads.tiktok.com/business/creativecenter/hashtag/${hashtagName}`,
            platform: 'general' as const,
            timestamp: new Date().toISOString(),
            engagementCount: videoViews,
            velocity: publishCount,
            recency: 'today' as const,
            relatedKeywords: [hashtagName, `tiktok ${category}`],
            sentiment: 'neutral' as const,
            visualPotential,
            emotionalImpact,
            shareability,
            score,
          };
        });
      }
    }
  } catch (error) {
    console.warn('TikTok Creative Center API unavailable:', error);
  }

  // If API didn't return enough data, supplement with curated TikTok-native trends
  if (trends.length < 10) {
    const needed = Math.max(10, 15 - trends.length);
    const shuffled = [...TIKTOK_NATIVE_TRENDS].sort(() => Math.random() - 0.5);
    const supplemental = shuffled.slice(0, needed).map(item => {
      const visualPotential = Math.min(100, 60 + Math.floor(item.popularity * 0.3) + categoryViralBonus[item.category]);
      const emotionalImpact = Math.min(100, 55 + Math.floor(item.popularity * 0.3) + categoryViralBonus[item.category]);
      const shareability = Math.min(100, 65 + Math.floor(item.popularity * 0.25) + categoryViralBonus[item.category]);

      const score = ((visualPotential + emotionalImpact + shareability) / 3) * 1.3;

      return {
        id: uuidv4(),
        topic: item.topic,
        source: `TikTok Trending ${item.hashtag}`,
        category: item.category,
        sourceApi: 'tiktok-creative' as const,
        sourceUrl: `https://www.tiktok.com/tag/${item.hashtag.replace('#', '')}`,
        platform: 'general' as const,
        timestamp: new Date().toISOString(),
        engagementCount: item.popularity * 100000,
        velocity: item.popularity * 1000,
        recency: 'today' as const,
        relatedKeywords: [item.hashtag, item.category],
        sentiment: 'neutral' as const,
        visualPotential,
        emotionalImpact,
        shareability,
        score,
      };
    });

    trends = [...trends, ...supplemental];
    if (supplemental.length > 0) {
      console.log(`TikTok Creative: supplemented with ${supplemental.length} curated trends`);
    }
  }

  // Cache results
  trendCache.set(CACHE_KEYS.TIKTOK_CREATIVE, trends, CACHE_TTL.TIKTOK_CREATIVE);

  console.log(`TikTok Creative: ${trends.length} trending topics`);
  return trends;
}
