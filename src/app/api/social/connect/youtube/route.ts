/**
 * YouTube OAuth Callback Handler
 */

import { NextRequest, NextResponse } from "next/server";
import { youtubeClient } from "@/lib/social/youtube";
import { oauthManager } from "@/lib/social/oauth-manager";
import { getAuthenticatedUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    // Get authenticated user
    const user = await getAuthenticatedUser();

    // Get OAuth parameters
    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    if (error) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/social-accounts?error=${error}`
      );
    }

    if (!code || !state) {
      return NextResponse.json(
        { error: "Missing code or state parameter" },
        { status: 400 }
      );
    }

    // Exchange code for tokens
    const tokenResult = await youtubeClient.getAccessToken(code);

    // Get channel info
    const channelInfo = await youtubeClient.getChannelInfo(tokenResult.accessToken);

    // Encrypt tokens
    const encryptedAccessToken = oauthManager.encryptToken(tokenResult.accessToken);
    const encryptedRefreshToken = oauthManager.encryptToken(tokenResult.refreshToken);

    // Calculate expiry
    const expiresAt = new Date(Date.now() + tokenResult.expiresIn * 1000);

    // Save account to database
    const account = await db.socialAccount.upsert({
      where: {
        tenantId_platform_username: {
          tenantId: user.tenantId,
          platform: "youtube",
          username: channelInfo.channelTitle,
        },
      },
      create: {
        tenantId: user.tenantId,
        platform: "youtube",
        username: channelInfo.channelTitle,
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        expiresAt,
        dailyLimit: 6, // YouTube's effective rate limit (10k quota = ~6 uploads)
        usedToday: 0,
        lastReset: new Date(),
        isActive: true,
        metadata: {
          channelId: channelInfo.channelId,
          customUrl: channelInfo.customUrl,
          thumbnailUrl: channelInfo.thumbnailUrl,
          connectedAt: new Date().toISOString(),
        },
      },
      update: {
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        expiresAt,
        isActive: true,
        metadata: {
          channelId: channelInfo.channelId,
          customUrl: channelInfo.customUrl,
          thumbnailUrl: channelInfo.thumbnailUrl,
          reconnectedAt: new Date().toISOString(),
        },
      },
    });

    // Redirect to success page
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/social-accounts?success=youtube`
    );
  } catch (error) {
    console.error("YouTube OAuth error:", error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/social-accounts?error=youtube_auth_failed`
    );
  }
}
