/**
 * Multi-Account Pool Manager
 *
 * Intelligently selects social media accounts for posting based on:
 * - Available quota (daily limit - used today)
 * - Category/niche match
 * - Account health/status
 * - Load balancing across accounts
 */

import { db } from "@/lib/db";
import type { SocialAccount } from "@prisma/client";

export interface AccountSelectionCriteria {
  platform: "tiktok" | "youtube" | "instagram";
  tenantId: string;
  category?: string; // Prefer accounts specialized in this category
  minimumQuota?: number; // Minimum available posts required
}

export interface AccountWithQuota extends SocialAccount {
  availableQuota: number;
}

export class AccountPool {
  /**
   * Select best account for posting
   */
  async selectAccount(
    criteria: AccountSelectionCriteria
  ): Promise<AccountWithQuota | null> {
    // Get all active accounts for this platform
    const accounts = await db.socialAccount.findMany({
      where: {
        tenantId: criteria.tenantId,
        platform: criteria.platform,
        isActive: true,
      },
    });

    if (accounts.length === 0) {
      return null;
    }

    // Calculate available quota and reset if needed
    const accountsWithQuota: AccountWithQuota[] = await Promise.all(
      accounts.map(async (account) => {
        const availableQuota = await this.getAvailableQuota(account);
        return { ...account, availableQuota };
      })
    );

    // Filter accounts with available quota
    let eligible = accountsWithQuota.filter(
      (account) =>
        account.availableQuota > 0 &&
        (criteria.minimumQuota ? account.availableQuota >= criteria.minimumQuota : true)
    );

    if (eligible.length === 0) {
      return null;
    }

    // Score accounts based on multiple factors
    const scored = eligible.map((account) => ({
      account,
      score: this.scoreAccount(account, criteria),
    }));

    // Sort by score (descending) and select best
    scored.sort((a, b) => b.score - a.score);

    return scored[0].account;
  }

