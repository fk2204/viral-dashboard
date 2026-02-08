/**
 * Authentication Utilities - Clerk Integration
 *
 * Provides helpers for user authentication and tenant context
 */

import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { setTenantContext } from "@/lib/storage-prisma";

export interface AuthenticatedUser {
  userId: string;
  clerkId: string;
  email: string;
  tenantId: string;
  role: "ADMIN" | "MEMBER";
  subscriptionTier: "FREE" | "STARTER" | "PRO" | "AGENCY";
  monthlyQuota: number;
  usedQuota: number;
}

/**
 * Get authenticated user with tenant context
 *
 * This is the primary authentication helper for API routes.
 * It validates the user, loads their tenant info, and sets tenant context.
 *
 * @throws {Error} If user is not authenticated
 */
export async function getAuthenticatedUser(): Promise<AuthenticatedUser> {
  const { userId: clerkId } = await auth();

  if (!clerkId) {
    throw new Error("Unauthorized: No user session");
  }

  // Find or create user in database
  let user = await db.user.findUnique({
    where: { clerkId },
    include: { tenant: true },
  });

  // First-time user: Create user and tenant
  if (!user) {
    const clerkUser = await currentUser();
    if (!clerkUser) {
      throw new Error("Unauthorized: Could not load user");
    }

    // Create tenant first
    const tenant = await db.tenant.create({
      data: {
        name: clerkUser.emailAddresses[0]?.emailAddress || "My Organization",
        subscriptionTier: "FREE",
        subscriptionStatus: "active",
        monthlyQuota: 10,
        usedQuota: 0,
        quotaResetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
    });

    // Create user
    user = await db.user.create({
      data: {
        clerkId,
        email: clerkUser.emailAddresses[0]?.emailAddress || "",
        name: clerkUser.firstName && clerkUser.lastName
          ? `${clerkUser.firstName} ${clerkUser.lastName}`
          : clerkUser.username || "User",
        imageUrl: clerkUser.imageUrl,
        tenantId: tenant.id,
        role: "ADMIN", // First user is admin
      },
      include: { tenant: true },
    });
  }

  // Set tenant context for storage queries
  setTenantContext(user.tenantId);

  return {
    userId: user.id,
    clerkId: user.clerkId,
    email: user.email,
    tenantId: user.tenantId,
    role: user.role,
    subscriptionTier: user.tenant.subscriptionTier,
    monthlyQuota: user.tenant.monthlyQuota,
    usedQuota: user.tenant.usedQuota,
  };
}

/**
 * Check if user has quota remaining
 */
export async function checkQuota(): Promise<{ allowed: boolean; remaining: number }> {
  const user = await getAuthenticatedUser();

  const remaining = user.monthlyQuota - user.usedQuota;
  const allowed = remaining > 0;

  return { allowed, remaining };
}

/**
 * Decrement user's quota (after successful generation)
 */
export async function decrementQuota(count: number = 1): Promise<void> {
  const user = await getAuthenticatedUser();

  await db.tenant.update({
    where: { id: user.tenantId },
    data: {
      usedQuota: {
        increment: count,
      },
    },
  });
}

/**
 * Reset quota (called by cron job monthly)
 */
export async function resetQuota(tenantId: string): Promise<void> {
  await db.tenant.update({
    where: { id: tenantId },
    data: {
      usedQuota: 0,
      quotaResetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });
}

/**
 * Generate API key for programmatic access
 */
export async function generateApiKey(): Promise<string> {
  const user = await getAuthenticatedUser();

  // Generate random API key
  const apiKey = `vd_${Array.from({ length: 32 }, () =>
    Math.random().toString(36).charAt(2)
  ).join("")}`;

  // Hash for storage (in production, use bcrypt or similar)
  const apiKeyHash = Buffer.from(apiKey).toString("base64");

  await db.user.update({
    where: { id: user.userId },
    data: {
      apiKey,
      apiKeyHash,
    },
  });

  return apiKey;
}

/**
 * Validate API key (for API route authentication)
 */
export async function validateApiKey(apiKey: string): Promise<AuthenticatedUser | null> {
  const user = await db.user.findUnique({
    where: { apiKey },
    include: { tenant: true },
  });

  if (!user) {
    return null;
  }

  // Set tenant context
  setTenantContext(user.tenantId);

  return {
    userId: user.id,
    clerkId: user.clerkId,
    email: user.email,
    tenantId: user.tenantId,
    role: user.role,
    subscriptionTier: user.tenant.subscriptionTier,
    monthlyQuota: user.tenant.monthlyQuota,
    usedQuota: user.tenant.usedQuota,
  };
}

/**
 * Revoke API key
 */
export async function revokeApiKey(): Promise<void> {
  const user = await getAuthenticatedUser();

  await db.user.update({
    where: { id: user.userId },
    data: {
      apiKey: null,
      apiKeyHash: null,
    },
  });
}
