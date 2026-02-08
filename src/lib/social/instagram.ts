/**
 * Instagram Graph API Integration
 *
 * Facebook Business Account + OAuth 2.0 for Instagram Reels posting
 * Rate limit: 25 Reels/day per account
 *
 * Documentation: https://developers.facebook.com/docs/instagram-api/guides/content-publishing
 */

import type { SocialAccount } from "@prisma/client";
import { db } from "@/lib/db";

// Instagram/Facebook API Configuration
const FACEBOOK_GRAPH_API = "https://graph.facebook.com/v18.0";
const INSTAGRAM_SCOPES = [
  "instagram_basic",
  "instagram_content_publish",
  "pages_show_list",
  "pages_read_engagement",
];

interface InstagramPostRequest {
  videoUrl: string;
  caption: string;
  hashtags?: string[];
  shareToFeed?: boolean;
  thumbOffset?: number; // Thumbnail time offset in milliseconds
}

interface InstagramPostResult {
  success: boolean;
  mediaId?: string;
  postUrl?: string;
  error?: string;
}

interface InstagramMediaStatus {
  status: string; // IN_PROGRESS, READY, ERROR
  statusCode?: string;
  error?: string;
}

export class InstagramClient {
  private appId: string;
  private appSecret: string;

  constructor() {
    this.appId = process.env.FACEBOOK_APP_ID || "";
    this.appSecret = process.env.FACEBOOK_APP_SECRET || "";

    if (!this.appId || !this.appSecret) {
      console.warn("Instagram/Facebook credentials not configured");
    }
  }

