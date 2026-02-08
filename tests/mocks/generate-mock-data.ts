/**
 * Generate Mock Data for Testing
 *
 * Creates realistic test data for development and testing
 */

import type { ViralConcept, TrendData, Generation, PerformanceFeedback } from "@/types";

/**
 * Generate mock viral concepts
 */
export function generateMockConcepts(count: number = 5): ViralConcept[] {
  const categories = ["finance", "tech", "gaming", "fitness", "luxury"] as const;
  const concepts: ViralConcept[] = [];

  for (let i = 0; i < count; i++) {
    const category = categories[i % categories.length];

    concepts.push({
      id: `mock_concept_${Date.now()}_${i}`,
      title: `Test ${category.charAt(0).toUpperCase() + category.slice(1)} Concept ${i + 1}`,
      script: [
        {
          timeRange: "0:00-0:03",
          visual: "Opening hook scene",
          onScreenText: "DID YOU KNOW?",
          camera: "Close-up",
        },
        {
          timeRange: "0:03-0:10",
          visual: "Main content",
          onScreenText: null,
          camera: "Medium shot",
        },
        {
          timeRange: "0:10-0:15",
          visual: "CTA and closing",
          onScreenText: "FOLLOW FOR MORE",
          camera: "Wide shot",
        },
      ],
      soraPrompt: `Professional ${category} video in 9:16 aspect ratio, 15 seconds, cinematic lighting`,
      veoPrompt: `Modern ${category} content with dynamic camera movements, vertical format`,
      caption: `Test caption for ${category} content #${category} #viral`,
      hashtags: [`#${category}`, "#viral", "#fyp", "#trending"],
      postTime: {
        utc: "14:00",
        est: "09:00 AM",
        reason: "Peak engagement time",
      },
      whyItWorks: `Test concept for ${category} category`,
      trendSource: "Mock Trends API",
      category,
      platformVirality: {
        tiktok: {
          score: 75 + Math.random() * 20,
          label: "High Potential",
          factors: ["Trending topic", "Strong hook", "Clear CTA"],
        },
        youtubeShorts: {
          score: 70 + Math.random() * 20,
          label: "High Potential",
          factors: ["Search-friendly", "Engaging thumbnail", "Value-packed"],
        },
      },
      monetization: {
        estimatedRPM: {
          tiktok: 0.02 + Math.random() * 0.08,
          youtubeShorts: 0.15 + Math.random() * 0.35,
        },
        score: 60 + Math.random() * 30,
        label: "Good",
        sponsorPotential: "medium",
        bestStrategy: "Organic + affiliate links",
      },
    });
  }

  return concepts;
}

/**
 * Generate mock trend data
 */
export function generateMockTrends(count: number = 10): TrendData[] {
  const categories = ["finance", "tech", "gaming", "fitness", "luxury", "news"];
  const sources = ["youtube", "reddit", "gnews", "google-trends", "tiktok-creative"] as const;
  const trends: TrendData[] = [];

  for (let i = 0; i < count; i++) {
    const category = categories[i % categories.length] as any;
    const source = sources[i % sources.length];

    trends.push({
      id: `mock_trend_${Date.now()}_${i}`,
      topic: `Mock ${category} trend ${i + 1}`,
      source: `Mock ${source}`,
      score: 60 + Math.random() * 40,
      recency: i < 3 ? "today" : i < 7 ? "yesterday" : "older",
      visualPotential: 60 + Math.random() * 40,
      emotionalImpact: 50 + Math.random() * 50,
      shareability: 55 + Math.random() * 45,
      sourceApi: source,
      sourceUrl: `https://example.com/${source}/${i}`,
      velocity: Math.floor(1000 + Math.random() * 9000),
      engagementCount: Math.floor(5000 + Math.random() * 95000),
      platform: source === "youtube" ? "youtube" : source === "reddit" ? "reddit" : "general",
      timestamp: new Date(Date.now() - i * 3600000).toISOString(),
      category,
      relatedKeywords: [`${category}`, "trending", "viral"],
      sentiment: ["positive", "negative", "neutral", "mixed"][Math.floor(Math.random() * 4)] as any,
    });
  }

  return trends;
}

/**
 * Generate mock generation
 */
export function generateMockGeneration(): Generation {
  return {
    id: `mock_generation_${Date.now()}`,
    date: new Date().toISOString(),
    concepts: generateMockConcepts(5),
    trends: generateMockTrends(10),
    isFavorite: false,
  };
}

/**
 * Generate mock performance feedback
 */
export function generateMockPerformanceFeedback(conceptId: string): PerformanceFeedback {
  const views = Math.floor(1000 + Math.random() * 99000);
  const likes = Math.floor(views * (0.05 + Math.random() * 0.15));
  const shares = Math.floor(views * (0.01 + Math.random() * 0.05));
  const comments = Math.floor(views * (0.005 + Math.random() * 0.015));
  const engagementRate = ((likes + shares + comments) / views) * 100;

  return {
    id: `mock_feedback_${Date.now()}`,
    conceptId,
    conceptTitle: "Mock Concept",
    category: "tech",
    platform: "tiktok",
    metrics: {
      views,
      likes,
      shares,
      comments,
    },
    engagementRate,
    reportedAt: new Date().toISOString(),
  };
}

/**
 * Generate test API key
 */
export function generateMockApiKey(): string {
  return `vd_mock_${Array.from({ length: 32 }, () =>
    Math.random().toString(36).charAt(2)
  ).join("")}`;
}

/**
 * Export all generators
 */
export const mockData = {
  concepts: generateMockConcepts,
  trends: generateMockTrends,
  generation: generateMockGeneration,
  feedback: generateMockPerformanceFeedback,
  apiKey: generateMockApiKey,
};
