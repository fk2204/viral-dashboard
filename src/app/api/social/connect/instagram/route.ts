/**
 * Instagram OAuth Callback Handler
 */

import { NextRequest, NextResponse } from "next/server";
import { instagramClient } from "@/lib/social/instagram";
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

    // Exchange code for access token
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/social/connect/instagram`;
    const tokenResult = await instagramClient.getAccessToken(code, redirectUri);

    // Exchange for long-lived token (60 days)
    const longLivedToken = await instagramClient.getLongLivedToken(tokenResult.accessToken);

    // Get Instagram account info
    const accountInfo = await instagramClient.getInstagramAccountId(longLivedToken.accessToken);

    // Encrypt token
    const encryptedAccessToken = oauthManager.encryptToken(longLivedToken.accessToken);

    // Calculate expiry
    const expiresAt = new Date(Date.now() + longLivedToken.expiresIn * 1000);

    // Save account to database
    const account = await db.socialAccount.upsert({
      where: {
        tenantId_platform_username: {
          tenantId: user.tenantId,
          platform: "instagram",
          username: accountInfo.username,
        },
      },
      create: {
        tenantId: user.tenantId,
        platform: "instagram",
        username: accountInfo.username,
        accessToken: encryptedAccessToken,
        refreshToken: null, // Instagram long-lived tokens don't have refresh tokens
        expiresAt,
        dailyLimit: 25, // Instagram's rate limit
        usedToday: 0,
        lastReset: new Date(),
        isActive: true,
        metadata: {
          instagramAccountId: accountInfo.instagramAccountId,
          connectedAt: new Date().toISOString(),
        },
      },
      update: {
        accessToken: encryptedAccessToken,
        expiresAt,
        isActive: true,
        metadata: {
          instagramAccountId: accountInfo.instagramAccountId,
          reconnectedAt: new Date().toISOString(),
        },
      },
    });

    // Redirect to success page
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/social-accounts?success=instagram`
    );
  } catch (error) {
    console.error("Instagram OAuth error:", error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/social-accounts?error=instagram_auth_failed`
    );
  }
}
