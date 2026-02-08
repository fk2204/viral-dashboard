/**
 * Social OAuth URL Generator
 *
 * GET - Generate OAuth authorization URL for connecting accounts
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { tiktokClient } from "@/lib/social/tiktok";
import { youtubeClient } from "@/lib/social/youtube";
import { instagramClient } from "@/lib/social/instagram";
import crypto from "crypto";

/**
 * GET /api/social/auth-url?platform=tiktok
 * Generate OAuth URL for user authorization
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    const searchParams = req.nextUrl.searchParams;
    const platform = searchParams.get("platform");

    if (!platform) {
      return NextResponse.json(
        { error: "Missing platform parameter" },
        { status: 400 }
      );
    }

    // Generate random state for CSRF protection
    // Encode tenant ID in state for verification on callback
    const stateData = {
      tenantId: user.tenantId,
      platform,
      timestamp: Date.now(),
    };
    const state = Buffer.from(JSON.stringify(stateData)).toString("base64url");

    let authUrl: string;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    switch (platform) {
      case "tiktok":
        const tiktokRedirect = `${appUrl}/api/social/connect/tiktok`;
        authUrl = tiktokClient.getAuthUrl(tiktokRedirect, state);
        break;

      case "youtube":
        authUrl = youtubeClient.getAuthUrl(state);
        break;

      case "instagram":
        const instagramRedirect = `${appUrl}/api/social/connect/instagram`;
        authUrl = instagramClient.getAuthUrl(instagramRedirect, state);
        break;

      default:
        return NextResponse.json(
          { error: `Unsupported platform: ${platform}` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      authUrl,
      state,
    });
  } catch (error) {
    console.error("Generate auth URL error:", error);
    return NextResponse.json(
      { error: "Failed to generate authorization URL" },
      { status: 500 }
    );
  }
}
