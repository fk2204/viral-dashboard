import { v4 as uuidv4 } from 'uuid';
import { ABVariant, Category } from '@/types';
import { getHooksForCategory } from '../knowledge';
import { getEvolvedTemplates } from './template-evolver';
import { getBestHookLive } from './effectiveness-scorer';
import { getPerformanceHistory } from './performance-tracker';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================
// A/B VARIANT GENERATOR — Produces multiple title/caption options
// ============================================================

interface VariantWinRecord {
  variantId: string;
  conceptId: string;
  label: string;
  hookSource: string;
  category: string;
  engagementRate: number;
  platform: string;
  recordedAt: string;
}

interface ABTrackingState {
  wins: VariantWinRecord[];
  sourceWinRates: Record<string, { wins: number; total: number }>;
  lastUpdated: string;
}

const AB_TRACKING_PATH = path.join(process.cwd(), 'src', 'lib', 'learning', 'ab-tracking.json');

function loadABTracking(): ABTrackingState {
  try {
    const raw = fs.readFileSync(AB_TRACKING_PATH, 'utf-8');
    return JSON.parse(raw) as ABTrackingState;
  } catch {
    return {
      wins: [],
      sourceWinRates: {},
      lastUpdated: '',
    };
  }
}

function saveABTracking(state: ABTrackingState): void {
  const dir = path.dirname(AB_TRACKING_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  state.lastUpdated = new Date().toISOString();
  fs.writeFileSync(AB_TRACKING_PATH, JSON.stringify(state, null, 2), 'utf-8');
}

/**
 * Generate 3 A/B/C variants for a given category and topic
 * Each variant uses a different source: template, evolved, knowledge-base
 */
export function generateVariants(
  category: string,
  topic: string,
  titleTemplates: string[],
  captionTemplates: string[]
): ABVariant[] {
  const variants: ABVariant[] = [];

  // Variant A: Best static template
  const templateTitle = pickRandom(titleTemplates).replace(/\{topic\}/g, topic);
  const templateCaption = pickRandom(captionTemplates).replace(/\{topic\}/g, topic);
  variants.push({
    id: uuidv4(),
    label: 'A',
    title: templateTitle,
    caption: templateCaption,
    hookSource: 'template',
  });

  // Variant B: Evolved template (from genetic algorithm)
  let evolvedTitle = templateTitle;
  let evolvedCaption = templateCaption;
  try {
    const evolvedTitles = getEvolvedTemplates(category, 'title', 3);
    const evolvedCaptions = getEvolvedTemplates(category, 'caption', 3);
    if (evolvedTitles.length > 0) {
      evolvedTitle = pickRandom(evolvedTitles).replace(/\{topic\}/g, topic);
    }
    if (evolvedCaptions.length > 0) {
      evolvedCaption = pickRandom(evolvedCaptions).replace(/\{topic\}/g, topic);
    }
  } catch {
    // Evolved templates not available — use a different static template
    if (titleTemplates.length > 1) {
      evolvedTitle = titleTemplates[1].replace(/\{topic\}/g, topic);
    }
  }
  variants.push({
    id: uuidv4(),
    label: 'B',
    title: evolvedTitle,
    caption: evolvedCaption,
    hookSource: 'evolved',
  });

  // Variant C: Knowledge base hook (live-scored)
  let kbTitle = templateTitle;
  try {
    const liveHooks = getBestHookLive(category, 3);
    if (liveHooks.length > 0) {
      const bestHook = liveHooks[0];
      kbTitle = bestHook.formula.replace(/\{topic\}/g, topic);
    } else {
      const staticHooks = getHooksForCategory(category, 3);
      if (staticHooks.length > 0) {
        kbTitle = staticHooks[0].formula.replace(/\{topic\}/g, topic);
      }
    }
  } catch {
    // KB not available — use another template variation
    if (titleTemplates.length > 2) {
      kbTitle = titleTemplates[2].replace(/\{topic\}/g, topic);
    }
  }
  variants.push({
    id: uuidv4(),
    label: 'C',
    title: kbTitle,
    caption: templateCaption, // Same caption, different title for fair comparison
    hookSource: 'knowledge-base',
  });

  return variants;
}

/**
 * Record which variant won (had best performance)
 */
export function recordVariantWin(
  variantId: string,
  conceptId: string,
  label: string,
  hookSource: string,
  category: string,
  engagementRate: number,
  platform: string
): void {
  const state = loadABTracking();

  state.wins.push({
    variantId,
    conceptId,
    label,
    hookSource,
    category,
    engagementRate,
    platform,
    recordedAt: new Date().toISOString(),
  });

  // Keep last 200 win records
  if (state.wins.length > 200) {
    state.wins = state.wins.slice(-200);
  }

  // Update source win rates
  if (!state.sourceWinRates[hookSource]) {
    state.sourceWinRates[hookSource] = { wins: 0, total: 0 };
  }
  state.sourceWinRates[hookSource].total++;
  if (engagementRate > 3) {
    state.sourceWinRates[hookSource].wins++;
  }

  saveABTracking(state);
}

/**
 * Get A/B testing statistics
 */
export function getABStats(): {
  totalTests: number;
  sourceWinRates: Record<string, { winRate: number; total: number }>;
  bestSource: string;
  recentWins: { label: string; hookSource: string; engagement: number }[];
} {
  const state = loadABTracking();

  const sourceWinRates: Record<string, { winRate: number; total: number }> = {};
  let bestSource = 'template';
  let bestWinRate = 0;

  Object.entries(state.sourceWinRates).forEach(([source, data]) => {
    const winRate = data.total > 0 ? Math.round((data.wins / data.total) * 100) : 0;
    sourceWinRates[source] = { winRate, total: data.total };
    if (winRate > bestWinRate && data.total >= 3) {
      bestWinRate = winRate;
      bestSource = source;
    }
  });

  const recentWins = state.wins.slice(-5).reverse().map(w => ({
    label: w.label,
    hookSource: w.hookSource,
    engagement: w.engagementRate,
  }));

  return {
    totalTests: state.wins.length,
    sourceWinRates,
    bestSource,
    recentWins,
  };
}

/**
 * Get recommended source based on win history
 * Returns the hook source type that should be weighted higher
 */
export function getRecommendedSource(category?: string): string {
  const state = loadABTracking();

  if (category) {
    // Filter by category
    const categoryWins = state.wins.filter(w => w.category === category);
    const sourceStats: Record<string, { total: number; avgEngagement: number }> = {};

    categoryWins.forEach(w => {
      if (!sourceStats[w.hookSource]) sourceStats[w.hookSource] = { total: 0, avgEngagement: 0 };
      sourceStats[w.hookSource].total++;
      sourceStats[w.hookSource].avgEngagement =
        (sourceStats[w.hookSource].avgEngagement * (sourceStats[w.hookSource].total - 1) + w.engagementRate) /
        sourceStats[w.hookSource].total;
    });

    let best = 'template';
    let bestAvg = 0;
    Object.entries(sourceStats).forEach(([source, stats]) => {
      if (stats.avgEngagement > bestAvg && stats.total >= 2) {
        bestAvg = stats.avgEngagement;
        best = source;
      }
    });

    return best;
  }

  // Global recommendation
  const stats = getABStats();
  return stats.bestSource;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
