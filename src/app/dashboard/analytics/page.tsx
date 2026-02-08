/**
 * Analytics Dashboard
 *
 * Real-time metrics, video performance, reflexion accuracy, cost tracking
 */

"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  DollarSign,
  Eye,
  Heart,
  Share2,
} from "lucide-react";

interface Metrics {
  video: {
    name: string;
    value: number;
    labels?: Record<string, string>;
  }[];
  posting: {
    name: string;
    value: number;
    labels?: Record<string, string>;
  }[];
  reflexion: {
    name: string;
    value: number;
  }[];
}

interface Alert {
  severity: "warning" | "critical";
  message: string;
}

export default function AnalyticsPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
    fetchAlerts();

    // Refresh every 30 seconds
    const interval = setInterval(() => {
      fetchMetrics();
      fetchAlerts();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const fetchMetrics = async () => {
    try {
      const response = await fetch("/api/metrics?format=json");
      const data = await response.json();
      setMetrics(data);
    } catch (error) {
      console.error("Failed to fetch metrics:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAlerts = async () => {
    try {
      const response = await fetch("/api/metrics?format=alerts");
      const data = await response.json();
      setAlerts(data.alerts || []);
    } catch (error) {
      console.error("Failed to fetch alerts:", error);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
            <p className="mt-4 text-zinc-400">Loading analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  // Calculate summary stats
  const videoStats = {
    completed: metrics?.video.find((m) => m.labels?.status === "completed")?.value || 0,
    failed: metrics?.video.find((m) => m.labels?.status === "failed")?.value || 0,
    generating: metrics?.video.find((m) => m.labels?.status === "generating")?.value || 0,
  };

  const videoTotal = videoStats.completed + videoStats.failed + videoStats.generating;
  const videoSuccessRate = videoTotal > 0 ? (videoStats.completed / videoTotal) * 100 : 0;

  const postingStats = {
    posted: metrics?.posting.find((m) => m.labels?.status === "posted")?.value || 0,
    failed: metrics?.posting.find((m) => m.labels?.status === "failed")?.value || 0,
    pending: metrics?.posting.find((m) => m.labels?.status === "pending")?.value || 0,
  };

  const postingTotal = postingStats.posted + postingStats.failed + postingStats.pending;
  const postingSuccessRate = postingTotal > 0 ? (postingStats.posted / postingTotal) * 100 : 0;

  const reflexionAccuracy =
    metrics?.reflexion.find((m) => m.name === "reflexion_accuracy")?.value || 0;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">System Analytics</h1>
        <p className="text-zinc-400">Real-time performance metrics and insights</p>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <Card className="mb-6 border-yellow-500/50 bg-yellow-500/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-400">
              <AlertTriangle className="h-5 w-5" />
              Active Alerts ({alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alerts.map((alert, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-lg ${
                    alert.severity === "critical"
                      ? "bg-red-500/20 text-red-400"
                      : "bg-yellow-500/20 text-yellow-400"
                  }`}
                >
                  <span className="font-medium uppercase text-xs">
                    {alert.severity}
                  </span>{" "}
                  - {alert.message}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-3">
            <CardDescription>Video Generation</CardDescription>
            <CardTitle className="text-3xl">{videoStats.completed}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-400">Success Rate</span>
              <span
                className={
                  videoSuccessRate >= 90
                    ? "text-green-400"
                    : videoSuccessRate >= 70
                    ? "text-yellow-400"
                    : "text-red-400"
                }
              >
                {videoSuccessRate.toFixed(1)}%
              </span>
            </div>
            <Progress value={videoSuccessRate} className="mt-2 h-2" />
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-3">
            <CardDescription>Social Posts</CardDescription>
            <CardTitle className="text-3xl">{postingStats.posted}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-400">Success Rate</span>
              <span
                className={
                  postingSuccessRate >= 95
                    ? "text-green-400"
                    : postingSuccessRate >= 85
                    ? "text-yellow-400"
                    : "text-red-400"
                }
              >
                {postingSuccessRate.toFixed(1)}%
              </span>
            </div>
            <Progress value={postingSuccessRate} className="mt-2 h-2" />
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-3">
            <CardDescription>Reflexion Accuracy</CardDescription>
            <CardTitle className="text-3xl">{reflexionAccuracy.toFixed(0)}%</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm">
              {reflexionAccuracy >= 80 ? (
                <TrendingUp className="h-4 w-4 text-green-400" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-400" />
              )}
              <span className="text-zinc-400">
                {reflexionAccuracy >= 80 ? "Performing well" : "Needs improvement"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-3">
            <CardDescription>Avg Video Cost</CardDescription>
            <CardTitle className="text-3xl">
              $
              {(
                metrics?.video
                  .filter((m) => m.name === "video_generation_cost_avg")
                  .reduce((sum, m) => sum + m.value, 0) || 0
              ).toFixed(2)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <DollarSign className="h-4 w-4" />
              <span>Per video (24h avg)</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle>Video Generation by Provider</CardTitle>
            <CardDescription>Last 24 hours</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={
                  metrics?.video
                    .filter((m) => m.name === "video_generation_total")
                    .map((m) => ({
                      provider: m.labels?.provider || "unknown",
                      count: m.value,
                    })) || []
                }
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="provider" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#18181b",
                    border: "1px solid #27272a",
                  }}
                />
                <Bar dataKey="count" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle>Posting by Platform</CardTitle>
            <CardDescription>Last 24 hours</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={
                  metrics?.posting
                    .filter((m) => m.name === "posting_total" && m.labels?.status === "posted")
                    .map((m) => ({
                      platform: m.labels?.platform || "unknown",
                      count: m.value,
                    })) || []
                }
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="platform" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#18181b",
                    border: "1px solid #27272a",
                  }}
                />
                <Bar dataKey="count" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* System Health */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle>System Health</CardTitle>
          <CardDescription>Component status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-400" />
                <div>
                  <p className="font-medium">Video Generation</p>
                  <p className="text-sm text-zinc-400">
                    {videoStats.completed} completed, {videoStats.failed} failed
                  </p>
                </div>
              </div>
              <Badge className="bg-green-500/20 text-green-400">Operational</Badge>
            </div>

            <div className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-400" />
                <div>
                  <p className="font-medium">Social Media Posting</p>
                  <p className="text-sm text-zinc-400">
                    {postingStats.posted} posted, {postingStats.failed} failed
                  </p>
                </div>
              </div>
              <Badge className="bg-green-500/20 text-green-400">Operational</Badge>
            </div>

            <div className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-400" />
                <div>
                  <p className="font-medium">Reflexion Learning</p>
                  <p className="text-sm text-zinc-400">
                    {reflexionAccuracy.toFixed(0)}% accuracy
                  </p>
                </div>
              </div>
              <Badge className="bg-green-500/20 text-green-400">Operational</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
