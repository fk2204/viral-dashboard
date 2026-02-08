/**
 * Social Accounts Dashboard
 *
 * Connect and manage TikTok, YouTube, and Instagram accounts for automated posting
 */

"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  AlertCircle,
  CheckCircle,
  ExternalLink,
  Trash2,
  Youtube,
  Instagram,
  Music,
} from "lucide-react";

interface SocialAccount {
  id: string;
  platform: string;
  username: string;
  niche?: string;
  isActive: boolean;
  dailyLimit: number;
  usedToday: number;
  availableQuota: number;
  quotaResetsAt: string;
  postCount: number;
  connectedAt: string;
  expiresAt?: string;
}

interface AccountsResponse {
  accounts: {
    tiktok: SocialAccount[];
    youtube: SocialAccount[];
    instagram: SocialAccount[];
  };
  totals: {
    tiktok: { totalAccounts: number; activeAccounts: number; totalQuota: number; availableQuota: number };
    youtube: { totalAccounts: number; activeAccounts: number; totalQuota: number; availableQuota: number };
    instagram: { totalAccounts: number; activeAccounts: number; totalQuota: number; availableQuota: number };
  };
}

export default function SocialAccountsPage() {
  const [accounts, setAccounts] = useState<AccountsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const response = await fetch("/api/social/accounts");
      const data = await response.json();
      setAccounts(data);
    } catch (error) {
      console.error("Failed to fetch accounts:", error);
    } finally {
      setLoading(false);
    }
  };

  const connectAccount = async (platform: string) => {
    setConnecting(platform);

    try {
      // Get OAuth URL
      const response = await fetch(`/api/social/auth-url?platform=${platform}`);
      const data = await response.json();

      if (data.authUrl) {
        // Redirect to OAuth flow
        window.location.href = data.authUrl;
      }
    } catch (error) {
      console.error("Failed to connect account:", error);
      setConnecting(null);
    }
  };

  const disconnectAccount = async (accountId: string) => {
    if (!confirm("Are you sure you want to disconnect this account?")) {
      return;
    }

    try {
      await fetch(`/api/social/accounts?id=${accountId}`, {
        method: "DELETE",
      });
      await fetchAccounts();
    } catch (error) {
      console.error("Failed to disconnect account:", error);
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case "tiktok":
        return <Music className="h-5 w-5" />;
      case "youtube":
        return <Youtube className="h-5 w-5" />;
      case "instagram":
        return <Instagram className="h-5 w-5" />;
      default:
        return null;
    }
  };

  const getPlatformColor = (platform: string) => {
    switch (platform) {
      case "tiktok":
        return "bg-black text-white";
      case "youtube":
        return "bg-red-600 text-white";
      case "instagram":
        return "bg-gradient-to-r from-purple-600 to-pink-600 text-white";
      default:
        return "bg-gray-600 text-white";
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
            <p className="mt-4 text-zinc-400">Loading accounts...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Social Media Accounts</h1>
        <p className="text-zinc-400">
          Connect your social media accounts to enable automated video posting
        </p>
      </div>

      {/* Platform Connection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {["tiktok", "youtube", "instagram"].map((platform) => {
          const platformData = accounts?.totals[platform as keyof typeof accounts.totals];
          const platformAccounts = accounts?.accounts[platform as keyof typeof accounts.accounts] || [];

          return (
            <Card key={platform} className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${getPlatformColor(platform)}`}>
                      {getPlatformIcon(platform)}
                    </div>
                    <div>
                      <CardTitle className="capitalize">{platform}</CardTitle>
                      <CardDescription>
                        {platformData?.activeAccounts || 0} account{platformData?.activeAccounts !== 1 ? "s" : ""} connected
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {platformAccounts.length === 0 ? (
                  <Button
                    onClick={() => connectAccount(platform)}
                    disabled={connecting === platform}
                    className="w-full"
                  >
                    {connecting === platform ? "Connecting..." : `Connect ${platform === "tiktok" ? "TikTok" : platform === "youtube" ? "YouTube" : "Instagram"}`}
                  </Button>
                ) : (
                  <div className="space-y-4">
                    <div className="text-sm text-zinc-400">
                      <div className="flex justify-between mb-1">
                        <span>Daily Quota</span>
                        <span>
                          {platformData?.availableQuota || 0} / {platformData?.totalQuota || 0}
                        </span>
                      </div>
                      <Progress
                        value={
                          platformData
                            ? ((platformData.totalQuota - platformData.availableQuota) /
                                platformData.totalQuota) *
                              100
                            : 0
                        }
                        className="h-2"
                      />
                    </div>
                    <Button
                      onClick={() => connectAccount(platform)}
                      disabled={connecting === platform}
                      variant="outline"
                      className="w-full"
                    >
                      Add Another Account
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Connected Accounts List */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle>Connected Accounts</CardTitle>
          <CardDescription>Manage your connected social media accounts</CardDescription>
        </CardHeader>
        <CardContent>
          {!accounts ||
          (accounts.accounts.tiktok.length === 0 &&
            accounts.accounts.youtube.length === 0 &&
            accounts.accounts.instagram.length === 0) ? (
            <div className="text-center py-12 text-zinc-400">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No accounts connected yet</p>
              <p className="text-sm mt-2">Connect an account to start automated posting</p>
            </div>
          ) : (
            <div className="space-y-4">
              {["tiktok", "youtube", "instagram"].map((platform) => {
                const platformAccounts = accounts.accounts[platform as keyof typeof accounts.accounts];

                if (platformAccounts.length === 0) return null;

                return (
                  <div key={platform}>
                    <h3 className="text-lg font-semibold mb-3 capitalize flex items-center gap-2">
                      {getPlatformIcon(platform)}
                      {platform}
                    </h3>
                    <div className="space-y-2">
                      {platformAccounts.map((account) => (
                        <div
                          key={account.id}
                          className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="font-medium">{account.username}</span>
                              {account.isActive ? (
                                <Badge className="bg-green-500/20 text-green-400">Active</Badge>
                              ) : (
                                <Badge className="bg-red-500/20 text-red-400">Inactive</Badge>
                              )}
                              {account.niche && (
                                <Badge variant="outline">{account.niche}</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-6 text-sm text-zinc-400">
                              <span>
                                {account.availableQuota} / {account.dailyLimit} posts available today
                              </span>
                              <span>{account.postCount} total posts</span>
                              <span>Connected {new Date(account.connectedAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => disconnectAccount(account.id)}
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Help Section */}
      <Card className="mt-6 bg-blue-500/10 border-blue-500/20">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-400 mt-0.5" />
            <div className="text-sm text-zinc-300">
              <p className="font-medium mb-1">Platform Rate Limits</p>
              <ul className="list-disc list-inside space-y-1 text-zinc-400">
                <li>TikTok: 10 videos per day per account</li>
                <li>YouTube: 6 Shorts per day per project (~10,000 quota units)</li>
                <li>Instagram: 25 Reels per day per account</li>
              </ul>
              <p className="mt-2 text-zinc-400">
                Connect multiple accounts to increase your daily posting capacity.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