  /**
   * Select multiple accounts for batch posting
   */
  async selectMultipleAccounts(
    criteria: AccountSelectionCriteria,
    count: number
  ): Promise<AccountWithQuota[]> {
    const accounts = await db.socialAccount.findMany({
      where: {
        tenantId: criteria.tenantId,
        platform: criteria.platform,
        isActive: true,
      },
    });

    if (accounts.length === 0) {
      return [];
    }

    // Get accounts with available quota
    const accountsWithQuota: AccountWithQuota[] = await Promise.all(
      accounts.map(async (account) => {
        const availableQuota = await this.getAvailableQuota(account);
        return { ...account, availableQuota };
      })
    );

    // Filter and score
    let eligible = accountsWithQuota.filter((account) => account.availableQuota > 0);

    const scored = eligible.map((account) => ({
      account,
      score: this.scoreAccount(account, criteria),
    }));

    // Sort by score and return top N
    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, count).map((s) => s.account);
  }

  /**
   * Get available quota for an account
   */
  private async getAvailableQuota(account: SocialAccount): Promise<number> {
    const now = new Date();
    const lastReset = new Date(account.lastReset);

    // Check if we need to reset daily quota
    if (this.shouldResetQuota(now, lastReset)) {
      await db.socialAccount.update({
        where: { id: account.id },
        data: {
          usedToday: 0,
          lastReset: now,
        },
      });

      return account.dailyLimit;
    }

    return Math.max(0, account.dailyLimit - account.usedToday);
  }

  /**
   * Check if quota should be reset (new day)
   */
  private shouldResetQuota(now: Date, lastReset: Date): boolean {
    // Reset at midnight UTC
    const nowDay = now.getUTCDate();
    const lastResetDay = lastReset.getUTCDate();

    return nowDay !== lastResetDay;
  }

  /**
   * Score account based on multiple factors
   */
  private scoreAccount(
    account: AccountWithQuota,
    criteria: AccountSelectionCriteria
  ): number {
    let score = 0;

    // Factor 1: Available quota (40% weight)
    const quotaRatio = account.availableQuota / account.dailyLimit;
    score += quotaRatio * 40;

    // Factor 2: Category match (30% weight)
    if (criteria.category && account.niche) {
      if (account.niche === criteria.category) {
        score += 30; // Perfect match
      } else if (this.isSimilarCategory(account.niche, criteria.category)) {
        score += 15; // Similar category
      }
    } else {
      score += 15; // No preference, give neutral score
    }

    // Factor 3: Account age/stability (20% weight)
    const accountAge = Date.now() - account.createdAt.getTime();
    const daysOld = accountAge / (1000 * 60 * 60 * 24);
    const stabilityScore = Math.min(daysOld / 30, 1) * 20; // Max 20 points at 30+ days
    score += stabilityScore;

    // Factor 4: Load balancing (10% weight)
    // Prefer accounts with less usage today
    const usageRatio = account.usedToday / account.dailyLimit;
    score += (1 - usageRatio) * 10;

    return score;
  }

  /**
   * Check if categories are similar
   */
  private isSimilarCategory(niche: string, category: string): boolean {
    const similarityMap: Record<string, string[]> = {
      finance: ["tech", "news"],
      tech: ["finance", "gaming"],
      gaming: ["tech", "entertainment"],
      fitness: ["wellness", "lifestyle"],
      luxury: ["lifestyle", "fashion"],
      music: ["entertainment", "dance"],
      emotional: ["storytelling", "inspiration"],
      news: ["finance", "politics"],
    };

    return similarityMap[niche]?.includes(category) || false;
  }

  /**
   * Get total available quota across all accounts
   */
  async getTotalAvailableQuota(
    platform: string,
    tenantId: string
  ): Promise<{
    totalAccounts: number;
    activeAccounts: number;
    totalQuota: number;
    availableQuota: number;
    usedQuota: number;
  }> {
    const accounts = await db.socialAccount.findMany({
      where: {
        tenantId,
        platform,
      },
    });

    const activeAccounts = accounts.filter((a) => a.isActive);

    let totalQuota = 0;
    let availableQuota = 0;
    let usedQuota = 0;

    for (const account of activeAccounts) {
      const available = await this.getAvailableQuota(account);
      totalQuota += account.dailyLimit;
      availableQuota += available;
      usedQuota += account.usedToday;
    }

    return {
      totalAccounts: accounts.length,
      activeAccounts: activeAccounts.length,
      totalQuota,
      availableQuota,
      usedQuota,
    };
  }

  /**
   * Reserve quota for posting (optimistic locking)
   */
  async reserveQuota(accountId: string): Promise<boolean> {
    try {
      const account = await db.socialAccount.findUnique({
        where: { id: accountId },
      });

      if (!account) {
        return false;
      }

      const available = await this.getAvailableQuota(account);

      if (available <= 0) {
        return false;
      }

      // Increment usage atomically
      await db.socialAccount.update({
        where: { id: accountId },
        data: {
          usedToday: {
            increment: 1,
          },
        },
      });

      return true;
    } catch (error) {
      console.error("Failed to reserve quota:", error);
      return false;
    }
  }

  /**
   * Release quota (if posting fails)
   */
  async releaseQuota(accountId: string): Promise<void> {
    await db.socialAccount.update({
      where: { id: accountId },
      data: {
        usedToday: {
          decrement: 1,
        },
      },
    });
  }

  /**
   * Disable account (if errors persist)
   */
  async disableAccount(accountId: string, reason: string): Promise<void> {
    await db.socialAccount.update({
      where: { id: accountId },
      data: {
        isActive: false,
        metadata: {
          disabledReason: reason,
          disabledAt: new Date().toISOString(),
        },
      },
    });
  }

  /**
   * Enable account
   */
  async enableAccount(accountId: string): Promise<void> {
    await db.socialAccount.update({
      where: { id: accountId },
      data: {
        isActive: true,
      },
    });
  }

  /**
   * Reset all daily quotas (cron job)
   */
  async resetAllQuotas(): Promise<number> {
    const result = await db.socialAccount.updateMany({
      where: {
        isActive: true,
      },
      data: {
        usedToday: 0,
        lastReset: new Date(),
      },
    });

    return result.count;
  }
}

// Export singleton instance
export const accountPool = new AccountPool();
