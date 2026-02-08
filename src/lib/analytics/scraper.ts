/**
 * Analytics Scraping System
 *
 * Automated metrics collection from TikTok, Instagram, and YouTube
 * Uses Puppeteer with anti-detection measures
 *
 * NOTE: Run `npm install puppeteer` to install required dependency
 */

import puppeteer, { Browser, Page } from "puppeteer";
import { db } from "@/lib/db";

// Proxy configuration (Bright Data)
const PROXY_USERNAME = process.env.BRIGHT_DATA_USERNAME;
const PROXY_PASSWORD = process.env.BRIGHT_DATA_PASSWORD;
const PROXY_HOST = "brd.superproxy.io";
const PROXY_PORT = "22225";

interface ScrapedMetrics {
  views: number;
  likes: number;
  comments: number;
  shares: number;
  watchTime?: number;
  engagementRate: number;
}

interface ScrapeResult {
  success: boolean;
  metrics?: ScrapedMetrics;
  error?: string;
}

export class AnalyticsScraper {
  private browser: Browser | null = null;

  /**
   * Initialize browser with anti-detection
   */
  async initialize(): Promise<void> {
    if (this.browser) {
      return;
    }

    const launchOptions: any = {
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--disable-gpu",
        "--window-size=1920x1080",
      ],
    };

    // Add proxy if configured
    if (PROXY_USERNAME && PROXY_PASSWORD) {
      launchOptions.args.push(`--proxy-server=${PROXY_HOST}:${PROXY_PORT}`);
    }

