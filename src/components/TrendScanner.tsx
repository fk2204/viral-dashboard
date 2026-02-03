'use client';

import { TrendData } from '@/types';
import { TrendingUp, Flame, Eye, Heart, Share2 } from 'lucide-react';
import { scoreTrend } from '@/lib/trends';

interface TrendScannerProps {
  trends: TrendData[];
  loading?: boolean;
}

export default function TrendScanner({ trends, loading }: TrendScannerProps) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center animate-pulse">
            <TrendingUp className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Scanning Trends...</h2>
            <p className="text-sm text-zinc-500">Analyzing viral potential</p>
          </div>
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-16 rounded-xl bg-zinc-800/50 animate-pulse"
              style={{ animationDelay: `${i * 100}ms` }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (trends.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 text-center">
        <TrendingUp className="h-12 w-12 text-zinc-600 mx-auto mb-3" />
        <p className="text-zinc-500">Generate concepts to see today&apos;s trends</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
          <TrendingUp className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">Today&apos;s Trends</h2>
          <p className="text-sm text-zinc-500">{trends.length} trends analyzed</p>
        </div>
      </div>

      <div className="space-y-3">
        {trends.slice(0, 8).map((trend, index) => {
          const potential = scoreTrend(trend);
          const isHot = potential === 'VIRAL POTENTIAL';
          const isHigh = potential === 'HIGH POTENTIAL';

          return (
            <div
              key={trend.id}
              className={`rounded-xl p-4 border transition-all hover:scale-[1.02] ${
                isHot
                  ? 'border-orange-500/50 bg-gradient-to-r from-orange-500/10 to-red-500/10'
                  : isHigh
                  ? 'border-amber-500/30 bg-amber-500/5'
                  : 'border-zinc-800 bg-zinc-800/30'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {isHot && <Flame className="h-4 w-4 text-orange-400 animate-pulse" />}
                    <span className="text-sm font-medium text-white truncate">
                      {trend.topic}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-zinc-500">
                    <span>{trend.source}</span>
                    <span className={`px-1.5 py-0.5 rounded ${
                      trend.recency === 'today'
                        ? 'bg-green-500/20 text-green-400'
                        : trend.recency === 'yesterday'
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : 'bg-zinc-700 text-zinc-400'
                    }`}>
                      {trend.recency}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-xs font-semibold ${
                    isHot ? 'text-orange-400' : isHigh ? 'text-amber-400' : 'text-zinc-500'
                  }`}>
                    {potential}
                  </div>
                  <div className="text-lg font-bold text-white">{Math.round(trend.score)}</div>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-4">
                <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                  <Eye className="h-3.5 w-3.5" />
                  <span>{trend.visualPotential}%</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                  <Heart className="h-3.5 w-3.5" />
                  <span>{trend.emotionalImpact}%</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                  <Share2 className="h-3.5 w-3.5" />
                  <span>{trend.shareability}%</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
