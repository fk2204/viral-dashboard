import * as fs from 'fs';
import * as path from 'path';
import { loadKnowledgeBase, saveKnowledgeBase, HookPattern } from '../knowledge';
import { getPerformanceHistory } from './performance-tracker';
import { Category } from '@/types';

// ============================================================
// EFFECTIVENESS SCORER — Live scoring with EMA smoothing
// ============================================================

export interface EffectivenessScores {
  hooks: HookScore[];
  categories: CategoryScore[];
  platforms: PlatformScore[];
  confidence: number; // 0-1, how much data we have
  updatedAt: string;
}

export interface HookScore {
  hookId: string;
  formula: string;
  rawScore: number;        // from knowledge base
  liveScore: number;       // EMA-smoothed from performance data
  blendedScore: number;    // weighted blend of raw + live
  confidence: number;      // 0-1, based on sample size
  sampleSize: number;
}

export interface CategoryScore {
  category: string;
  tiktokScore: number;
  shortsScore: number;
  overallScore: number;
  trending: 'up' | 'stable' | 'down';
  sampleSize: number;
}

export interface PlatformScore {
  platform: string;
  avgEngagement: number;
  avgViews: number;
  topCategory: string;
  sampleSize: number;
}

interface ScorerState {
  hookEMA: Record<string, { ema: number; count: number; lastUpdated: string }>;
  categoryEMA: Record<string, { tiktok: number; shorts: number; count: number }>;
  lastFullUpdate: string;
}

const SCORER_PATH = path.join(process.cwd(), 'src', 'lib', 'learning', 'scorer-state.json');

// EMA smoothing factor — higher = more weight on recent data
const EMA_ALPHA = 0.3;
// Minimum samples before live score has meaningful confidence
const MIN_SAMPLES_FOR_CONFIDENCE = 3;

// ============================================================
// STATE MANAGEMENT
// ============================================================
function loadScorerState(): ScorerState {
  try {
    const raw = fs.readFileSync(SCORER_PATH, 'utf-8');
    return JSON.parse(raw) as ScorerState;
  } catch {
    return {
      hookEMA: {},
      categoryEMA: {},
      lastFullUpdate: '',
    };
  }
}

