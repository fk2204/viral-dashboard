/**
 * Social Media Posting Queue (Inngest Function)
 *
 * Triggered when video generation completes (video.ready event)
 * Automatically posts to TikTok, YouTube Shorts, and Instagram Reels
 */

import { inngest } from "../client";
import { db } from "@/lib/db";
import { accountPool } from "@/lib/social/account-pool";
import { oauthManager } from "@/lib/social/oauth-manager";
import { tiktokClient } from "@/lib/social/tiktok";
import { youtubeClient } from "@/lib/social/youtube";
import { instagramClient } from "@/lib/social/instagram";
import type { Video } from "@prisma/client";

interface VideoReadyEvent {
  videoId: string;
  tenantId: string;
  conceptId: string;
  category: string;
  platforms: ("tiktok" | "youtube" | "instagram")[];
  caption: string;
  hashtags: string[];
}

export const postToPlatformsFunction = inngest.createFunction(
  {
    id: "post-to-platforms",
    name: "Post to Social Media Platforms",
    retries: 3,
  },
  { event: "video/ready" },
  async ({ event, step }) => {
    const data = event.data as VideoReadyEvent;

    // Step 1: Get video details
    const video = await step.run("get-video", async () => {
      const v = await db.video.findUnique({
        where: { id: data.videoId },
      });

      if (!v) {
        throw new Error(`Video not found: ${data.videoId}`);
      }

      if (v.status !== "completed") {
        throw new Error(`Video not completed: ${v.status}`);
      }

      return v;
    });

    // Step 2: Post to each platform
    const results: Record<string, any> = {};

    for (const platform of data.platforms) {
      const platformResult = await step.run(`post-to-${platform}`, async () => {
        try {
          // Select best account for this platform
          const account = await accountPool.selectAccount({
            platform,
            tenantId: data.tenantId,
            category: data.category,
            minimumQuota: 1,
          });

          if (!account) {
            return {
              success: false,
              error: `No available ${platform} account with quota`,
            };
          }

          // Reserve quota
          const reserved = await accountPool.reserveQuota(account.id);

          if (!reserved) {
            return {
              success: false,
              error: `Failed to reserve quota for ${platform}`,
            };
          }

          // Get fresh access token (auto-refreshes if needed)
          const accessToken = await oauthManager.getAccessToken(account.id);

          if (!accessToken) {
            await accountPool.releaseQuota(account.id);
            return {
              success: false,
              error: `Failed to get access token for ${platform}`,
            };
          }

          // Update account with fresh token
          const updatedAccount = await oauthManager.getDecryptedAccount(account.id);

          if (!updatedAccount) {
            await accountPool.releaseQuota(account.id);
            return {
              success: false,
              error: `Failed to get account details for ${platform}`,
            };
          }

          // Post to platform
          let postResult;

          switch (platform) {
            case "tiktok":
              postResult = await tiktokClient.uploadVideo(updatedAccount, {
                videoUrl: video.cdnUrl || video.videoUrl,
                caption: data.caption,
                hashtags: data.hashtags,
                privacyLevel: "public",
                allowComments: true,
                allowDuet: true,
                allowStitch: true,
              });
              break;

            case "youtube":
              postResult = await youtubeClient.uploadVideo(updatedAccount, {
                videoUrl: video.cdnUrl || video.videoUrl,
                title: data.caption.substring(0, 100),
                description: data.caption,
                hashtags: data.hashtags,
                categoryId: "24", // Entertainment
                privacyStatus: "public",
                madeForKids: false,
              });
              break;

            case "instagram":
              postResult = await instagramClient.uploadVideo(updatedAccount, {
                videoUrl: video.cdnUrl || video.videoUrl,
                caption: data.caption,
                hashtags: data.hashtags,
                shareToFeed: true,
              });
              break;

            default:
              return {
                success: false,
                error: `Unsupported platform: ${platform}`,
              };
          }

          if (postResult.success) {
            // Save post record
            await db.socialPost.create({
              data: {
                videoId: video.id,
                accountId: account.id,
                platform,
                postUrl: postResult.postUrl,
                platformPostId: postResult.postId,
                status: "posted",
                postedAt: new Date(),
              },
            });

            // Increment account usage
            await tiktokClient.incrementUsage(account.id);

            return {
              success: true,
              postId: postResult.postId,
              postUrl: postResult.postUrl,
              accountUsername: account.username,
            };
          } else {
            // Release quota on failure
            await accountPool.releaseQuota(account.id);

            // Save failed post record
            await db.socialPost.create({
              data: {
                videoId: video.id,
                accountId: account.id,
                platform,
                status: "failed",
                errorMessage: postResult.error,
              },
            });

            return {
              success: false,
              error: postResult.error,
            };
          }
        } catch (error) {
          console.error(`Error posting to ${platform}:`, error);

          return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          };
        }
      });

      results[platform] = platformResult;
    }

    // Step 3: Schedule analytics scraping (6 hours after posting)
    const successfulPosts = Object.entries(results).filter(
      ([_, result]) => result.success
    );

    if (successfulPosts.length > 0) {
      await step.run("schedule-analytics", async () => {
        const scheduledTime = new Date(Date.now() + 6 * 60 * 60 * 1000); // 6 hours

        await inngest.send({
          name: "analytics/scrape",
          data: {
            videoId: data.videoId,
            conceptId: data.conceptId,
            platforms: successfulPosts.map(([platform]) => platform),
          },
          ts: scheduledTime.getTime(),
        });

        return {
          scheduled: true,
          scheduledFor: scheduledTime.toISOString(),
          platforms: successfulPosts.map(([platform]) => platform),
        };
      });
    }

    // Return summary
    return {
      videoId: data.videoId,
      platforms: data.platforms,
      results,
      successCount: Object.values(results).filter((r: any) => r.success).length,
      failureCount: Object.values(results).filter((r: any) => !r.success).length,
    };
  }
);

/**
 * Retry failed posts (cron job)
 */
export const retryFailedPostsFunction = inngest.createFunction(
  {
    id: "retry-failed-posts",
    name: "Retry Failed Social Posts",
  },
  { cron: "0 */2 * * *" }, // Every 2 hours
  async ({ step }) => {
    // Get failed posts from last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const failedPosts = await step.run("get-failed-posts", async () => {
      return await db.socialPost.findMany({
        where: {
          status: "failed",
          createdAt: {
            gte: oneDayAgo,
          },
        },
        include: {
          account: true,
        },
        take: 20, // Limit to 20 retries per run
      });
    });

    if (failedPosts.length === 0) {
      return { retried: 0 };
    }

    // Group by video and retry
    const videoIds = [...new Set(failedPosts.map((p) => p.videoId))];

    for (const videoId of videoIds) {
      const video = await db.video.findUnique({ where: { id: videoId } });

      if (!video || video.status !== "completed") {
        continue;
      }

      const platforms = failedPosts
        .filter((p) => p.videoId === videoId)
        .map((p) => p.platform as any);

      // Trigger posting again
      await inngest.send({
        name: "video/ready",
        data: {
          videoId: video.id,
          tenantId: video.tenantId,
          conceptId: video.conceptId,
          category: video.category,
          platforms,
          caption: "Retry post", // Would need to fetch original caption
          hashtags: [],
        },
      });
    }

    return {
      retried: videoIds.length,
    };
  }
);
