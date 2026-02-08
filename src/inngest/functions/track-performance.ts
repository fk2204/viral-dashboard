/**
 * Automated Performance Tracking (Inngest Function)
 *
 * Scrapes analytics every 6 hours and submits to reflexion system
 * Completes the autonomous learning loop
 */

import { inngest } from "../client";
import { db } from "@/lib/db";
import { analyticsScraper } from "@/lib/analytics/scraper";
import { videoAnalyzer } from "@/lib/learning/video-analysis";
import { runReflexion } from "@/lib/learning/reflexion";

/**
 * Track performance for a single video
 */
export const trackPerformanceFunction = inngest.createFunction(
  {
    id: "track-performance",
    name: "Track Video Performance",
  },
  { event: "analytics/scrape" },
  async ({ event, step }) => {
    const { videoId, conceptId, platforms } = event.data as {
      videoId: string;
      conceptId: string;
      platforms: string[];
    };

    // Step 1: Get video and posts
    const video = await step.run("get-video", async () => {
      return await db.video.findUnique({
        where: { id: videoId },
      });
    });

    if (!video) {
      throw new Error(`Video not found: ${videoId}`);
    }

    const posts = await step.run("get-posts", async () => {
      return await db.socialPost.findMany({
        where: {
          videoId,
          status: "posted",
          platform: { in: platforms },
        },
      });
    });

    // Step 2: Scrape analytics for each platform
    const analyticsResults: Record<string, any> = {};

    for (const post of posts) {
      if (!post.postUrl) continue;

      const result = await step.run(`scrape-${post.platform}`, async () => {
        await analyticsScraper.initialize();

        const scrapeResult = await analyticsScraper.scrapePost(
          post.platform,
          post.postUrl
        );

        await analyticsScraper.close();

        if (scrapeResult.success && scrapeResult.metrics) {
          // Save snapshot
          await analyticsScraper.saveSnapshot(
            videoId,
            post.platform,
            scrapeResult.metrics
          );

          return {
            platform: post.platform,
            metrics: scrapeResult.metrics,
          };
        }

        return {
          platform: post.platform,
          error: scrapeResult.error,
        };
      });

      analyticsResults[post.platform] = result;
    }

    // Step 3: Perform video analysis (if not already done)
    const videoAnalysis = await step.run("analyze-video", async () => {
      const metadata = video.metadata as any;

      if (metadata?.visualAnalysis) {
        return metadata.visualAnalysis;
      }

      // Analyze video content
      const analysis = await videoAnalyzer.analyzeVideo(
        video.cdnUrl || video.videoUrl,
        video.category,
        video.platform
      );

      // Store analysis in video metadata
      if (analysis.success) {
        await db.video.update({
          where: { id: videoId },
          data: {
            metadata: {
              ...metadata,
              visualAnalysis: analysis,
            },
          },
        });
      }

      return analysis;
    });

    // Step 4: Submit feedback to reflexion system
    const reflexionResults: Record<string, any> = {};

    for (const [platform, result] of Object.entries(analyticsResults)) {
      if (!result.metrics) continue;

      const feedbackResult = await step.run(
        `submit-feedback-${platform}`,
        async () => {
          // Create performance feedback record
          const feedback = await db.performanceFeedback.create({
            data: {
              tenantId: video.tenantId,
              conceptId,
              conceptTitle: `Video ${videoId}`,
              category: video.category,
              platform,
              views: result.metrics.views,
              likes: result.metrics.likes,
              shares: result.metrics.shares,
              comments: result.metrics.comments,
              engagementRate: result.metrics.engagementRate,
              dataSource: "scraped",
            },
          });

          // Trigger reflexion analysis
          const reflexionResult = await runReflexion(video.tenantId);

          return {
            feedbackId: feedback.id,
            reflexion: reflexionResult,
          };
        }
      );

      reflexionResults[platform] = feedbackResult;
    }

    return {
      videoId,
      conceptId,
      platforms,
      analytics: analyticsResults,
      videoAnalysis,
      reflexion: reflexionResults,
    };
  }
);

/**
 * Batch performance tracking (cron job)
 * Runs every 6 hours to scrape analytics for recent videos
 */
export const batchTrackPerformanceFunction = inngest.createFunction(
  {
    id: "batch-track-performance",
    name: "Batch Performance Tracking",
  },
  { cron: "0 */6 * * *" }, // Every 6 hours
  async ({ step }) => {
    // Get videos posted in last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const recentPosts = await step.run("get-recent-posts", async () => {
      return await db.socialPost.findMany({
        where: {
          status: "posted",
          postedAt: {
            gte: sevenDaysAgo,
          },
        },
        include: {
          account: true,
        },
        orderBy: {
          postedAt: "desc",
        },
        take: 50, // Limit to 50 most recent posts
      });
    });

    // Group by video
    const videoGroups: Record<string, any[]> = {};
    for (const post of recentPosts) {
      if (!videoGroups[post.videoId]) {
        videoGroups[post.videoId] = [];
      }
      videoGroups[post.videoId].push(post);
    }

    // Trigger tracking for each video
    let tracked = 0;

    for (const [videoId, posts] of Object.entries(videoGroups)) {
      const video = await db.video.findUnique({
        where: { id: videoId },
      });

      if (!video) continue;

      // Send tracking event
      await inngest.send({
        name: "analytics/scrape",
        data: {
          videoId,
          conceptId: video.conceptId,
          platforms: posts.map((p) => p.platform),
        },
      });

      tracked++;
    }

    return {
      totalVideos: Object.keys(videoGroups).length,
      tracked,
    };
  }
);
