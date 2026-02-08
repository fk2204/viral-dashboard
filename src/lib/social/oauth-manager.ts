/**
 * OAuth Token Manager
 *
 * Handles automated token refresh, encryption, and lifecycle management
 * for TikTok, YouTube, and Instagram accounts
 */

import { db } from "@/lib/db";
import type { SocialAccount } from "@prisma/client";
import { tiktokClient } from "./tiktok";
import { youtubeClient } from "./youtube";
import { instagramClient } from "./instagram";
import crypto from "crypto";

// Token encryption configuration
const ENCRYPTION_KEY = process.env.TOKEN_ENCRYPTION_KEY || "default-dev-key-change-in-prod-32b";
const ENCRYPTION_ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

export interface TokenRefreshResult {
  success: boolean;
  newAccessToken?: string;
  newRefreshToken?: string;
  expiresAt?: Date;
  error?: string;
}

export class OAuthManager {
  /**
   * Encrypt token for storage
   */
  encryptToken(token: string): string {
    try {
      const iv = crypto.randomBytes(IV_LENGTH);
      const cipher = crypto.createCipheriv(
        ENCRYPTION_ALGORITHM,
        Buffer.from(ENCRYPTION_KEY),
        iv
      );

      let encrypted = cipher.update(token, "utf8", "hex");
      encrypted += cipher.final("hex");

      const authTag = cipher.getAuthTag();

      // Format: iv:authTag:encryptedData
      return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
    } catch (error) {
      console.error("Token encryption error:", error);
      throw new Error("Failed to encrypt token");
    }
  }

