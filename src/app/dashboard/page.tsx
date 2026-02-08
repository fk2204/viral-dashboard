/**
 * User Dashboard - Account Overview & Quota Management
 */

import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { CreditCard, Zap, Key, Users } from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  // Get user and tenant data
  const user = await db.user.findUnique({
    where: { clerkId: userId },
    include: { tenant: true },
  });

  if (!user) {
    redirect("/sign-in");
  }

  const clerkUser = await currentUser();
  const tenant = user.tenant;

  // Calculate quota percentage
  const quotaPercentage = (tenant.usedQuota / tenant.monthlyQuota) * 100;
  const quotaRemaining = tenant.monthlyQuota - tenant.usedQuota;

  // Format dates
  const quotaResetDate = new Date(tenant.quotaResetAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const tierInfo = {
    FREE: { name: "Free", color: "bg-gray-500", quota: 10, price: "$0" },
    STARTER: { name: "Starter", color: "bg-blue-500", quota: 10, price: "$49" },
    PRO: { name: "Pro", color: "bg-purple-500", quota: 50, price: "$149" },
    AGENCY: { name: "Agency", color: "bg-fuchsia-500", quota: 500, price: "$499" },
  };

  const currentTier = tierInfo[tenant.subscriptionTier];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Welcome back, {clerkUser?.firstName || "User"}!
          </h1>
          <p className="text-gray-400">
            Manage your account, quota, and subscription
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Quota Card */}
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <Zap className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Quota Usage</p>
                  <p className="text-2xl font-bold text-white">
                    {tenant.usedQuota} / {tenant.monthlyQuota}
                  </p>
                </div>
              </div>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
              <div
                className={`h-2 rounded-full ${
                  quotaPercentage >= 90
                    ? "bg-red-500"
                    : quotaPercentage >= 70
                    ? "bg-yellow-500"
                    : "bg-purple-500"
                }`}
                style={{ width: `${Math.min(quotaPercentage, 100)}%` }}
              />
            </div>
            <p className="text-xs text-gray-500">
              {quotaRemaining} concepts remaining • Resets {quotaResetDate}
            </p>
          </div>

          {/* Subscription Card */}
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-fuchsia-500/20 rounded-lg">
                  <CreditCard className="h-5 w-5 text-fuchsia-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Subscription</p>
                  <p className="text-2xl font-bold text-white">{currentTier.name}</p>
                </div>
              </div>
            </div>
            <div className={`inline-block px-3 py-1 rounded-full text-xs font-medium text-white ${currentTier.color} mb-2`}>
              {currentTier.price}/month
            </div>
            <p className="text-xs text-gray-500">
              Status: {tenant.subscriptionStatus === "active" ? "Active" : "Inactive"}
            </p>
          </div>

          {/* Organization Card */}
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-cyan-500/20 rounded-lg">
                  <Users className="h-5 w-5 text-cyan-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Organization</p>
                  <p className="text-2xl font-bold text-white truncate max-w-[120px]">
                    {tenant.name}
                  </p>
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-500 mb-2">Role: {user.role}</p>
            <p className="text-xs text-gray-500">ID: {tenant.id.slice(0, 8)}...</p>
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Upgrade Plan */}
          <div className="bg-gradient-to-br from-fuchsia-500/10 to-purple-500/10 border border-fuchsia-500/20 rounded-xl p-6">
            <h3 className="text-xl font-bold text-white mb-2">
              {tenant.subscriptionTier === "FREE" ? "Upgrade Your Plan" : "Manage Subscription"}
            </h3>
            <p className="text-gray-400 mb-4">
              {tenant.subscriptionTier === "FREE"
                ? "Get more concepts and unlock advanced features"
                : "Update your billing details or change plans"}
            </p>
            <Link
              href="/dashboard/billing"
              className="inline-block px-6 py-3 bg-fuchsia-600 text-white font-medium rounded-lg hover:bg-fuchsia-700 transition-colors"
            >
              {tenant.subscriptionTier === "FREE" ? "View Plans" : "Manage Billing"}
            </Link>
          </div>

          {/* API Access */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <Key className="h-5 w-5 text-gray-400" />
              <h3 className="text-xl font-bold text-white">API Access</h3>
            </div>
            <p className="text-gray-400 mb-4">
              Generate API keys for programmatic access
            </p>
            <Link
              href="/dashboard/api-keys"
              className="inline-block px-6 py-3 bg-gray-700 text-white font-medium rounded-lg hover:bg-gray-600 transition-colors"
            >
              Manage API Keys
            </Link>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
          <h3 className="text-xl font-bold text-white mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/"
              className="p-4 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors"
            >
              <h4 className="font-medium text-white mb-1">Generate Content</h4>
              <p className="text-sm text-gray-400">Create viral concepts with AI</p>
            </Link>
            <Link
              href="/history"
              className="p-4 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors"
            >
              <h4 className="font-medium text-white mb-1">View History</h4>
              <p className="text-sm text-gray-400">Browse past generations</p>
            </Link>
            <Link
              href="/analytics"
              className="p-4 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors"
            >
              <h4 className="font-medium text-white mb-1">Analytics</h4>
              <p className="text-sm text-gray-400">Track performance metrics</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
