/**
 * Competitive Benchmarking System
 *
 * Tracks top creator videos to extract winning patterns
 * Analyzes hooks, hashtags, posting frequency, and engagement
 */

import { db } from "@/lib/db";
import { analyticsScraper } from "@/lib/analytics/scraper";

interface TopCreator {
  platform: string;
  username: string;
  category: string;
  followerCount?: number;
}

interface CompetitorVideo {
  platform: string;
  creatorUsername: string;
  category: string;
  videoId: string;
  title?: string;
  views: number;
  likes: number;
  comments: number;
  engagementRate: number;
  duration: number;
  hashtags?: string[];
  soundId?: string;
  hookText?: string;
  publishedAt: Date;
}

interface CompetitorInsights {
  category: string;
  avgViews: number;
  avgEngagement: number;
  topHashtags: string[];
  avgDuration: number;
  bestPostingTimes: number[]; // Hours (0-23)
  commonHooks: string[];
}

export class CompetitorTracker {
  /**
   * Predefined list of top creators per category
   */
  private topCreators: Record<string, TopCreator[]> = {
    finance: [
      { platform: "tiktok", username: "humphrey", category: "finance" },
      { platform: "tiktok", username: "vincentchan", category: "finance" },
      { platform: "youtube", username: "@GrahamStephan", category: "finance" },
    ],
    tech: [
      { platform: "tiktok", username: "mik sends", category: "tech" },
      { platform: "youtube", username: "@mkbhd", category: "tech" },
    ],
    fitness: [
      { platform: "tiktok", username: "gregdoucette", category: "fitness" },
      { platform: "instagram", username: "kayla_itsines", category: "fitness" },
    ],
    // Add more categories as needed
  };

  /**
   * Scrape recent videos from a creator
   */
  async scrapeCreatorVideos(
    creator: TopCreator,
    limit: number = 10
  ): Promise<CompetitorVideo[]> {
    // This would require platform-specific scraping
    // For now, return mock data structure
    console.log(`Scraping ${limit} videos from ${creator.username} on ${creator.platform}`);

    // TODO: Implement actual scraping logic per platform
    // TikTok: Profile page → Recent videos
    // YouTube: Shorts tab → Recent shorts
    // Instagram: Reels tab → Recent reels

    return [];
  }

  /**
   * Store competitor video in database
   */
  async storeCompetitorVideo(video: CompetitorVideo): Promise<void> {
    await db.competitorVideo.upsert({
      where: {
        platform_videoId: {
          platform: video.platform,
          videoId: video.videoId,
        },
      },
      create: {
        platform: video.platform,
        creatorUsername: video.creatorUsername,
        category: video.category,
        videoId: video.videoId,
        title: video.title,
        views: video.views,
        likes: video.likes,
        comments: video.comments,
        engagementRate: video.engagementRate,
        duration: video.duration,
        hashtags: video.hashtags,
        soundId: video.soundId,
        hookText: video.hookText,
        publishedAt: video.publishedAt,
      },
      update: {
        views: video.views,
        likes: video.likes,
        comments: video.comments,
        engagementRate: video.engagementRate,
        scrapedAt: new Date(),
      },
    });
  }

  /**
   * Analyze competitor patterns for a category
   */
  async analyzeCategory(category: string): Promise<CompetitorInsights> {
    // Get last 30 days of competitor videos
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const videos = await db.competitorVideo.findMany({
      where: {
        category,
        publishedAt: {
          gte: thirtyDaysAgo,
        },
      },
      orderBy: {
        engagementRate: "desc",
      },
    });

    if (videos.length === 0) {
      return {
        category,
        avgViews: 0,
        avgEngagement: 0,
        topHashtags: [],
        avgDuration: 15,
        bestPostingTimes: [],
        commonHooks: [],
      };
    }

    // Calculate averages
    const avgViews = videos.reduce((sum, v) => sum + v.views, 0) / videos.length;
    const avgEngagement =
      videos.reduce((sum, v) => sum + Number(v.engagementRate), 0) / videos.length;
    const avgDuration = videos.reduce((sum, v) => sum + v.duration, 0) / videos.length;

    // Extract top hashtags
    const hashtagCounts: Record<string, number> = {};
    videos.forEach((v) => {
      if (v.hashtags && Array.isArray(v.hashtags)) {
        (v.hashtags as string[]).forEach((tag) => {
          hashtagCounts[tag] = (hashtagCounts[tag] || 0) + 1;
        });
      }
    });

    const topHashtags = Object.entries(hashtagCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([tag]) => tag);

    // Analyze posting times
    const postingHours = videos.map((v) => new Date(v.publishedAt).getUTCHours());
    const hourCounts: Record<number, number> = {};
    postingHours.forEach((hour) => {
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    const bestPostingTimes = Object.entries(hourCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([hour]) => parseInt(hour));

    // Extract common hooks
    const hooks = videos
      .filter((v) => v.hookText)
      .map((v) => v.hookText!)
      .slice(0, 10);

    return {
      category,
      avgViews: Math.round(avgViews),
      avgEngagement: parseFloat(avgEngagement.toFixed(2)),
      topHashtags,
      avgDuration: Math.round(avgDuration),
      bestPostingTimes,
      commonHooks: hooks,
    };
  }

  /**
   * Get competitive benchmark for concept
   */
  async getBenchmark(
    category: string,
    platform: string
  ): Promise<{
    avgViews: number;
    avgEngagement: number;
    recommendedHashtags: string[];
    optimalDuration: number;
  }> {
    const insights = await this.analyzeCategory(category);

    return {
      avgViews: insights.avgViews,
      avgEngagement: insights.avgEngagement,
      recommendedHashtags: insights.topHashtags.slice(0, 5),
      optimalDuration: insights.avgDuration,
    };
  }

  /**
   * Sync competitor data (cron job)
   */
  async syncCompetitors(): Promise<{ scraped: number; stored: number }> {
    let scraped = 0;
    let stored = 0;

    for (const [category, creators] of Object.entries(this.topCreators)) {
      for (const creator of creators) {
        try {
          const videos = await this.scrapeCreatorVideos(creator, 5);
          scraped += videos.length;

          for (const video of videos) {
            await this.storeCompetitorVideo(video);
            stored++;
          }
        } catch (error) {
          console.error(`Failed to scrape ${creator.username}:`, error);
        }
      }
    }

    console.log(`Competitor sync complete: ${scraped} scraped, ${stored} stored`);

    return { scraped, stored };
  }
}

// Export singleton instance
export const competitorTracker = new CompetitorTracker();