  /**
   * Decrypt token from storage
   */
  decryptToken(encryptedToken: string): string {
    try {
      const parts = encryptedToken.split(":");
      if (parts.length !== 3) {
        throw new Error("Invalid encrypted token format");
      }

      const [ivHex, authTagHex, encryptedData] = parts;

      const iv = Buffer.from(ivHex, "hex");
      const authTag = Buffer.from(authTagHex, "hex");

      const decipher = crypto.createDecipheriv(
        ENCRYPTION_ALGORITHM,
        Buffer.from(ENCRYPTION_KEY),
        iv
      );

      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encryptedData, "hex", "utf8");
      decrypted += decipher.final("utf8");

      return decrypted;
    } catch (error) {
      console.error("Token decryption error:", error);
      throw new Error("Failed to decrypt token");
    }
  }

  /**
   * Check if token needs refresh (5 minutes before expiry)
   */
  needsRefresh(account: SocialAccount): boolean {
    if (!account.expiresAt) {
      return false; // No expiry tracking
    }

    const now = Date.now();
    const expiresAt = new Date(account.expiresAt).getTime();
    const bufferTime = 5 * 60 * 1000; // 5 minutes

    return now >= expiresAt - bufferTime;
  }

  /**
   * Refresh access token for an account
   */
  async refreshToken(account: SocialAccount): Promise<TokenRefreshResult> {
    try {
      // Decrypt refresh token
      const refreshToken = this.decryptToken(account.refreshToken || "");

      if (!refreshToken) {
        return {
          success: false,
          error: "No refresh token available",
        };
      }

      let result: { accessToken: string; expiresIn: number; refreshToken?: string };

      // Call platform-specific refresh
      switch (account.platform) {
        case "tiktok":
          result = await tiktokClient.refreshAccessToken(refreshToken);
          break;

        case "youtube":
          result = await youtubeClient.refreshAccessToken(refreshToken);
          break;

        case "instagram":
          // Instagram uses long-lived tokens (60 days)
          // Refresh by exchanging current token for new long-lived token
          result = await instagramClient.getLongLivedToken(
            this.decryptToken(account.accessToken)
          );
          break;

        default:
          return {
            success: false,
            error: `Unsupported platform: ${account.platform}`,
          };
      }

      // Encrypt new tokens
      const encryptedAccessToken = this.encryptToken(result.accessToken);
      const encryptedRefreshToken = result.refreshToken
        ? this.encryptToken(result.refreshToken)
        : account.refreshToken; // Keep old refresh token if not returned

      const expiresAt = new Date(Date.now() + result.expiresIn * 1000);

      // Update database
      await db.socialAccount.update({
        where: { id: account.id },
        data: {
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          expiresAt,
        },
      });

      return {
        success: true,
        newAccessToken: result.accessToken,
        newRefreshToken: result.refreshToken,
        expiresAt,
      };
    } catch (error) {
      console.error("Token refresh error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get decrypted access token (with auto-refresh if needed)
   */
  async getAccessToken(accountId: string): Promise<string | null> {
    const account = await db.socialAccount.findUnique({
      where: { id: accountId },
    });

    if (!account || !account.isActive) {
      return null;
    }

    // Check if refresh is needed
    if (this.needsRefresh(account)) {
      console.log(`Refreshing token for account ${account.username} (${account.platform})`);
      const refreshResult = await this.refreshToken(account);

      if (!refreshResult.success) {
        console.error(`Token refresh failed: ${refreshResult.error}`);
        // Try to use existing token anyway
        return this.decryptToken(account.accessToken);
      }

      return refreshResult.newAccessToken!;
    }

    // Token is still valid
    return this.decryptToken(account.accessToken);
  }

  /**
   * Validate token by making a test API call
   */
  async validateToken(account: SocialAccount): Promise<boolean> {
    try {
      const accessToken = this.decryptToken(account.accessToken);

      switch (account.platform) {
        case "tiktok":
          await tiktokClient.getUserInfo(accessToken);
          return true;

        case "youtube":
          await youtubeClient.getChannelInfo(accessToken);
          return true;

        case "instagram":
          // Instagram validation via account ID check
          const metadata = account.metadata as any;
          if (!metadata?.instagramAccountId) {
            return false;
          }
          return true;

        default:
          return false;
      }
    } catch (error) {
      console.error("Token validation error:", error);
      return false;
    }
  }

  /**
   * Revoke token (disconnect account)
   */
  async revokeToken(accountId: string): Promise<void> {
    // Note: Most platforms don't provide a revoke API
    // We just mark the account as inactive
    await db.socialAccount.update({
      where: { id: accountId },
      data: {
        isActive: false,
        metadata: {
          revokedAt: new Date().toISOString(),
        },
      },
    });
  }

  /**
   * Refresh all tokens that expire soon (cron job)
   */
  async refreshExpiringTokens(): Promise<{
    total: number;
    refreshed: number;
    failed: number;
  }> {
    // Get accounts expiring in the next 1 hour
    const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000);

    const accounts = await db.socialAccount.findMany({
      where: {
        isActive: true,
        expiresAt: {
          lte: oneHourFromNow,
        },
      },
    });

    let refreshed = 0;
    let failed = 0;

    for (const account of accounts) {
      const result = await this.refreshToken(account);
      if (result.success) {
        refreshed++;
      } else {
        failed++;
      }
    }

    return {
      total: accounts.length,
      refreshed,
      failed,
    };
  }

  /**
   * Clean up expired/invalid tokens (cron job)
   */
  async cleanupInvalidTokens(): Promise<number> {
    // Get accounts with expired tokens (>7 days past expiry)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const expiredAccounts = await db.socialAccount.findMany({
      where: {
        expiresAt: {
          lt: sevenDaysAgo,
        },
        isActive: true,
      },
    });

    // Validate each token
    let cleaned = 0;
    for (const account of expiredAccounts) {
      const isValid = await this.validateToken(account);

      if (!isValid) {
        await db.socialAccount.update({
          where: { id: account.id },
          data: {
            isActive: false,
            metadata: {
              autoDisabledReason: "Token expired and refresh failed",
              autoDisabledAt: new Date().toISOString(),
            },
          },
        });
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * Get account with decrypted tokens
   */
  async getDecryptedAccount(accountId: string): Promise<
    | (SocialAccount & {
        decryptedAccessToken: string;
        decryptedRefreshToken?: string;
      })
    | null
  > {
    const account = await db.socialAccount.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      return null;
    }

    // Auto-refresh if needed
    if (this.needsRefresh(account)) {
      await this.refreshToken(account);

      // Fetch updated account
      const updated = await db.socialAccount.findUnique({
        where: { id: accountId },
      });

      if (!updated) {
        return null;
      }

      return {
        ...updated,
        decryptedAccessToken: this.decryptToken(updated.accessToken),
        decryptedRefreshToken: updated.refreshToken
          ? this.decryptToken(updated.refreshToken)
          : undefined,
      };
    }

    return {
      ...account,
      decryptedAccessToken: this.decryptToken(account.accessToken),
      decryptedRefreshToken: account.refreshToken
        ? this.decryptToken(account.refreshToken)
        : undefined,
    };
  }
}

// Export singleton instance
export const oauthManager = new OAuthManager();