  /**
   * Generate OAuth URL for user authorization
   */
  getAuthUrl(redirectUri: string, state: string): string {
    const params = new URLSearchParams({
      client_id: this.appId,
      redirect_uri: redirectUri,
      scope: INSTAGRAM_SCOPES.join(","),
      state,
      response_type: "code",
    });

    return `https://www.facebook.com/v18.0/dialog/oauth?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async getAccessToken(code: string, redirectUri: string): Promise<{
    accessToken: string;
    expiresIn: number;
  }> {
    const params = new URLSearchParams({
      client_id: this.appId,
      client_secret: this.appSecret,
      code,
      redirect_uri: redirectUri,
    });

    const response = await fetch(
      `${FACEBOOK_GRAPH_API}/oauth/access_token?${params.toString()}`
    );

    const data = await response.json();

    if (!response.ok || data.error) {
      throw new Error(`Instagram OAuth error: ${data.error?.message || "Unknown error"}`);
    }

    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in || 5183944, // ~60 days
    };
  }

  /**
   * Exchange short-lived token for long-lived token (60 days)
   */
  async getLongLivedToken(shortLivedToken: string): Promise<{
    accessToken: string;
    expiresIn: number;
  }> {
    const params = new URLSearchParams({
      grant_type: "fb_exchange_token",
      client_id: this.appId,
      client_secret: this.appSecret,
      fb_exchange_token: shortLivedToken,
    });

    const response = await fetch(
      `${FACEBOOK_GRAPH_API}/oauth/access_token?${params.toString()}`
    );

    const data = await response.json();

    if (!response.ok || data.error) {
      throw new Error(`Token exchange error: ${data.error?.message || "Unknown error"}`);
    }

    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in,
    };
  }

  /**
   * Get user's Instagram Business Account ID
   */
  async getInstagramAccountId(accessToken: string): Promise<{
    instagramAccountId: string;
    username: string;
  }> {
    // First, get Facebook Pages
    const pagesResponse = await fetch(
      `${FACEBOOK_GRAPH_API}/me/accounts?access_token=${accessToken}`
    );

    const pagesData = await pagesResponse.json();

    if (!pagesResponse.ok || pagesData.error) {
      throw new Error(`Failed to get pages: ${pagesData.error?.message || "Unknown error"}`);
    }

    const page = pagesData.data?.[0];

    if (!page) {
      throw new Error("No Facebook Page found. You need a Facebook Page connected to your Instagram Business Account.");
    }

    // Get Instagram Business Account connected to the Page
    const igResponse = await fetch(
      `${FACEBOOK_GRAPH_API}/${page.id}?fields=instagram_business_account&access_token=${accessToken}`
    );

    const igData = await igResponse.json();

    if (!igResponse.ok || igData.error) {
      throw new Error(`Failed to get Instagram account: ${igData.error?.message || "Unknown error"}`);
    }

    const instagramAccountId = igData.instagram_business_account?.id;

    if (!instagramAccountId) {
      throw new Error("No Instagram Business Account found. Please connect your Instagram account to your Facebook Page.");
    }

    // Get username
    const usernameResponse = await fetch(
      `${FACEBOOK_GRAPH_API}/${instagramAccountId}?fields=username&access_token=${accessToken}`
    );

    const usernameData = await usernameResponse.json();

    return {
      instagramAccountId,
      username: usernameData.username || "unknown",
    };
  }

  /**
   * Post Reel to Instagram
   * Two-step process: 1) Create media container, 2) Publish container
   */
  async uploadVideo(
    account: SocialAccount,
    request: InstagramPostRequest
  ): Promise<InstagramPostResult> {
    try {
      const metadata = account.metadata as any;
      const instagramAccountId = metadata?.instagramAccountId;

      if (!instagramAccountId) {
        return {
          success: false,
          error: "Instagram Account ID not found in account metadata",
        };
      }

      // Prepare caption with hashtags
      let caption = request.caption;
      if (request.hashtags && request.hashtags.length > 0) {
        caption += "\n\n" + request.hashtags.join(" ");
      }

      // Step 1: Create media container
      const containerParams = new URLSearchParams({
        video_url: request.videoUrl,
        caption: caption.substring(0, 2200), // Max 2200 chars
        media_type: "REELS",
        share_to_feed: String(request.shareToFeed ?? true),
        access_token: account.accessToken,
      });

      if (request.thumbOffset !== undefined) {
        containerParams.set("thumb_offset", String(request.thumbOffset));
      }

      const containerResponse = await fetch(
        `${FACEBOOK_GRAPH_API}/${instagramAccountId}/media?${containerParams.toString()}`,
        { method: "POST" }
      );

      const containerData = await containerResponse.json();

      if (!containerResponse.ok || containerData.error) {
        return {
          success: false,
          error: containerData.error?.message || "Failed to create media container",
        };
      }

      const containerId = containerData.id;

      // Step 2: Wait for media processing
      const status = await this.pollMediaStatus(account.accessToken, containerId);

      if (status.status !== "READY") {
        return {
          success: false,
          error: status.error || `Media status: ${status.status}`,
        };
      }

      // Step 3: Publish media container
      const publishParams = new URLSearchParams({
        creation_id: containerId,
        access_token: account.accessToken,
      });

      const publishResponse = await fetch(
        `${FACEBOOK_GRAPH_API}/${instagramAccountId}/media_publish?${publishParams.toString()}`,
        { method: "POST" }
      );

      const publishData = await publishResponse.json();

      if (!publishResponse.ok || publishData.error) {
        return {
          success: false,
          error: publishData.error?.message || "Failed to publish media",
        };
      }

      const mediaId = publishData.id;

      // Get post permalink
      const permalinkResponse = await fetch(
        `${FACEBOOK_GRAPH_API}/${mediaId}?fields=permalink&access_token=${account.accessToken}`
      );

      const permalinkData = await permalinkResponse.json();

      return {
        success: true,
        mediaId,
        postUrl: permalinkData.permalink,
      };
    } catch (error) {
      console.error("Instagram upload error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Poll media processing status
   */
  private async pollMediaStatus(
    accessToken: string,
    containerId: string,
    maxAttempts: number = 30
  ): Promise<InstagramMediaStatus> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const response = await fetch(
        `${FACEBOOK_GRAPH_API}/${containerId}?fields=status_code&access_token=${accessToken}`
      );

      const data = await response.json();

      if (!response.ok || data.error) {
        return {
          status: "ERROR",
          error: data.error?.message || "Status check failed",
        };
      }

      const statusCode = data.status_code;

      if (statusCode === "FINISHED") {
        return { status: "READY", statusCode };
      }

      if (statusCode === "ERROR") {
        return {
          status: "ERROR",
          statusCode,
          error: "Media processing failed",
        };
      }

      // Still processing (IN_PROGRESS or PUBLISHED)
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2 seconds
    }

    return {
      status: "IN_PROGRESS",
      error: "Processing timeout (video may still complete)",
    };
  }

  /**
   * Get quota usage
   */
  async getQuotaUsage(account: SocialAccount): Promise<{
    used: number;
    limit: number;
    resetsAt: Date;
  }> {
    // Instagram enforces 25 Reels/day per account
    const now = new Date();
    const lastReset = new Date(account.lastReset);

    // Check if we need to reset (new day)
    if (now.getDate() !== lastReset.getDate() || now > lastReset) {
      await db.socialAccount.update({
        where: { id: account.id },
        data: {
          usedToday: 0,
          lastReset: now,
        },
      });

      return {
        used: 0,
        limit: account.dailyLimit,
        resetsAt: new Date(now.setHours(24, 0, 0, 0)),
      };
    }

    return {
      used: account.usedToday,
      limit: account.dailyLimit,
      resetsAt: new Date(lastReset.setHours(24, 0, 0, 0)),
    };
  }

  /**
   * Increment usage count
   */
  async incrementUsage(accountId: string): Promise<void> {
    await db.socialAccount.update({
      where: { id: accountId },
      data: {
        usedToday: {
          increment: 1,
        },
      },
    });
  }

  /**
   * Get media insights (analytics)
   */
  async getMediaInsights(accessToken: string, mediaId: string): Promise<{
    reach: number;
    impressions: number;
    likes: number;
    comments: number;
    shares: number;
    saves: number;
  }> {
    const response = await fetch(
      `${FACEBOOK_GRAPH_API}/${mediaId}/insights?metric=reach,impressions,likes,comments,shares,saved&access_token=${accessToken}`
    );

    const data = await response.json();

    if (!response.ok || data.error) {
      throw new Error(`Failed to get insights: ${data.error?.message || "Unknown error"}`);
    }

    const metrics: Record<string, number> = {};
    data.data?.forEach((item: any) => {
      metrics[item.name] = item.values?.[0]?.value || 0;
    });

    return {
      reach: metrics.reach || 0,
      impressions: metrics.impressions || 0,
      likes: metrics.likes || 0,
      comments: metrics.comments || 0,
      shares: metrics.shares || 0,
      saves: metrics.saved || 0,
    };
  }
}

// Export singleton instance
export const instagramClient = new InstagramClient();
