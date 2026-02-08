/**
 * YouTube Data API v3 Integration
 *
 * OAuth 2.0 + Service Account for YouTube Shorts upload
 * Rate limit: 10,000 quota units/day (6 uploads/day per project)
 *
 * Documentation: https://developers.google.com/youtube/v3/docs
 *
 * NOTE: Run `npm install googleapis` to install required dependency
 */

import { google, youtube_v3 } from "googleapis";
import type { SocialAccount } from "@prisma/client";
import { db } from "@/lib/db";
import fetch from "node-fetch";

// YouTube API Configuration
const YOUTUBE_SCOPES = [
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/youtube",
];

interface YouTubePostRequest {
  videoUrl: string;
  title: string;
  description: string;
  hashtags?: string[];
  categoryId?: string; // 22 = People & Blogs, 24 = Entertainment
  privacyStatus?: "public" | "private" | "unlisted";
  madeForKids?: boolean;
}

interface YouTubePostResult {
  success: boolean;
  videoId?: string;
  videoUrl?: string;
  error?: string;
}

export class YouTubeClient {
  private oauth2Client: any;
  private youtube: youtube_v3.Youtube;

  constructor() {
    const clientId = process.env.YOUTUBE_CLIENT_ID;
    const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
    const redirectUri = process.env.YOUTUBE_REDIRECT_URI || "http://localhost:3000/api/social/callback/youtube";

    if (!clientId || !clientSecret) {
      console.warn("YouTube credentials not configured");
    }

    this.oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );

    this.youtube = google.youtube({
      version: "v3",
      auth: this.oauth2Client,
    });
  }

  /**
   * Generate OAuth URL for user authorization
   */
  getAuthUrl(state: string): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: YOUTUBE_SCOPES,
      state,
      prompt: "consent", // Force consent to get refresh token
    });
  }

  /**
   * Exchange authorization code for tokens
   */
  async getAccessToken(code: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }> {
    const { tokens } = await this.oauth2Client.getToken(code);

    if (!tokens.access_token) {
      throw new Error("No access token returned from YouTube OAuth");
    }

    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || "",
      expiresIn: tokens.expiry_date ? Math.floor((tokens.expiry_date - Date.now()) / 1000) : 3600,
    };
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(refreshToken: string): Promise<{
    accessToken: string;
    expiresIn: number;
  }> {
    this.oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });

    const { credentials } = await this.oauth2Client.refreshAccessToken();

    return {
      accessToken: credentials.access_token || "",
      expiresIn: credentials.expiry_date ? Math.floor((credentials.expiry_date - Date.now()) / 1000) : 3600,
    };
  }

  /**
   * Get channel info
   */
  async getChannelInfo(accessToken: string): Promise<{
    channelId: string;
    channelTitle: string;
    customUrl?: string;
    thumbnailUrl?: string;
  }> {
    this.oauth2Client.setCredentials({
      access_token: accessToken,
    });

    const response = await this.youtube.channels.list({
      part: ["snippet"],
      mine: true,
    });

    const channel = response.data.items?.[0];

    if (!channel) {
      throw new Error("No YouTube channel found for this account");
    }

    return {
      channelId: channel.id || "",
      channelTitle: channel.snippet?.title || "",
      customUrl: channel.snippet?.customUrl,
      thumbnailUrl: channel.snippet?.thumbnails?.default?.url,
    };
  }

  /**
   * Upload video to YouTube
   */
  async uploadVideo(
    account: SocialAccount,
    request: YouTubePostRequest
  ): Promise<YouTubePostResult> {
    try {
      this.oauth2Client.setCredentials({
        access_token: account.accessToken,
        refresh_token: account.refreshToken,
      });

      // Download video from URL
      const videoResponse = await fetch(request.videoUrl);
      if (!videoResponse.ok) {
        throw new Error(`Failed to download video: ${videoResponse.statusText}`);
      }

      const videoBuffer = await videoResponse.buffer();

      // Prepare description with hashtags
      let description = request.description;
      if (request.hashtags && request.hashtags.length > 0) {
        description += "\n\n" + request.hashtags.join(" ");
      }

      // Add #Shorts tag for YouTube Shorts
      if (!description.includes("#Shorts")) {
        description += " #Shorts";
      }

      // Upload video
      const response = await this.youtube.videos.insert({
        part: ["snippet", "status"],
        requestBody: {
          snippet: {
            title: request.title.substring(0, 100), // Max 100 chars
            description: description.substring(0, 5000), // Max 5000 chars
            categoryId: request.categoryId || "24", // Entertainment
            tags: request.hashtags,
          },
          status: {
            privacyStatus: request.privacyStatus || "public",
            selfDeclaredMadeForKids: request.madeForKids || false,
          },
        },
        media: {
          body: videoBuffer as any,
        },
      });

      const videoId = response.data.id;

      if (!videoId) {
        return {
          success: false,
          error: "No video ID returned from YouTube",
        };
      }

      return {
        success: true,
        videoId,
        videoUrl: `https://www.youtube.com/shorts/${videoId}`,
      };
    } catch (error: any) {
      console.error("YouTube upload error:", error);
      return {
        success: false,
        error: error?.message || "Unknown error",
      };
    }
  }

  /**
   * Get video status
   */
  async getVideoStatus(accessToken: string, videoId: string): Promise<{
    status: string;
    uploadStatus: string;
    privacyStatus: string;
    viewCount?: number;
  }> {
    this.oauth2Client.setCredentials({
      access_token: accessToken,
    });

    const response = await this.youtube.videos.list({
      part: ["status", "statistics"],
      id: [videoId],
    });

    const video = response.data.items?.[0];

    if (!video) {
      throw new Error("Video not found");
    }

    return {
      status: video.status?.uploadStatus || "unknown",
      uploadStatus: video.status?.uploadStatus || "unknown",
      privacyStatus: video.status?.privacyStatus || "unknown",
      viewCount: parseInt(video.statistics?.viewCount || "0"),
    };
  }

  /**
   * Get quota usage
   * YouTube quota is per Google Cloud project, not per account
   * Each upload costs ~1600 quota units (10,000 daily = ~6 uploads)
   */
  async getQuotaUsage(account: SocialAccount): Promise<{
    used: number;
    limit: number;
    resetsAt: Date;
  }> {
    // We track this locally since YouTube doesn't provide quota API
    const now = new Date();
    const lastReset = new Date(account.lastReset);

    // Check if we need to reset (new day, Pacific Time)
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
   * Delete video (for cleanup/testing)
   */
  async deleteVideo(accessToken: string, videoId: string): Promise<void> {
    this.oauth2Client.setCredentials({
      access_token: accessToken,
    });

    await this.youtube.videos.delete({
      id: videoId,
    });
  }
}

// Export singleton instance
export const youtubeClient = new YouTubeClient();
