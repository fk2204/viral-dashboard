/**
 * TikTok Business API Integration
 *
 * OAuth 2.0 flow + video upload for TikTok content posting
 * Rate limit: 10 videos/day per account
 *
 * Documentation: https://developers.tiktok.com/doc/content-posting-api-get-started
 */

import { db } from "@/lib/db";
import type { SocialAccount } from "@prisma/client";

// TikTok API Configuration
const TIKTOK_API_BASE = "https://open.tiktokapis.com";
const TIKTOK_AUTH_BASE = "https://www.tiktok.com/v2/auth";

interface TikTokPostRequest {
  videoUrl: string;
  caption: string;
  hashtags?: string[];
  privacyLevel?: "public" | "friends" | "private";
  allowComments?: boolean;
  allowDuet?: boolean;
  allowStitch?: boolean;
}

interface TikTokPostResult {
  success: boolean;
  postId?: string;
  postUrl?: string;
  error?: string;
}

interface TikTokVideoInfo {
  videoId: string;
  status: string; // processing, published, failed
  shareUrl?: string;
}

export class TikTokClient {
  private clientKey: string;
  private clientSecret: string;

  constructor() {
    this.clientKey = process.env.TIKTOK_CLIENT_KEY || "";
    this.clientSecret = process.env.TIKTOK_CLIENT_SECRET || "";

    if (!this.clientKey || !this.clientSecret) {
      console.warn("TikTok credentials not configured");
    }
  }

  /**
   * Generate OAuth URL for user authorization
   */
  getAuthUrl(redirectUri: string, state: string): string {
    const params = new URLSearchParams({
      client_key: this.clientKey,
      response_type: "code",
      scope: "user.info.basic,video.upload,video.publish",
      redirect_uri: redirectUri,
      state,
    });

    return `${TIKTOK_AUTH_BASE}/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async getAccessToken(code: string, redirectUri: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    openId: string;
  }> {
    const response = await fetch(`${TIKTOK_API_BASE}/v2/oauth/token/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_key: this.clientKey,
        client_secret: this.clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      throw new Error(`TikTok OAuth error: ${data.error?.message || "Unknown error"}`);
    }

    return {
      accessToken: data.data.access_token,
      refreshToken: data.data.refresh_token,
      expiresIn: data.data.expires_in,
      openId: data.data.open_id,
    };
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(refreshToken: string): Promise<{
    accessToken: string;
    expiresIn: number;
  }> {
    const response = await fetch(`${TIKTOK_API_BASE}/v2/oauth/token/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_key: this.clientKey,
        client_secret: this.clientSecret,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      throw new Error(`TikTok token refresh error: ${data.error?.message || "Unknown error"}`);
    }

    return {
      accessToken: data.data.access_token,
      expiresIn: data.data.expires_in,
    };
  }

  /**
   * Get user info
   */
  async getUserInfo(accessToken: string): Promise<{
    openId: string;
    username: string;
    displayName: string;
    avatarUrl: string;
  }> {
    const response = await fetch(`${TIKTOK_API_BASE}/v2/user/info/`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
      },
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      throw new Error(`TikTok user info error: ${data.error?.message || "Unknown error"}`);
    }

    return {
      openId: data.data.user.open_id,
      username: data.data.user.union_id,
      displayName: data.data.user.display_name,
      avatarUrl: data.data.user.avatar_url,
    };
  }

  /**
   * Upload video to TikTok
   * Two-step process: 1) Initialize upload, 2) Upload video bytes
   */
  async uploadVideo(
    account: SocialAccount,
    request: TikTokPostRequest
  ): Promise<TikTokPostResult> {
    try {
      // Step 1: Initialize video upload
      const initResponse = await fetch(`${TIKTOK_API_BASE}/v2/post/publish/video/init/`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${account.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          post_info: {
            title: request.caption,
            privacy_level: request.privacyLevel || "public",
            disable_comment: !(request.allowComments ?? true),
            disable_duet: !(request.allowDuet ?? true),
            disable_stitch: !(request.allowStitch ?? true),
          },
          source_info: {
            source: "PULL_FROM_URL",
            video_url: request.videoUrl,
          },
        }),
      });

      const initData = await initResponse.json();

      if (!initResponse.ok || initData.error) {
        return {
          success: false,
          error: initData.error?.message || "Failed to initialize upload",
        };
      }

      const publishId = initData.data.publish_id;

      // Step 2: Poll for completion (TikTok processes async)
      const videoInfo = await this.pollVideoStatus(account.accessToken, publishId);

      if (videoInfo.status === "published") {
        return {
          success: true,
          postId: videoInfo.videoId,
          postUrl: videoInfo.shareUrl,
        };
      }

      return {
        success: false,
        error: `Video processing status: ${videoInfo.status}`,
      };
    } catch (error) {
      console.error("TikTok upload error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Poll video upload status
   */
  private async pollVideoStatus(
    accessToken: string,
    publishId: string,
    maxAttempts: number = 30
  ): Promise<TikTokVideoInfo> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const response = await fetch(
        `${TIKTOK_API_BASE}/v2/post/publish/status/${publishId}/`,
        {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(`Status check failed: ${data.error?.message}`);
      }

      const status = data.data.status;

      if (status === "published") {
        return {
          videoId: data.data.publicize_id,
          status: "published",
          shareUrl: data.data.share_url,
        };
      }

      if (status === "failed") {
        return {
          videoId: publishId,
          status: "failed",
        };
      }

      // Still processing, wait and retry
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2 seconds
    }

    return {
      videoId: publishId,
      status: "processing", // Timeout, but video might still complete
    };
  }

  /**
   * Get account posting quota
   */
  async getQuotaUsage(account: SocialAccount): Promise<{
    used: number;
    limit: number;
    resetsAt: Date;
  }> {
    // TikTok enforces 10 videos/day per account
    // We track this locally in the database
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
}

// Export singleton instance
export const tiktokClient = new TikTokClient();
