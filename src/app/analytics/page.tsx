'use client';

import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Layers, Calendar, RefreshCw } from 'lucide-react';
import { getAnalyticsData } from '@/lib/storage';
import AnalyticsChart from '@/components/AnalyticsChart';

interface AnalyticsData {
  totalGenerations: number;
  totalConcepts: number;
  categoryBreakdown: Record<string, number>;
  trendFrequency: Record<string, number>;
  dailyGenerations: Record<string, number>;
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const data = await getAnalyticsData();
      setAnalytics(data);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-8">
            <div className="h-8 w-48 bg-zinc-800 rounded animate-pulse mb-2" />
            <div className="h-5 w-72 bg-zinc-800 rounded animate-pulse" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 rounded-2xl bg-zinc-800/50 animate-pulse" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-80 rounded-2xl bg-zinc-800/50 animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <BarChart3 className="h-16 w-16 text-zinc-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">No analytics data</h2>
          <p className="text-zinc-500">Generate some viral concepts to see analytics</p>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      label: 'Total Generations',
      value: analytics.totalGenerations,
      icon: Layers,
      color: 'from-cyan-500 to-blue-500',
    },
    {
      label: 'Total Concepts',
      value: analytics.totalConcepts,
      icon: TrendingUp,
      color: 'from-fuchsia-500 to-purple-500',
    },
    {
      label: 'Unique Trends',
      value: Object.keys(analytics.trendFrequency).length,
      icon: BarChart3,
      color: 'from-amber-500 to-orange-500',
    },
    {
      label: 'Active Days',
      value: Object.keys(analytics.dailyGenerations).length,
      icon: Calendar,
      color: 'from-emerald-500 to-teal-500',
    },
  ];

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Analytics</h1>
            <p className="text-zinc-400">Track your viral content generation patterns</p>
          </div>
          <button
            onClick={loadAnalytics}
            className="flex items-center gap-2 rounded-xl bg-zinc-800 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((stat, index) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 relative overflow-hidden"
            >
              <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${stat.color} opacity-10 rounded-full -translate-y-1/2 translate-x-1/2`} />
              <div className="relative">
                <div className={`inline-flex p-2.5 rounded-xl bg-gradient-to-br ${stat.color} mb-4`}>
                  <stat.icon className="h-5 w-5 text-white" />
                </div>
                <p className="text-3xl font-bold text-white mb-1">{stat.value}</p>
                <p className="text-sm text-zinc-500">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <AnalyticsChart
            title="Category Breakdown"
            data={analytics.categoryBreakdown}
            type="bar"
          />

          <AnalyticsChart
            title="Category Distribution"
            data={analytics.categoryBreakdown}
            type="pie"
          />

          <AnalyticsChart
            title="Top Trend Topics"
            data={Object.fromEntries(
              Object.entries(analytics.trendFrequency)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 8)
            )}
            type="bar"
            color="#f59e0b"
          />

          <AnalyticsChart
            title="Daily Generations"
            data={analytics.dailyGenerations}
            type="line"
            color="#06b6d4"
          />
        </div>

        {/* Insights Section */}
        {analytics.totalGenerations > 0 && (
          <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
            <h3 className="text-lg font-bold text-white mb-4">Quick Insights</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-4 rounded-xl bg-zinc-800/50">
                <p className="text-sm text-zinc-500 mb-1">Most Used Category</p>
                <p className="text-lg font-semibold text-white capitalize">
                  {Object.entries(analytics.categoryBreakdown).sort(([, a], [, b]) => b - a)[0]?.[0] || 'N/A'}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-zinc-800/50">
                <p className="text-sm text-zinc-500 mb-1">Avg Concepts per Generation</p>
                <p className="text-lg font-semibold text-white">
                  {analytics.totalGenerations > 0
                    ? (analytics.totalConcepts / analytics.totalGenerations).toFixed(1)
                    : '0'}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-zinc-800/50">
                <p className="text-sm text-zinc-500 mb-1">Top Trend</p>
                <p className="text-lg font-semibold text-white truncate">
                  {Object.entries(analytics.trendFrequency).sort(([, a], [, b]) => b - a)[0]?.[0] || 'N/A'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