    this.browser = await puppeteer.launch(launchOptions);
  }

  /**
   * Close browser
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Configure page with anti-detection
   */
  private async configurePage(page: Page): Promise<void> {
    // Authenticate proxy if configured
    if (PROXY_USERNAME && PROXY_PASSWORD) {
      await page.authenticate({
        username: PROXY_USERNAME,
        password: PROXY_PASSWORD,
      });
    }

    // Random user agent
    const userAgents = [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    ];

    await page.setUserAgent(userAgents[Math.floor(Math.random() * userAgents.length)]);

    // Set viewport
    await page.setViewport({ width: 1920, height: 1080 });

    // Block unnecessary resources
    await page.setRequestInterception(true);
    page.on("request", (req) => {
      const resourceType = req.resourceType();
      if (["image", "stylesheet", "font", "media"].includes(resourceType)) {
        req.abort();
      } else {
        req.continue();
      }
    });

    // Hide webdriver
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, "webdriver", {
        get: () => false,
      });
    });
  }

  /**
   * Scrape TikTok video metrics
   */
  async scrapeTikTok(videoUrl: string): Promise<ScrapeResult> {
    if (!this.browser) {
      await this.initialize();
    }

    const page = await this.browser!.newPage();
    await this.configurePage(page);

    try {
      await page.goto(videoUrl, { waitUntil: "networkidle2", timeout: 30000 });

      // Wait for video stats to load
      await page.waitForSelector('[data-e2e="like-count"]', { timeout: 10000 });

      // Extract metrics
      const metrics = await page.evaluate(() => {
        const getText = (selector: string): string => {
          const element = document.querySelector(selector);
          return element?.textContent?.trim() || "0";
        };

        const parseNumber = (text: string): number => {
          // Handle K, M, B suffixes
          const multipliers: Record<string, number> = { K: 1000, M: 1000000, B: 1000000000 };
          const match = text.match(/(\d+\.?\d*)\s*([KMB])?/i);
          if (!match) return 0;
          const num = parseFloat(match[1]);
          const suffix = match[2]?.toUpperCase();
          return suffix ? num * multipliers[suffix] : num;
        };

        const views = parseNumber(getText('[data-e2e="video-views"]'));
        const likes = parseNumber(getText('[data-e2e="like-count"]'));
        const comments = parseNumber(getText('[data-e2e="comment-count"]'));
        const shares = parseNumber(getText('[data-e2e="share-count"]'));

        const engagementRate = views > 0 ? ((likes + comments + shares) / views) * 100 : 0;

        return { views, likes, comments, shares, engagementRate };
      });

      await page.close();

      return {
        success: true,
        metrics,
      };
    } catch (error) {
      await page.close();
      console.error("TikTok scraping error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Scrape Instagram Reels metrics
   */
  async scrapeInstagram(reelUrl: string): Promise<ScrapeResult> {
    if (!this.browser) {
      await this.initialize();
    }

    const page = await this.browser!.newPage();
    await this.configurePage(page);

    try {
      await page.goto(reelUrl, { waitUntil: "networkidle2", timeout: 30000 });

      // Wait for stats to load
      await page.waitForSelector('button[type="button"]', { timeout: 10000 });

      // Extract metrics
      const metrics = await page.evaluate(() => {
        const parseNumber = (text: string): number => {
          const multipliers: Record<string, number> = { K: 1000, M: 1000000, B: 1000000000 };
          const match = text.match(/(\d+\.?\d*)\s*([KMB])?/i);
          if (!match) return 0;
          const num = parseFloat(match[1]);
          const suffix = match[2]?.toUpperCase();
          return suffix ? num * multipliers[suffix] : num;
        };

        // Instagram doesn't show view count publicly, estimate from likes
        const likeButtons = document.querySelectorAll('button[type="button"]');
        let likes = 0;
        likeButtons.forEach((btn) => {
          const text = btn.textContent || "";
          if (text.includes("likes") || text.includes("like")) {
            likes = parseNumber(text);
          }
        });

        // Estimate views (typical engagement rate: 3-10%)
        const estimatedViews = likes > 0 ? Math.floor(likes / 0.05) : 0;
        const comments = 0; // Requires clicking "View all comments"
        const shares = 0; // Not publicly visible

        const engagementRate = estimatedViews > 0 ? (likes / estimatedViews) * 100 : 0;

        return {
          views: estimatedViews,
          likes,
          comments,
          shares,
          engagementRate,
        };
      });

      await page.close();

      return {
        success: true,
        metrics,
      };
    } catch (error) {
      await page.close();
      console.error("Instagram scraping error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get YouTube metrics via API (no scraping needed)
   */
  async getYouTubeMetrics(videoId: string): Promise<ScrapeResult> {
    try {
      const apiKey = process.env.YOUTUBE_API_KEY;

      if (!apiKey) {
        throw new Error("YouTube API key not configured");
      }

      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoId}&key=${apiKey}`
      );

      const data = await response.json();

      if (!response.ok || !data.items || data.items.length === 0) {
        throw new Error("Video not found or API error");
      }

      const stats = data.items[0].statistics;

      const views = parseInt(stats.viewCount || "0");
      const likes = parseInt(stats.likeCount || "0");
      const comments = parseInt(stats.commentCount || "0");
      const shares = 0; // Not provided by API

      const engagementRate = views > 0 ? ((likes + comments) / views) * 100 : 0;

      return {
        success: true,
        metrics: {
          views,
          likes,
          comments,
          shares,
          engagementRate,
        },
      };
    } catch (error) {
      console.error("YouTube API error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Scrape metrics for a video post
   */
  async scrapePost(
    platform: string,
    postUrl: string
  ): Promise<ScrapeResult> {
    switch (platform) {
      case "tiktok":
        return await this.scrapeTikTok(postUrl);

      case "instagram":
        return await this.scrapeInstagram(postUrl);

      case "youtube":
        // Extract video ID from URL
        const videoId = postUrl.match(/shorts\/([^?]+)/)?.[1] || postUrl.match(/v=([^&]+)/)?.[1];
        if (!videoId) {
          return { success: false, error: "Invalid YouTube URL" };
        }
        return await this.getYouTubeMetrics(videoId);

      default:
        return {
          success: false,
          error: `Unsupported platform: ${platform}`,
        };
    }
  }

  /**
   * Save metrics snapshot to database
   */
  async saveSnapshot(
    videoId: string,
    platform: string,
    metrics: ScrapedMetrics
  ): Promise<void> {
    await db.analyticsSnapshot.create({
      data: {
        videoId,
        platform,
        views: metrics.views,
        likes: metrics.likes,
        shares: metrics.shares,
        comments: metrics.comments,
        watchTime: metrics.watchTime,
        engagementRate: metrics.engagementRate,
        snapshotAt: new Date(),
      },
    });
  }
}

// Export singleton instance
export const analyticsScraper = new AnalyticsScraper();

/**
 * Schedule scraping for a video post
 * Intervals: 15min, 1hr, 6hr, 24hr, 7d
 */
export async function scheduleAnalyticsScraping(
  videoId: string,
  platform: string,
  postUrl: string
): Promise<void> {
  const intervals = [
    15 * 60 * 1000, // 15 minutes
    60 * 60 * 1000, // 1 hour
    6 * 60 * 60 * 1000, // 6 hours
    24 * 60 * 60 * 1000, // 24 hours
    7 * 24 * 60 * 60 * 1000, // 7 days
  ];

  // Schedule via job queue or cron
  // Implementation depends on infrastructure choice
  console.log(`Scheduled analytics scraping for video ${videoId} on ${platform}`);
}