function saveScorerState(state: ScorerState): void {
  const dir = path.dirname(SCORER_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(SCORER_PATH, JSON.stringify(state, null, 2), 'utf-8');
}

// ============================================================
// EMA CALCULATION
// ============================================================
function updateEMA(currentEMA: number, newValue: number, alpha: number = EMA_ALPHA): number {
  return alpha * newValue + (1 - alpha) * currentEMA;
}

function engagementToScore(engagementRate: number): number {
  // Convert engagement rate to 0-100 score
  // 0% -> 10, 2% -> 40, 5% -> 70, 10%+ -> 95
  if (engagementRate <= 0) return 10;
  if (engagementRate <= 1) return 10 + engagementRate * 20;
  if (engagementRate <= 5) return 30 + (engagementRate - 1) * 10;
  if (engagementRate <= 10) return 70 + (engagementRate - 5) * 5;
  return Math.min(100, 95 + (engagementRate - 10));
}

// ============================================================
// MAIN SCORING FUNCTIONS
// ============================================================

/**
 * Run a full scoring update — processes all performance data
 * and updates EMA scores for hooks, categories, and platforms
 */
export function updateEffectivenessScores(): EffectivenessScores {
  const state = loadScorerState();
  const history = getPerformanceHistory();
  const kb = loadKnowledgeBase();
  const entries = history.entries;

  // ---- HOOK SCORING ----
  const hookScores: HookScore[] = kb.hooks.map(hook => {
    // Find matching entries
    const formulaParts = hook.formula.toLowerCase().replace(/\{topic\}/g, '').split(/\s+/).filter(w => w.length > 2);

    const matchingEntries = entries.filter(entry => {
      if (formulaParts.length === 0) return false;
      const titleLower = entry.conceptTitle.toLowerCase();
      const matchRatio = formulaParts.filter(p => titleLower.includes(p)).length / formulaParts.length;
      return matchRatio > 0.4;
    });

    // Update EMA for this hook
    if (!state.hookEMA[hook.id]) {
      state.hookEMA[hook.id] = { ema: hook.effectiveness, count: 0, lastUpdated: '' };
    }

    matchingEntries.forEach(entry => {
      const score = engagementToScore(entry.engagementRate);
      state.hookEMA[hook.id].ema = updateEMA(state.hookEMA[hook.id].ema, score);
      state.hookEMA[hook.id].count++;
      state.hookEMA[hook.id].lastUpdated = entry.reportedAt;
    });

    const liveScore = Math.round(state.hookEMA[hook.id].ema);
    const sampleSize = state.hookEMA[hook.id].count;
    const confidence = Math.min(1, sampleSize / (MIN_SAMPLES_FOR_CONFIDENCE * 3));

    // Blend: more confidence in live data = more weight on live score
    const blendedScore = Math.round(
      confidence * liveScore + (1 - confidence) * hook.effectiveness
    );

    return {
      hookId: hook.id,
      formula: hook.formula,
      rawScore: hook.effectiveness,
      liveScore,
      blendedScore,
      confidence: Math.round(confidence * 100) / 100,
      sampleSize,
    };
  });

  // ---- CATEGORY SCORING ----
  const categories: Category[] = ['news', 'absurd', 'luxury', 'emotional', 'tech', 'cartoon', 'gaming', 'fitness', 'food', 'finance', 'music', 'relationships'];

  const categoryScores: CategoryScore[] = categories.map(cat => {
    const catEntries = entries.filter(e => e.category === cat);
    const tiktokEntries = catEntries.filter(e => e.platform === 'tiktok');
    const shortsEntries = catEntries.filter(e => e.platform === 'youtube-shorts');

    if (!state.categoryEMA[cat]) {
      state.categoryEMA[cat] = { tiktok: 50, shorts: 50, count: 0 };
    }

    // Update EMA for category
    tiktokEntries.forEach(e => {
      state.categoryEMA[cat].tiktok = updateEMA(state.categoryEMA[cat].tiktok, engagementToScore(e.engagementRate));
    });
    shortsEntries.forEach(e => {
      state.categoryEMA[cat].shorts = updateEMA(state.categoryEMA[cat].shorts, engagementToScore(e.engagementRate));
    });
    state.categoryEMA[cat].count = catEntries.length;

    const tiktokScore = Math.round(state.categoryEMA[cat].tiktok);
    const shortsScore = Math.round(state.categoryEMA[cat].shorts);

    // Determine trend from recent vs older data
    const recent = catEntries.filter(e => {
      const age = Date.now() - new Date(e.reportedAt).getTime();
      return age < 7 * 24 * 60 * 60 * 1000; // last 7 days
    });
    const older = catEntries.filter(e => {
      const age = Date.now() - new Date(e.reportedAt).getTime();
      return age >= 7 * 24 * 60 * 60 * 1000;
    });

    const recentAvg = recent.length > 0 ? recent.reduce((s, e) => s + e.engagementRate, 0) / recent.length : 0;
    const olderAvg = older.length > 0 ? older.reduce((s, e) => s + e.engagementRate, 0) / older.length : 0;

    let trending: 'up' | 'stable' | 'down' = 'stable';
    if (recent.length >= 2 && older.length >= 2) {
      if (recentAvg > olderAvg * 1.15) trending = 'up';
      else if (recentAvg < olderAvg * 0.85) trending = 'down';
    }

    return {
      category: cat,
      tiktokScore,
      shortsScore,
      overallScore: Math.round((tiktokScore + shortsScore) / 2),
      trending,
      sampleSize: catEntries.length,
    };
  });

  // ---- PLATFORM SCORING ----
  const tiktokEntries = entries.filter(e => e.platform === 'tiktok');
  const shortsEntries = entries.filter(e => e.platform === 'youtube-shorts');

  const platformScores: PlatformScore[] = [
    {
      platform: 'tiktok',
      avgEngagement: tiktokEntries.length > 0
        ? Math.round((tiktokEntries.reduce((s, e) => s + e.engagementRate, 0) / tiktokEntries.length) * 100) / 100
        : 0,
      avgViews: tiktokEntries.length > 0
        ? Math.round(tiktokEntries.reduce((s, e) => s + e.metrics.views, 0) / tiktokEntries.length)
        : 0,
      topCategory: findTopCategory(tiktokEntries),
      sampleSize: tiktokEntries.length,
    },
    {
      platform: 'youtube-shorts',
      avgEngagement: shortsEntries.length > 0
        ? Math.round((shortsEntries.reduce((s, e) => s + e.engagementRate, 0) / shortsEntries.length) * 100) / 100
        : 0,
      avgViews: shortsEntries.length > 0
        ? Math.round(shortsEntries.reduce((s, e) => s + e.metrics.views, 0) / shortsEntries.length)
        : 0,
      topCategory: findTopCategory(shortsEntries),
      sampleSize: shortsEntries.length,
    },
  ];

  // Overall confidence based on total data points
  const totalEntries = entries.length;
  const confidence = Math.min(1, totalEntries / 30); // Full confidence at 30+ entries

  // Persist state
  state.lastFullUpdate = new Date().toISOString();
  saveScorerState(state);

  // Also update the knowledge base hook effectiveness with blended scores
  hookScores.forEach(hs => {
    const hook = kb.hooks.find(h => h.id === hs.hookId);
    if (hook && hs.confidence > 0.3) {
      hook.effectiveness = hs.blendedScore;
    }
  });
  saveKnowledgeBase(kb);

  return {
    hooks: hookScores.sort((a, b) => b.blendedScore - a.blendedScore),
    categories: categoryScores.sort((a, b) => b.overallScore - a.overallScore),
    platforms: platformScores,
    confidence: Math.round(confidence * 100) / 100,
    updatedAt: new Date().toISOString(),
  };
}

function findTopCategory(entries: { category: string; engagementRate: number }[]): string {
  const catStats: Record<string, { total: number; count: number }> = {};
  entries.forEach(e => {
    if (!catStats[e.category]) catStats[e.category] = { total: 0, count: 0 };
    catStats[e.category].total += e.engagementRate;
    catStats[e.category].count++;
  });

  let topCat = 'news';
  let topAvg = 0;
  Object.entries(catStats).forEach(([cat, stats]) => {
    const avg = stats.total / stats.count;
    if (avg > topAvg) {
      topAvg = avg;
      topCat = cat;
    }
  });
  return topCat;
}

/**
 * Get the best hook for a category using live scores
 */
export function getBestHookLive(category: string, limit: number = 3): HookScore[] {
  const state = loadScorerState();
  const kb = loadKnowledgeBase();

  return kb.hooks
    .filter(h => h.category.includes(category) || h.category.includes('all'))
    .map(hook => {
      const ema = state.hookEMA[hook.id];
      const liveScore = ema ? Math.round(ema.ema) : hook.effectiveness;
      const confidence = ema ? Math.min(1, ema.count / (MIN_SAMPLES_FOR_CONFIDENCE * 3)) : 0;
      const blendedScore = Math.round(confidence * liveScore + (1 - confidence) * hook.effectiveness);

      return {
        hookId: hook.id,
        formula: hook.formula,
        rawScore: hook.effectiveness,
        liveScore,
        blendedScore,
        confidence: Math.round(confidence * 100) / 100,
        sampleSize: ema?.count || 0,
      };
    })
    .sort((a, b) => b.blendedScore - a.blendedScore)
    .slice(0, limit);
}

/**
 * Get category effectiveness ranking
 */
export function getCategoryRanking(): CategoryScore[] {
  const state = loadScorerState();
  const categories: Category[] = ['news', 'absurd', 'luxury', 'emotional', 'tech', 'cartoon', 'gaming', 'fitness', 'food', 'finance', 'music', 'relationships'];

  return categories.map(cat => {
    const ema = state.categoryEMA[cat] || { tiktok: 50, shorts: 50, count: 0 };
    return {
      category: cat,
      tiktokScore: Math.round(ema.tiktok),
      shortsScore: Math.round(ema.shorts),
      overallScore: Math.round((ema.tiktok + ema.shorts) / 2),
      trending: 'stable' as const,
      sampleSize: ema.count,
    };
  }).sort((a, b) => b.overallScore - a.overallScore);
}

/**
 * Quick effectiveness summary for display
 */
export function getEffectivenessSummary(): {
  totalDataPoints: number;
  confidence: string;
  topHook: string;
  topCategory: string;
  bestPlatform: string;
  lastUpdate: string;
} {
  const state = loadScorerState();
  const history = getPerformanceHistory();

  const totalPoints = history.entries.length;
  const confidenceLevel = totalPoints >= 30 ? 'High' : totalPoints >= 10 ? 'Medium' : 'Low';

  // Find top hook by EMA
  let topHook = 'No data yet';
  let topHookScore = 0;
  const kb = loadKnowledgeBase();
  kb.hooks.forEach(h => {
    const ema = state.hookEMA[h.id];
    const score = ema ? ema.ema : h.effectiveness;
    if (score > topHookScore) {
      topHookScore = score;
      topHook = h.formula;
    }
  });

  // Find top category
  let topCat = 'No data yet';
  let topCatScore = 0;
  Object.entries(state.categoryEMA).forEach(([cat, ema]) => {
    const avg = (ema.tiktok + ema.shorts) / 2;
    if (avg > topCatScore && ema.count > 0) {
      topCatScore = avg;
      topCat = cat;
    }
  });

  // Find best platform
  const tiktok = history.entries.filter(e => e.platform === 'tiktok');
  const shorts = history.entries.filter(e => e.platform === 'youtube-shorts');
  const tiktokAvg = tiktok.length > 0 ? tiktok.reduce((s, e) => s + e.engagementRate, 0) / tiktok.length : 0;
  const shortsAvg = shorts.length > 0 ? shorts.reduce((s, e) => s + e.engagementRate, 0) / shorts.length : 0;

  return {
    totalDataPoints: totalPoints,
    confidence: confidenceLevel,
    topHook: topHook.length > 50 ? topHook.substring(0, 50) + '...' : topHook,
    topCategory: topCat,
    bestPlatform: tiktokAvg >= shortsAvg ? 'TikTok' : 'YouTube Shorts',
    lastUpdate: state.lastFullUpdate || 'Never',
  };
}
