import { PerformanceFeedback, Category } from '@/types';
import { getPerformanceHistory } from './performance-tracker';
import { loadKnowledgeBase, HookPattern } from '../knowledge';

// ============================================================
// PATTERN EXTRACTOR — Discovers what works from performance data
// ============================================================

export interface ExtractedPatterns {
  titleWordPatterns: WordPattern[];
  hookTypePerformance: HookTypePerformance[];
  categoryPlatformMatrix: CategoryPlatformInsight[];
  timingInsights: TimingInsight[];
  topPerformingStructures: StructurePattern[];
  extractedAt: string;
}

export interface WordPattern {
  word: string;
  frequency: number;
  avgEngagement: number;
  platforms: Record<string, number>; // platform -> avg engagement
}

export interface HookTypePerformance {
  hookId: string;
  formula: string;
  timesUsed: number;
  avgEngagement: number;
  bestPlatform: string;
  trend: 'rising' | 'stable' | 'declining';
}

export interface CategoryPlatformInsight {
  category: string;
  platform: string;
  entries: number;
  avgEngagement: number;
  avgViews: number;
  topTitle: string;
  recommendation: string;
}

export interface TimingInsight {
  hour: number;
  dayOfWeek: number;
  avgEngagement: number;
  sampleSize: number;
}

export interface StructurePattern {
  pattern: string; // e.g., "POV:", "When {x}", "The truth about"
  frequency: number;
  avgEngagement: number;
  categories: string[];
}

// Common title structure prefixes to detect
const TITLE_STRUCTURES = [
  { pattern: 'POV:', regex: /^pov:/i },
  { pattern: 'When {x}', regex: /^when\s/i },
  { pattern: 'The truth about', regex: /the\s+truth\s+about/i },
  { pattern: 'BREAKING:', regex: /^breaking/i },
  { pattern: 'How {x}', regex: /^how\s/i },
  { pattern: 'Why {x}', regex: /^why\s/i },
  { pattern: 'If {x}', regex: /^if\s/i },
  { pattern: '{x} But', regex: /\bbut\b/i },
  { pattern: 'Nobody Expected', regex: /nobody\s+expected/i },
  { pattern: 'The {x} That', regex: /^the\s+\w+\s+that/i },
  { pattern: 'Rating/Review', regex: /\b(rating|review|ranked)\b/i },
  { pattern: 'Before and After', regex: /before\s+and\s+after/i },
  { pattern: '{x} Challenge', regex: /\bchallenge\b/i },
  { pattern: '{x} Hack', regex: /\bhack\b/i },
  { pattern: 'Pro/Expert Reacts', regex: /\b(pro|expert|chef|gamer)\s+(reacts|reveals|shows)/i },
];

// Stop words to exclude from word pattern analysis
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'can', 'shall', 'to', 'of', 'in', 'for',
  'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during',
  'before', 'after', 'above', 'below', 'between', 'out', 'off', 'over',
  'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when',
  'where', 'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more',
  'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own',
  'same', 'so', 'than', 'too', 'very', 'just', 'but', 'and', 'or', 'if',
  'this', 'that', 'these', 'those', 'its', 'your', 'you', 'what', 'which',
]);

/**
 * Main extraction function — analyzes all performance data and returns patterns
 */
export function extractPatterns(): ExtractedPatterns {
  const history = getPerformanceHistory();
  const entries = history.entries;

  if (entries.length === 0) {
    return {
      titleWordPatterns: [],
      hookTypePerformance: [],
      categoryPlatformMatrix: [],
      timingInsights: [],
      topPerformingStructures: [],
      extractedAt: new Date().toISOString(),
    };
  }

  return {
    titleWordPatterns: extractWordPatterns(entries),
    hookTypePerformance: analyzeHookPerformance(entries),
    categoryPlatformMatrix: analyzeCategoryPlatform(entries),
    timingInsights: analyzeTimingPatterns(entries),
    topPerformingStructures: analyzeStructures(entries),
    extractedAt: new Date().toISOString(),
  };
}

/**
 * Extract which words in titles correlate with high engagement
 */
