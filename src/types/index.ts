export interface ScriptSegment {
  timeRange: string;
  visual: string;
  onScreenText: string | null;
  camera: string;
}

export interface ViralConcept {
  id: string;
  title: string;
  script: ScriptSegment[];
  soraPrompt: string;
  veoPrompt: string;
  caption: string;
  hashtags: string[];
  postTime: { utc: string; est: string };
  whyItWorks: string;
  trendSource: string;
  category: 'news' | 'absurd' | 'luxury' | 'emotional' | 'tech' | 'cartoon';
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
