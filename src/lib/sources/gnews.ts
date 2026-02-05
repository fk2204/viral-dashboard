import { TrendData, GNewsTrendItem } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { trendCache, CACHE_KEYS, CACHE_TTL } from '../cache';

const GNEWS_CATEGORIES = [
  { gnewsCategory: 'entertainment', dashCategory: 'absurd' as TrendData['category'] },
  { gnewsCategory: 'technology', dashCategory: 'tech' as TrendData['category'] },
  { gnewsCategory: 'sports', dashCategory: 'news' as TrendData['category'] },
  { gnewsCategory: 'world', dashCategory: 'news' as TrendData['category'] },
  { gnewsCategory: 'science', dashCategory: 'tech' as TrendData['category'] },
  { gnewsCategory: 'business', dashCategory: 'luxury' as TrendData['category'] }
];

const KEYWORD_CATEGORY_MAP = {
  emotional: ['family', 'heartwarming', 'rescue', 'reunion', 'emotional', 'touching', 'inspire', 'miracle', 'hero', 'tribute'],
  luxury: ['luxury', 'billion', 'million', 'wealth', 'rich', 'expensive', 'premium', 'exclusive', 'yacht', 'mansion'],
  tech: ['ai', 'robot', 'tech', 'digital', 'software', 'app', 'cyber', 'quantum', 'space', 'nasa'],
  absurd: ['bizarre', 'weird', 'strange', 'unexpected', 'shocking', 'unbelievable', 'crazy', 'wild', 'viral', 'meme'],
  cartoon: ['animation', 'cartoon', 'anime', 'disney', 'pixar', 'animated', 'comic']
};

function inferCategory(title: string, defaultCategory: TrendData['category']): TrendData['category'] {
  const lowerTitle = title.toLowerCase();

  for (const [category, keywords] of Object.entries(KEYWORD_CATEGORY_MAP)) {
    if (keywords.some(keyword => lowerTitle.includes(keyword))) {
      return category as TrendData['category'];
    }
  }

  return defaultCategory;
}

function inferSentiment(title: string): TrendData['sentiment'] {
  const lowerTitle = title.toLowerCase();

  const positiveWords = ['win', 'success', 'achieve', 'celebrate', 'breakthrough', 'amazing', 'great', 'best', 'triumph'];
  const negativeWords = ['crisis', 'disaster', 'fail', 'death', 'kill', 'attack', 'crash', 'collapse', 'worst', 'fear'];

  const hasPositive = positiveWords.some(word => lowerTitle.includes(word));
  const hasNegative = negativeWords.some(word => lowerTitle.includes(word));

  if (hasPositive && hasNegative) return 'mixed';
  if (hasPositive) return 'positive';
  if (hasNegative) return 'negative';
  return 'neutral';
}

export async function fetchGNewsTrending(): Promise<TrendData[]> {
  const cached = trendCache.get<TrendData[]>(CACHE_KEYS.GNEWS_TRENDS);
  if (cached) return cached;

  const apiKey = process.env.GNEWS_API_KEY;
  if (!apiKey) {
    console.warn('GNEWS_API_KEY not set');
    return [];
  }

  const results = await Promise.allSettled(
    GNEWS_CATEGORIES.map(async (cat) => {
      const url = `https://gnews.io/api/v4/top-headlines?category=${cat.gnewsCategory}&lang=en&max=5&apikey=${apiKey}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`GNews API error: ${response.status}`);
      }

      const data = await response.json();
      return gnewsToTrendData(data.articles || [], cat.dashCategory);
    })
  );

  const trends = results
    .filter((result): result is PromiseFulfilledResult<TrendData[]> => result.status === 'fulfilled')
    .flatMap(result => result.value);

  trendCache.set(CACHE_KEYS.GNEWS_TRENDS, trends, CACHE_TTL.GNEWS);

  return trends;
}

function gnewsToTrendData(items: GNewsTrendItem[], defaultCategory: TrendData['category']): TrendData[] {
  return items.map(item => {
    const category = inferCategory(item.title, defaultCategory);
    const sentiment = inferSentiment(item.title);

    const publishedDate = new Date(item.publishedAt);
    const now = new Date();
    const hoursDiff = (now.getTime() - publishedDate.getTime()) / (1000 * 60 * 60);

    let recency: TrendData['recency'];
    let recencyMultiplier: number;
    if (hoursDiff < 24) {
      recency = 'today';
      recencyMultiplier = 1.0;
    } else if (hoursDiff < 48) {
      recency = 'yesterday';
      recencyMultiplier = 0.8;
    } else {
      recency = 'older';
      recencyMultiplier = 0.6;
    }

    const allText = `${item.title} ${item.description || ''}`;
    const words = allText
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 4)
      .filter((word, index, self) => self.indexOf(word) === index)
      .slice(0, 5);
    const relatedKeywords = words;

    const categoryBonusVisual: Record<TrendData['category'], number> = {
      absurd: 15,
      luxury: 10,
      emotional: 10,
      tech: 5,
      news: 5,
      cartoon: 5,
      gaming: 10,
      fitness: 5,
      food: 8,
      finance: 5,
      music: 12,
      relationships: 8
    };

    const categoryBonusEmotional: Record<TrendData['category'], number> = {
      emotional: 20,
      absurd: 10,
      luxury: 10,
      tech: 0,
      news: 0,
      cartoon: 5,
      gaming: 8,
      fitness: 12,
      food: 10,
      finance: 5,
      music: 15,
      relationships: 18
    };

    const categoryBonusShareability: Record<TrendData['category'], number> = {
      absurd: 15,
      emotional: 10,
      luxury: 10,
      tech: 5,
      news: 5,
      cartoon: 10,
      gaming: 12,
      fitness: 8,
      food: 10,
      finance: 5,
      music: 14,
      relationships: 10
    };

    const sentimentBonus: Record<string, number> = {
      positive: 10,
      negative: 5,
      mixed: 5,
      neutral: 0
    };

    const visualPotential = 50 + (categoryBonusVisual[category] || 0) + (recency === 'today' ? 10 : 5);
    const emotionalImpact = 50 + (categoryBonusEmotional[category] || 0) + (sentimentBonus[sentiment ?? 'neutral'] || 0);
    const shareability = 50 + (categoryBonusShareability[category] || 0) + (recency === 'today' ? 10 : 5);
    const score = ((visualPotential + emotionalImpact + shareability) / 3) * recencyMultiplier;

    return {
      id: uuidv4(),
      topic: item.title.length > 80 ? item.title.substring(0, 80) + '...' : item.title,
      source: `News - ${item.source.name}`,
      category,
      sourceApi: 'gnews' as const,
      sourceUrl: item.url,
      platform: 'news' as const,
      timestamp: item.publishedAt,
      engagementCount: 0,
      velocity: 0,
      recency,
      relatedKeywords,
      sentiment,
      visualPotential,
      emotionalImpact,
      shareability,
      score
    };
  });
}
