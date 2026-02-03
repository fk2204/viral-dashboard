import { TrendData } from '@/types';
import { v4 as uuidv4 } from 'uuid';

const TRENDING_TOPICS = [
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
];

function calculateScore(
  visualPotential: number,
  emotionalImpact: number,
  shareability: number,
  recency: 'today' | 'yesterday' | 'older'
): number {
  const recencyMultiplier = recency === 'today' ? 1.5 : recency === 'yesterday' ? 1.2 : 1.0;
  return ((visualPotential + emotionalImpact + shareability) / 3) * recencyMultiplier;
}

export function generateTrendData(): TrendData[] {
  const shuffled = [...TRENDING_TOPICS].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, 10);

  return selected.map(item => {
    const recencyOptions: ('today' | 'yesterday' | 'older')[] = ['today', 'today', 'today', 'yesterday', 'older'];
    const recency = recencyOptions[Math.floor(Math.random() * recencyOptions.length)];

    const visualPotential = Math.floor(Math.random() * 30) + 70;
    const emotionalImpact = Math.floor(Math.random() * 30) + 70;
    const shareability = Math.floor(Math.random() * 30) + 70;

    return {
      id: uuidv4(),
      topic: item.topic,
      source: item.source,
      recency,
      visualPotential,
      emotionalImpact,
      shareability,
      score: calculateScore(visualPotential, emotionalImpact, shareability, recency),
    };
  }).sort((a, b) => b.score - a.score);
}

export function getTopTrendsByCategory(trends: TrendData[]): Record<string, TrendData[]> {
  const categories: Record<string, TrendData[]> = {
    news: [],
    absurd: [],
    luxury: [],
    emotional: [],
    tech: [],
  };

  const topicToCategory: Record<string, string> = {};
  TRENDING_TOPICS.forEach(t => {
    topicToCategory[t.topic] = t.category;
  });

  trends.forEach(trend => {
    const category = topicToCategory[trend.topic];
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
