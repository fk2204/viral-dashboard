/**
 * TikTok OAuth Callback Handler
 */

import { NextRequest, NextResponse } from "next/server";
import { tiktokClient } from "@/lib/social/tiktok";
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
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/social/connect/tiktok`;
    const tokenResult = await tiktokClient.getAccessToken(code, redirectUri);

    // Get user info
    const userInfo = await tiktokClient.getUserInfo(tokenResult.accessToken);

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
          platform: "tiktok",
          username: userInfo.username,
        },
      },
      create: {
        tenantId: user.tenantId,
        platform: "tiktok",
        username: userInfo.username,
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        expiresAt,
        dailyLimit: 10, // TikTok's rate limit
        usedToday: 0,
        lastReset: new Date(),
        isActive: true,
        metadata: {
          openId: userInfo.openId,
          displayName: userInfo.displayName,
          avatarUrl: userInfo.avatarUrl,
          connectedAt: new Date().toISOString(),
        },
      },
      update: {
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        expiresAt,
        isActive: true,
        metadata: {
          openId: userInfo.openId,
          displayName: userInfo.displayName,
          avatarUrl: userInfo.avatarUrl,
          reconnectedAt: new Date().toISOString(),
        },
      },
    });

    // Redirect to success page
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/social-accounts?success=tiktok`
    );
  } catch (error) {
    console.error("TikTok OAuth error:", error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/social-accounts?error=tiktok_auth_failed`
    );
  }
}
