import * as fs from 'fs';
import * as path from 'path';
import { PerformanceFeedback, PerformanceHistory, CategoryPerformanceStats, Category } from '@/types';
import { v4 as uuidv4 } from 'uuid';

const HISTORY_PATH = path.join(process.cwd(), 'src', 'lib', 'learning', 'performance-history.json');

function loadHistory(): PerformanceHistory {
  try {
    const raw = fs.readFileSync(HISTORY_PATH, 'utf-8');
    return JSON.parse(raw) as PerformanceHistory;
  } catch {
    return {
      entries: [],
      categoryStats: {},
      lastUpdated: new Date().toISOString(),
    };
  }
}

function saveHistory(history: PerformanceHistory): void {
  history.lastUpdated = new Date().toISOString();
  const dir = path.dirname(HISTORY_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2), 'utf-8');
}

export function recordPerformance(feedback: Omit<PerformanceFeedback, 'id' | 'engagementRate' | 'reportedAt'>): PerformanceFeedback {
  const history = loadHistory();

  const { views, likes, shares, comments } = feedback.metrics;
  const engagementRate = views > 0 ? ((likes + shares + comments) / views) * 100 : 0;

  const entry: PerformanceFeedback = {
    ...feedback,
    id: uuidv4(),
    engagementRate: Math.round(engagementRate * 100) / 100,
    reportedAt: new Date().toISOString(),
  };

  history.entries.push(entry);

  // Keep last 500 entries max
  if (history.entries.length > 500) {
    history.entries = history.entries.slice(-500);
  }

  // Recalculate category stats
  recalculateStats(history);

  saveHistory(history);
  return entry;
}

function recalculateStats(history: PerformanceHistory): void {
  const byCategory: Record<string, PerformanceFeedback[]> = {};

  history.entries.forEach(entry => {
    if (!byCategory[entry.category]) byCategory[entry.category] = [];
    byCategory[entry.category].push(entry);
  });

  const stats: Record<string, CategoryPerformanceStats> = {};

  Object.entries(byCategory).forEach(([cat, entries]) => {
    const tiktokEntries = entries.filter(e => e.platform === 'tiktok');
    const shortsEntries = entries.filter(e => e.platform === 'youtube-shorts');

    const avgViews = entries.reduce((sum, e) => sum + e.metrics.views, 0) / entries.length;
    const avgEngagement = entries.reduce((sum, e) => sum + e.engagementRate, 0) / entries.length;

    const best = entries.reduce((prev, curr) =>
      curr.engagementRate > (prev?.engagementRate || 0) ? curr : prev
    , entries[0]);

    stats[cat] = {
      totalEntries: entries.length,
      avgViews: Math.round(avgViews),
      avgEngagementRate: Math.round(avgEngagement * 100) / 100,
      bestPerforming: best ? { conceptId: best.conceptId, engagementRate: best.engagementRate } : null,
      platformBreakdown: {
        tiktok: {
          entries: tiktokEntries.length,
          avgEngagement: tiktokEntries.length > 0
            ? Math.round((tiktokEntries.reduce((sum, e) => sum + e.engagementRate, 0) / tiktokEntries.length) * 100) / 100
            : 0,
        },
        youtubeShorts: {
          entries: shortsEntries.length,
          avgEngagement: shortsEntries.length > 0
            ? Math.round((shortsEntries.reduce((sum, e) => sum + e.engagementRate, 0) / shortsEntries.length) * 100) / 100
            : 0,
        },
      },
    };
  });

  history.categoryStats = stats;
}

export function getPerformanceHistory(): PerformanceHistory {
  return loadHistory();
}

export function getCategoryPerformance(category: string): CategoryPerformanceStats | null {
  const history = loadHistory();
  return history.categoryStats[category] || null;
}

export function getTopPerformingCategories(limit: number = 5): { category: string; stats: CategoryPerformanceStats }[] {
  const history = loadHistory();
  return Object.entries(history.categoryStats)
    .map(([category, stats]) => ({ category, stats }))
    .sort((a, b) => b.stats.avgEngagementRate - a.stats.avgEngagementRate)
    .slice(0, limit);
}

export function getRecentFeedback(limit: number = 20): PerformanceFeedback[] {
  const history = loadHistory();
  return history.entries.slice(-limit).reverse();
}

export function getPlatformComparison(): {
  tiktok: { totalEntries: number; avgEngagement: number; avgViews: number };
  youtubeShorts: { totalEntries: number; avgEngagement: number; avgViews: number };
} {
  const history = loadHistory();
  const tiktok = history.entries.filter(e => e.platform === 'tiktok');
  const shorts = history.entries.filter(e => e.platform === 'youtube-shorts');

  return {
    tiktok: {
      totalEntries: tiktok.length,
      avgEngagement: tiktok.length > 0
        ? Math.round((tiktok.reduce((sum, e) => sum + e.engagementRate, 0) / tiktok.length) * 100) / 100
        : 0,
      avgViews: tiktok.length > 0
        ? Math.round(tiktok.reduce((sum, e) => sum + e.metrics.views, 0) / tiktok.length)
        : 0,
    },
    youtubeShorts: {
      totalEntries: shorts.length,
      avgEngagement: shorts.length > 0
        ? Math.round((shorts.reduce((sum, e) => sum + e.engagementRate, 0) / shorts.length) * 100) / 100
        : 0,
      avgViews: shorts.length > 0
        ? Math.round(shorts.reduce((sum, e) => sum + e.metrics.views, 0) / shorts.length)
        : 0,
    },
  };
}
