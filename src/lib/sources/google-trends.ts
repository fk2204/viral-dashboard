import { TrendData } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { trendCache, CACHE_KEYS, CACHE_TTL } from '../cache';

// ============================================================
// Google Trends RSS Feed Parser
// Fetches daily trending searches from Google Trends
// No API key required — uses public RSS endpoint
// ============================================================

const GOOGLE_TRENDS_RSS_URL = 'https://trends.google.com/trending/rss?geo=US';

// Category classification based on keyword matching
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  tech: ['ai', 'apple', 'google', 'microsoft', 'samsung', 'nvidia', 'openai', 'chatgpt', 'iphone', 'android', 'software', 'app', 'robot', 'quantum', 'crypto', 'bitcoin', 'blockchain', 'tesla', 'spacex', 'elon', 'meta', 'vr', 'ar'],
  gaming: ['game', 'gaming', 'playstation', 'xbox', 'nintendo', 'steam', 'esport', 'fortnite', 'minecraft', 'valorant', 'league', 'cod', 'gta', 'zelda', 'pokemon'],
  finance: ['stock', 'market', 'economy', 'inflation', 'fed', 'bank', 'invest', 'dow', 'nasdaq', 'sp500', 'trading', 'recession', 'gdp', 'tax', 'crypto', 'bitcoin', 'ethereum'],
  music: ['song', 'album', 'concert', 'tour', 'grammy', 'spotify', 'rapper', 'singer', 'music', 'beyonce', 'taylor swift', 'drake', 'kanye', 'travis scott', 'billie eilish'],
  fitness: ['workout', 'gym', 'exercise', 'fitness', 'weight loss', 'diet', 'muscle', 'yoga', 'marathon', 'bodybuilding', 'crossfit', 'protein', 'supplement'],
  food: ['recipe', 'restaurant', 'chef', 'cooking', 'food', 'michelin', 'starbucks', 'mcdonald', 'pizza', 'burger', 'vegan', 'baking', 'cuisine'],
  relationships: ['dating', 'marriage', 'divorce', 'wedding', 'couple', 'relationship', 'love', 'bachelor', 'bachelorette', 'tinder', 'hinge'],
  luxury: ['luxury', 'billionaire', 'mansion', 'ferrari', 'lamborghini', 'rolex', 'gucci', 'louis vuitton', 'yacht', 'private jet', 'porsche', 'bentley'],
  cartoon: ['anime', 'disney', 'pixar', 'animation', 'cartoon', 'manga', 'studio ghibli', 'marvel', 'dc', 'spider-man', 'batman', 'one piece', 'demon slayer'],
  emotional: ['tribute', 'memorial', 'rip', 'death', 'remember', 'charity', 'rescue', 'hero', 'miracle', 'survivor', 'reunion', 'farewell', 'legacy'],
  absurd: ['meme', 'viral', 'prank', 'challenge', 'weird', 'bizarre', 'florida man', 'wtf', 'cursed', 'glitch', 'simulation'],
  news: [], // default category for unclassified
};

// Traffic volume to engagement count estimate
function trafficToEngagement(trafficStr: string): number {
  const cleaned = trafficStr.replace(/[^0-9+KMB]/gi, '').toUpperCase();
  if (cleaned.includes('M')) return parseFloat(cleaned) * 1000000;
  if (cleaned.includes('K')) return parseFloat(cleaned) * 1000;
  if (cleaned.includes('B')) return parseFloat(cleaned) * 1000000000;
  return parseInt(cleaned) || 50000;
}

// Classify topic into a category based on keyword matching
function classifyCategory(topic: string, relatedKeywords: string[]): TrendData['category'] {
  const combined = `${topic} ${relatedKeywords.join(' ')}`.toLowerCase();

  let bestCategory: TrendData['category'] = 'news';
  let bestScore = 0;

  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (cat === 'news') continue; // news is default
    const score = keywords.filter(kw => combined.includes(kw)).length;
    if (score > bestScore) {
      bestScore = score;
      bestCategory = cat as TrendData['category'];
    }
  }

  return bestCategory;
}

// Category-specific scoring bonuses
const categoryBonusVisual: Record<TrendData['category'], number> = {
  news: 5, absurd: 15, luxury: 15, emotional: 10, tech: 10, cartoon: 15,
  gaming: 12, fitness: 10, food: 12, finance: 5, music: 10, relationships: 8,
};
const categoryBonusEmotional: Record<TrendData['category'], number> = {
  news: 5, absurd: 15, luxury: 10, emotional: 20, tech: 5, cartoon: 10,
  gaming: 10, fitness: 12, food: 8, finance: 5, music: 15, relationships: 18,
};
const categoryBonusShareability: Record<TrendData['category'], number> = {
  news: 10, absurd: 15, luxury: 10, emotional: 10, tech: 10, cartoon: 12,
  gaming: 12, fitness: 8, food: 10, finance: 8, music: 12, relationships: 10,
};

