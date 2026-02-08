/**
 * Audio Trend Tracking System
 *
 * Tracks trending sounds from TikTok Creative Center
 * Integrates with concept generation to attach trending audio
 */

import { db } from "@/lib/db";

// TikTok Creative Center API (unofficial endpoint)
const TIKTOK_CREATIVE_API = "https://ads.tiktok.com/creative_radar_api/v1";

interface TrendingSound {
  soundId: string;
  soundName: string;
  artistName?: string;
  usageCount: number;
  category?: string;
  platform: "tiktok" | "instagram";
}

interface AudioTrendResult {
  success: boolean;
  sounds: TrendingSound[];
  error?: string;
}

export class AudioTrendTracker {
  /**
   * Fetch trending sounds from TikTok Creative Center
   */
  async fetchTikTokTrendingSounds(
    region: string = "US",
    limit: number = 50
  ): Promise<AudioTrendResult> {
    try {
      // Note: This endpoint may require authentication
      // Alternative: Scrape from https://ads.tiktok.com/business/creativecenter/music
      const response = await fetch(
        `${TIKTOK_CREATIVE_API}/popular_trend/music/list?period=7&region=${region}&limit=${limit}`,
        {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`TikTok API error: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.data || !Array.isArray(data.data.list)) {
        throw new Error("Invalid response format from TikTok API");
      }

      const sounds: TrendingSound[] = data.data.list.map((item: any) => ({
        soundId: item.music_id || item.id,
        soundName: item.music_title || item.title,
        artistName: item.author_name || item.artist,
        usageCount: item.publish_cnt || item.usage_count || 0,
        category: this.categorizeSound(item.music_title || item.title),
        platform: "tiktok" as const,
      }));

      return {
        success: true,
        sounds,
      };
    } catch (error) {
      console.error("TikTok audio trends error:", error);
      return {
        success: false,
        sounds: [],
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Categorize sound by name/keywords
   */
  private categorizeSound(soundName: string): string {
    const name = soundName.toLowerCase();

    if (name.includes("gym") || name.includes("workout") || name.includes("motivation")) {
      return "fitness";
    }
    if (name.includes("money") || name.includes("cash") || name.includes("wealth")) {
      return "finance";
    }
    if (name.includes("tech") || name.includes("ai") || name.includes("digital")) {
      return "tech";
    }
    if (name.includes("game") || name.includes("gaming")) {
      return "gaming";
    }
    if (name.includes("love") || name.includes("heart") || name.includes("sad")) {
      return "emotional";
    }
    if (name.includes("comedy") || name.includes("funny") || name.includes("meme")) {
      return "absurd";
    }

    return "general";
  }

  /**
   * Calculate trend score based on usage and velocity
   */
  private calculateTrendScore(
    currentUsage: number,
    previousUsage: number = 0
  ): number {
    const baseScore = Math.min(currentUsage / 10000, 100); // Normalize usage
    const velocity = previousUsage > 0 ? (currentUsage - previousUsage) / previousUsage : 1;
    const velocityBonus = Math.min(velocity * 20, 50); // Up to 50 bonus points

    return Math.min(baseScore + velocityBonus, 100);
  }

  /**
   * Store trending sounds in database
   */
  async storeTrendingSounds(sounds: TrendingSound[]): Promise<number> {
    let stored = 0;

    for (const sound of sounds) {
      try {
        // Get previous usage count
        const existing = await db.audioTrend.findUnique({
          where: {
            platform_soundId: {
              platform: sound.platform,
              soundId: sound.soundId,
            },
          },
        });

        const trendScore = this.calculateTrendScore(
          sound.usageCount,
          existing?.usageCount || 0
        );

        // Upsert audio trend
        await db.audioTrend.upsert({
          where: {
            platform_soundId: {
              platform: sound.platform,
              soundId: sound.soundId,
            },
          },
          create: {
            platform: sound.platform,
            soundId: sound.soundId,
            soundName: sound.soundName,
            artistName: sound.artistName,
            usageCount: sound.usageCount,
            trendScore,
            category: sound.category,
            isActive: true,
          },
          update: {
            soundName: sound.soundName,
            artistName: sound.artistName,
            usageCount: sound.usageCount,
            trendScore,
            category: sound.category,
            lastSeenAt: new Date(),
            isActive: true,
          },
        });

        stored++;
      } catch (error) {
        console.error(`Failed to store sound ${sound.soundId}:`, error);
      }
    }

    return stored;
  }

  /**
   * Get trending sounds for a category
   */
  async getTrendingSoundsForCategory(
    category: string,
    platform: string = "tiktok",
    limit: number = 10
  ): Promise<TrendingSound[]> {
    const trends = await db.audioTrend.findMany({
      where: {
        platform,
        category,
        isActive: true,
      },
      orderBy: {
        trendScore: "desc",
      },
      take: limit,
    });

    return trends.map((t) => ({
      soundId: t.soundId,
      soundName: t.soundName,
      artistName: t.artistName || undefined,
      usageCount: t.usageCount,
      category: t.category || undefined,
      platform: t.platform as "tiktok" | "instagram",
    }));
  }

  /**
   * Attach trending sound to concept
   */
  async attachSoundToConcept(
    category: string,
    platform: string = "tiktok"
  ): Promise<{ soundId: string; soundName: string } | null> {
    const sounds = await this.getTrendingSoundsForCategory(category, platform, 1);

    if (sounds.length === 0) {
      return null;
    }

    return {
      soundId: sounds[0].soundId,
      soundName: sounds[0].soundName,
    };
  }

  /**
   * Mark inactive sounds (not seen in last 7 days)
   */
  async markInactiveSounds(): Promise<number> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const result = await db.audioTrend.updateMany({
      where: {
        lastSeenAt: {
          lt: sevenDaysAgo,
        },
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });

    return result.count;
  }

  /**
   * Sync audio trends (cron job)
   */
  async syncTrends(): Promise<{
    fetched: number;
    stored: number;
    deactivated: number;
  }> {
    console.log("Syncing audio trends from TikTok...");

    // Fetch trending sounds
    const result = await this.fetchTikTokTrendingSounds("US", 100);

    if (!result.success) {
      throw new Error(`Failed to fetch trends: ${result.error}`);
    }

    // Store in database
    const stored = await this.storeTrendingSounds(result.sounds);

    // Mark inactive sounds
    const deactivated = await this.markInactiveSounds();

    console.log(
      `Audio trends synced: ${stored} stored, ${deactivated} deactivated`
    );

    return {
      fetched: result.sounds.length,
      stored,
      deactivated,
    };
  }
}

// Export singleton instance
export const audioTrendTracker = new AudioTrendTracker();

/**
 * Get trending sound recommendation for concept
 */
export async function getRecommendedSound(
  category: string,
  platform: string = "tiktok"
): Promise<string | null> {
  const sound = await audioTrendTracker.attachSoundToConcept(category, platform);
  return sound ? `🎵 Trending Sound: "${sound.soundName}" (ID: ${sound.soundId})` : null;
}
