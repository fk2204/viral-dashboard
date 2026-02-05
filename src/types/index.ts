export interface ScriptSegment {
  timeRange: string;
  visual: string;
  onScreenText: string | null;
  camera: string;
}

export type Category = 'news' | 'absurd' | 'luxury' | 'emotional' | 'tech' | 'cartoon' | 'gaming' | 'fitness' | 'food' | 'finance' | 'music' | 'relationships';

export interface ViralConcept {
  id: string;
  title: string;
  script: ScriptSegment[];
  soraPrompt: string;
  veoPrompt: string;
  caption: string;
  hashtags: string[];
  postTime: { utc: string; est: string; reason?: string };
  whyItWorks: string;
  trendSource: string;
  category: Category;
  platformVirality?: PlatformVirality;
  monetization?: MonetizationData;
  variants?: ABVariant[];
}

export interface TrendData {
  id: string;
  topic: string;
  source: string;
  score: number;
  recency: 'today' | 'yesterday' | 'older';
  visualPotential: number;
  emotionalImpact: number;
  shareability: number;
  sourceApi?: 'youtube' | 'reddit' | 'gnews' | 'google-trends' | 'tiktok-creative' | 'fallback';
  sourceUrl?: string;
  velocity?: number;
  engagementCount?: number;
  platform?: 'youtube' | 'reddit' | 'news' | 'general';
  timestamp?: string;
  category: Category;
  relatedKeywords?: string[];
  sentiment?: 'positive' | 'negative' | 'neutral' | 'mixed';
}

export interface YouTubeTrendItem {
  id: string;
  snippet: {
    title: string;
    description: string;
    channelTitle: string;
    publishedAt: string;
    categoryId: string;
    tags?: string[];
  };
  statistics: {
    viewCount: string;
    likeCount: string;
    commentCount: string;
  };
}

export interface RedditTrendItem {
  data: {
    id: string;
    title: string;
    subreddit: string;
    score: number;
    upvote_ratio: number;
    num_comments: number;
    created_utc: number;
    url: string;
    permalink: string;
    is_video: boolean;
  };
}

export interface GNewsTrendItem {
  title: string;
  description: string;
  url: string;
  image: string;
  publishedAt: string;
  source: {
    name: string;
    url: string;
  };
}

export interface PlatformVirality {
  tiktok: { score: number; label: string; factors: string[] };
  youtubeShorts: { score: number; label: string; factors: string[] };
}

export interface MonetizationData {
  estimatedRPM: { tiktok: number; youtubeShorts: number };
  score: number;
  label: string;
  sponsorPotential: 'low' | 'medium' | 'high' | 'premium';
  bestStrategy: string;
}

export interface Generation {
  id: string;
  date: string;
  concepts: ViralConcept[];
  trends: TrendData[];
  isFavorite: boolean;
}

export interface TrendResearchResult {
  trends: TrendData[];
  fetchedAt: string;
}

export interface ABVariant {
  id: string;
  label: string;          // "A", "B", "C"
  title: string;
  caption: string;
  hookSource: string;     // "template" | "evolved" | "knowledge-base"
  selected?: boolean;     // user's pick
  performanceId?: string; // links to performance feedback if reported
}

export interface PerformanceFeedback {
  id: string;
  conceptId: string;
  conceptTitle: string;
  category: Category;
  platform: 'tiktok' | 'youtube-shorts';
  variantId?: string;     // which A/B variant was used
  metrics: {
    views: number;
    likes: number;
    shares: number;
    comments: number;
  };
  engagementRate: number; // calculated: (likes + shares + comments) / views * 100
  reportedAt: string;
}

export interface PerformanceHistory {
  entries: PerformanceFeedback[];
  categoryStats: Record<string, CategoryPerformanceStats>;
  lastUpdated: string;
}

export interface CategoryPerformanceStats {
  totalEntries: number;
  avgViews: number;
  avgEngagementRate: number;
  bestPerforming: { conceptId: string; engagementRate: number } | null;
  platformBreakdown: {
    tiktok: { entries: number; avgEngagement: number };
    youtubeShorts: { entries: number; avgEngagement: number };
  };
}