// Parse RSS XML to extract trending topics
function parseRSS(xml: string): Array<{
  title: string;
  traffic: string;
  pubDate: string;
  newsItems: Array<{ title: string; url: string }>;
}> {
  const items: Array<{
    title: string;
    traffic: string;
    pubDate: string;
    newsItems: Array<{ title: string; url: string }>;
  }> = [];

  // Extract each <item> block
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[1];

    // Extract title
    const titleMatch = itemXml.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/);
    const title = titleMatch ? titleMatch[1].trim() : '';

    // Extract approximate traffic
    const trafficMatch = itemXml.match(/<ht:approx_traffic>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/ht:approx_traffic>/);
    const traffic = trafficMatch ? trafficMatch[1].trim() : '50000+';

    // Extract pubDate
    const dateMatch = itemXml.match(/<pubDate>(.*?)<\/pubDate>/);
    const pubDate = dateMatch ? dateMatch[1].trim() : new Date().toISOString();

    // Extract related news items
    const newsItems: Array<{ title: string; url: string }> = [];
    const newsRegex = /<ht:news_item>[\s\S]*?<ht:news_item_title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/ht:news_item_title>[\s\S]*?<ht:news_item_url>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/ht:news_item_url>[\s\S]*?<\/ht:news_item>/g;
    let newsMatch;
    while ((newsMatch = newsRegex.exec(itemXml)) !== null) {
      newsItems.push({
        title: newsMatch[1].trim(),
        url: newsMatch[2].trim(),
      });
    }

    if (title) {
      items.push({ title, traffic, pubDate, newsItems });
    }
  }

  return items;
}

export async function fetchGoogleTrends(): Promise<TrendData[]> {
  // Check cache first
  const cached = trendCache.get<TrendData[]>(CACHE_KEYS.GOOGLE_TRENDS);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(GOOGLE_TRENDS_RSS_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ViralDashboard/1.0)',
      },
      next: { revalidate: 5400 }, // 90 minutes
    });

    if (!response.ok) {
      console.warn(`Google Trends RSS returned ${response.status}`);
      return [];
    }

    const xml = await response.text();
    const rssItems = parseRSS(xml);

    if (rssItems.length === 0) {
      console.warn('Google Trends RSS returned no items');
      return [];
    }

    const trends: TrendData[] = rssItems.map(item => {
      // Extract related keywords from news item titles
      const relatedKeywords = item.newsItems
        .map(n => n.title)
        .slice(0, 5);

      // Classify category
      const category = classifyCategory(item.title, relatedKeywords);

      // Calculate engagement from traffic volume
      const engagementCount = trafficToEngagement(item.traffic);

      // Calculate recency
      const pubDate = new Date(item.pubDate).getTime();
      const now = Date.now();
      const hoursOld = Math.max(1, (now - pubDate) / 3600000);
      let recency: 'today' | 'yesterday' | 'older';
      if (hoursOld < 24) {
        recency = 'today';
      } else if (hoursOld < 48) {
        recency = 'yesterday';
      } else {
        recency = 'older';
      }

      // Velocity: engagement per hour
      const velocity = engagementCount / hoursOld;

      // Calculate scoring metrics
      const baseVisual = 60 + categoryBonusVisual[category];
      const engagementVisualBonus = Math.min(20, Math.floor(engagementCount / 500000));
      const visualPotential = Math.min(100, baseVisual + engagementVisualBonus);

      const baseEmotional = 60 + categoryBonusEmotional[category];
      const velocityEmotionalBonus = Math.min(15, Math.floor(velocity / 5000));
      const emotionalImpact = Math.min(100, baseEmotional + velocityEmotionalBonus);

      const baseShare = 60 + categoryBonusShareability[category];
      const engagementShareBonus = Math.min(20, Math.floor(engagementCount / 300000));
      const shareability = Math.min(100, baseShare + engagementShareBonus);

      // Final score with recency multiplier
      const recencyMultiplier = recency === 'today' ? 1.5 : recency === 'yesterday' ? 1.2 : 1.0;
      const score = ((visualPotential + emotionalImpact + shareability) / 3) * recencyMultiplier;

      // Truncate topic if needed
      const topic = item.title.length > 80
        ? item.title.substring(0, 80) + '...'
        : item.title;

      return {
        id: uuidv4(),
        topic,
        source: `Google Trends`,
        category,
        sourceApi: 'google-trends' as const,
        sourceUrl: `https://trends.google.com/trending?geo=US`,
        platform: 'general' as const,
        timestamp: item.pubDate,
        engagementCount,
        velocity,
        recency,
        relatedKeywords,
        sentiment: 'neutral' as const,
        visualPotential,
        emotionalImpact,
        shareability,
        score,
      };
    });

    // Cache results
    trendCache.set(CACHE_KEYS.GOOGLE_TRENDS, trends, CACHE_TTL.GOOGLE_TRENDS);

    console.log(`Google Trends: fetched ${trends.length} trending topics`);
    return trends;
  } catch (error) {
    console.warn('Error fetching Google Trends:', error);
    return [];
  }
}
