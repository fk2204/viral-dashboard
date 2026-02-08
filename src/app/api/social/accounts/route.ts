/**
 * Social Accounts API
 *
 * GET - List connected social accounts
 * DELETE - Disconnect account
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { accountPool } from "@/lib/social/account-pool";
import { tiktokClient } from "@/lib/social/tiktok";
import { youtubeClient } from "@/lib/social/youtube";
import { instagramClient } from "@/lib/social/instagram";

/**
 * GET /api/social/accounts
 * List all connected social accounts with usage stats
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser();

    const accounts = await db.socialAccount.findMany({
      where: {
        tenantId: user.tenantId,
      },
      orderBy: [{ platform: "asc" }, { createdAt: "desc" }],
    });

    // Get quota usage for each account
    const accountsWithQuota = await Promise.all(
      accounts.map(async (account) => {
        let quotaInfo;

        switch (account.platform) {
          case "tiktok":
            quotaInfo = await tiktokClient.getQuotaUsage(account);
            break;
          case "youtube":
            quotaInfo = await youtubeClient.getQuotaUsage(account);
            break;
          case "instagram":
            quotaInfo = await instagramClient.getQuotaUsage(account);
            break;
          default:
            quotaInfo = {
              used: account.usedToday,
              limit: account.dailyLimit,
              resetsAt: new Date(account.lastReset.getTime() + 24 * 60 * 60 * 1000),
            };
        }

        // Get post count
        const postCount = await db.socialPost.count({
          where: {
            accountId: account.id,
            status: "posted",
          },
        });

        return {
          id: account.id,
          platform: account.platform,
          username: account.username,
          niche: account.niche,
          isActive: account.isActive,
          dailyLimit: account.dailyLimit,
          usedToday: quotaInfo.used,
          availableQuota: quotaInfo.limit - quotaInfo.used,
          quotaResetsAt: quotaInfo.resetsAt.toISOString(),
          postCount,
          connectedAt: account.createdAt.toISOString(),
          expiresAt: account.expiresAt?.toISOString(),
        };
      })
    );

    // Group by platform
    const groupedAccounts = {
      tiktok: accountsWithQuota.filter((a) => a.platform === "tiktok"),
      youtube: accountsWithQuota.filter((a) => a.platform === "youtube"),
      instagram: accountsWithQuota.filter((a) => a.platform === "instagram"),
    };

    // Get totals per platform
    const totals = {
      tiktok: await accountPool.getTotalAvailableQuota("tiktok", user.tenantId),
      youtube: await accountPool.getTotalAvailableQuota("youtube", user.tenantId),
      instagram: await accountPool.getTotalAvailableQuota("instagram", user.tenantId),
    };

    return NextResponse.json({
      accounts: groupedAccounts,
      totals,
    });
  } catch (error) {
    console.error("Get social accounts error:", error);
    return NextResponse.json(
      { error: "Failed to fetch social accounts" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/social/accounts?id=xxx
 * Disconnect a social account
 */
export async function DELETE(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    const searchParams = req.nextUrl.searchParams;
    const accountId = searchParams.get("id");

    if (!accountId) {
      return NextResponse.json(
        { error: "Missing account ID" },
        { status: 400 }
      );
    }

    // Verify account belongs to user's tenant
    const account = await db.socialAccount.findUnique({
      where: { id: accountId },
    });

    if (!account || account.tenantId !== user.tenantId) {
      return NextResponse.json(
        { error: "Account not found" },
        { status: 404 }
      );
    }

    // Mark account as inactive (don't delete for audit trail)
    await db.socialAccount.update({
      where: { id: accountId },
      data: {
        isActive: false,
        metadata: {
          ...((account.metadata as any) || {}),
          disconnectedAt: new Date().toISOString(),
          disconnectedBy: user.userId,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Account disconnected successfully",
    });
  } catch (error) {
    console.error("Delete social account error:", error);
    return NextResponse.json(
      { error: "Failed to disconnect account" },
      { status: 500 }
    );
  }
}