function extractWordPatterns(entries: PerformanceFeedback[]): WordPattern[] {
  const wordStats: Record<string, { totalEngagement: number; count: number; platforms: Record<string, { total: number; count: number }> }> = {};

  entries.forEach(entry => {
    const words = entry.conceptTitle.toLowerCase().split(/\s+/).filter(w => w.length > 3 && !STOP_WORDS.has(w));
    words.forEach(word => {
      const clean = word.replace(/[^a-z0-9]/g, '');
      if (clean.length < 3) return;

      if (!wordStats[clean]) {
        wordStats[clean] = { totalEngagement: 0, count: 0, platforms: {} };
      }
      wordStats[clean].totalEngagement += entry.engagementRate;
      wordStats[clean].count++;

      if (!wordStats[clean].platforms[entry.platform]) {
        wordStats[clean].platforms[entry.platform] = { total: 0, count: 0 };
      }
      wordStats[clean].platforms[entry.platform].total += entry.engagementRate;
      wordStats[clean].platforms[entry.platform].count++;
    });
  });

  return Object.entries(wordStats)
    .filter(([_, stats]) => stats.count >= 2) // Need at least 2 uses
    .map(([word, stats]) => ({
      word,
      frequency: stats.count,
      avgEngagement: Math.round((stats.totalEngagement / stats.count) * 100) / 100,
      platforms: Object.fromEntries(
        Object.entries(stats.platforms).map(([p, s]) => [p, Math.round((s.total / s.count) * 100) / 100])
      ),
    }))
    .sort((a, b) => b.avgEngagement - a.avgEngagement)
    .slice(0, 50);
}

/**
 * Analyze which hook patterns from the knowledge base perform best
 */
function analyzeHookPerformance(entries: PerformanceFeedback[]): HookTypePerformance[] {
  let kb;
  try {
    kb = loadKnowledgeBase();
  } catch {
    return [];
  }

  const hookStats: Record<string, {
    hookId: string;
    formula: string;
    matches: { engagement: number; platform: string; timestamp: string }[];
  }> = {};

  kb.hooks.forEach(hook => {
    hookStats[hook.id] = { hookId: hook.id, formula: hook.formula, matches: [] };
  });

  // Match entries to hooks
  entries.forEach(entry => {
    const title = entry.conceptTitle.toLowerCase();
    kb.hooks.forEach(hook => {
      const formulaParts = hook.formula.toLowerCase().replace(/\{topic\}/g, '').split(/\s+/).filter(w => w.length > 2);
      if (formulaParts.length === 0) return;
      const matchRatio = formulaParts.filter(p => title.includes(p)).length / formulaParts.length;
      if (matchRatio > 0.4) {
        hookStats[hook.id].matches.push({
          engagement: entry.engagementRate,
          platform: entry.platform,
          timestamp: entry.reportedAt,
        });
      }
    });
  });

  return Object.values(hookStats)
    .filter(h => h.matches.length > 0)
    .map(h => {
      const avgEngagement = h.matches.reduce((sum, m) => sum + m.engagement, 0) / h.matches.length;

      // Determine best platform
      const platformEngagement: Record<string, { total: number; count: number }> = {};
      h.matches.forEach(m => {
        if (!platformEngagement[m.platform]) platformEngagement[m.platform] = { total: 0, count: 0 };
        platformEngagement[m.platform].total += m.engagement;
        platformEngagement[m.platform].count++;
      });
      const bestPlatform = Object.entries(platformEngagement)
        .map(([p, s]) => ({ platform: p, avg: s.total / s.count }))
        .sort((a, b) => b.avg - a.avg)[0]?.platform || 'tiktok';

      // Determine trend (compare first half vs second half of matches)
      const sorted = [...h.matches].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      const mid = Math.floor(sorted.length / 2);
      const firstHalf = sorted.slice(0, mid || 1);
      const secondHalf = sorted.slice(mid || 1);
      const firstAvg = firstHalf.reduce((s, m) => s + m.engagement, 0) / firstHalf.length;
      const secondAvg = secondHalf.length > 0 ? secondHalf.reduce((s, m) => s + m.engagement, 0) / secondHalf.length : firstAvg;
      const trend: 'rising' | 'stable' | 'declining' = secondAvg > firstAvg * 1.1 ? 'rising' : secondAvg < firstAvg * 0.9 ? 'declining' : 'stable';

      return {
        hookId: h.hookId,
        formula: h.formula,
        timesUsed: h.matches.length,
        avgEngagement: Math.round(avgEngagement * 100) / 100,
        bestPlatform,
        trend,
      };
    })
    .sort((a, b) => b.avgEngagement - a.avgEngagement);
}

/**
 * Build category x platform performance matrix
 */
function analyzeCategoryPlatform(entries: PerformanceFeedback[]): CategoryPlatformInsight[] {
  const matrix: Record<string, PerformanceFeedback[]> = {};

  entries.forEach(entry => {
    const key = `${entry.category}|${entry.platform}`;
    if (!matrix[key]) matrix[key] = [];
    matrix[key].push(entry);
  });

  return Object.entries(matrix).map(([key, group]) => {
    const [category, platform] = key.split('|');
    const avgEngagement = group.reduce((s, e) => s + e.engagementRate, 0) / group.length;
    const avgViews = group.reduce((s, e) => s + e.metrics.views, 0) / group.length;
    const best = group.sort((a, b) => b.engagementRate - a.engagementRate)[0];

    let recommendation = '';
    if (avgEngagement > 5) {
      recommendation = `Strong performer — increase ${category} content on ${platform}`;
    } else if (avgEngagement > 2) {
      recommendation = `Moderate — optimize hooks and posting time for ${category} on ${platform}`;
    } else {
      recommendation = `Underperforming — consider different angle for ${category} on ${platform}`;
    }

    return {
      category,
      platform,
      entries: group.length,
      avgEngagement: Math.round(avgEngagement * 100) / 100,
      avgViews: Math.round(avgViews),
      topTitle: best.conceptTitle,
      recommendation,
    };
  }).sort((a, b) => b.avgEngagement - a.avgEngagement);
}

/**
 * Analyze which posting times correlate with engagement
 */
function analyzeTimingPatterns(entries: PerformanceFeedback[]): TimingInsight[] {
  const timingStats: Record<string, { totalEngagement: number; count: number }> = {};

  entries.forEach(entry => {
    const date = new Date(entry.reportedAt);
    const hour = date.getHours();
    const day = date.getDay();
    const key = `${day}-${hour}`;
    if (!timingStats[key]) timingStats[key] = { totalEngagement: 0, count: 0 };
    timingStats[key].totalEngagement += entry.engagementRate;
    timingStats[key].count++;
  });

  return Object.entries(timingStats)
    .map(([key, stats]) => {
      const [day, hour] = key.split('-').map(Number);
      return {
        hour,
        dayOfWeek: day,
        avgEngagement: Math.round((stats.totalEngagement / stats.count) * 100) / 100,
        sampleSize: stats.count,
      };
    })
    .sort((a, b) => b.avgEngagement - a.avgEngagement);
}

/**
 * Analyze which title structures perform best
 */
function analyzeStructures(entries: PerformanceFeedback[]): StructurePattern[] {
  const structureStats: Record<string, { totalEngagement: number; count: number; categories: Set<string> }> = {};

  entries.forEach(entry => {
    TITLE_STRUCTURES.forEach(({ pattern, regex }) => {
      if (regex.test(entry.conceptTitle)) {
        if (!structureStats[pattern]) {
          structureStats[pattern] = { totalEngagement: 0, count: 0, categories: new Set() };
        }
        structureStats[pattern].totalEngagement += entry.engagementRate;
        structureStats[pattern].count++;
        structureStats[pattern].categories.add(entry.category);
      }
    });
  });

  return Object.entries(structureStats)
    .map(([pattern, stats]) => ({
      pattern,
      frequency: stats.count,
      avgEngagement: Math.round((stats.totalEngagement / stats.count) * 100) / 100,
      categories: Array.from(stats.categories),
    }))
    .sort((a, b) => b.avgEngagement - a.avgEngagement);
}

/**
 * Get a quick summary of extracted patterns for display
 */
export function getPatternSummary(): {
  topWords: string[];
  topHooks: string[];
  bestCategoryPlatform: string;
  bestPostingTime: string;
  bestStructure: string;
  dataPoints: number;
} {
  const patterns = extractPatterns();
  const history = getPerformanceHistory();

  return {
    topWords: patterns.titleWordPatterns.slice(0, 5).map(w => w.word),
    topHooks: patterns.hookTypePerformance.slice(0, 3).map(h => h.formula),
    bestCategoryPlatform: patterns.categoryPlatformMatrix[0]
      ? `${patterns.categoryPlatformMatrix[0].category} on ${patterns.categoryPlatformMatrix[0].platform}`
      : 'Insufficient data',
    bestPostingTime: patterns.timingInsights[0]
      ? `Day ${patterns.timingInsights[0].dayOfWeek} at ${patterns.timingInsights[0].hour}:00`
      : 'Insufficient data',
    bestStructure: patterns.topPerformingStructures[0]?.pattern || 'Insufficient data',
    dataPoints: history.entries.length,
  };
}
