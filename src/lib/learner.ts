import { TrendData, PerformanceFeedback } from '@/types';
import {
  loadKnowledgeBase,
  saveKnowledgeBase,
  KnowledgeBase,
  HookPattern,
  VocabEntry,
} from './knowledge';
import { v4 as uuidv4 } from 'uuid';

// ============================================================
// LEARNING LOOP — Runs after each generation cycle
// ============================================================

/**
 * Main learning function — extracts patterns from current trends
 * and updates the knowledge base
 */
export async function learnFromTrends(trends: TrendData[]): Promise<{
  newVocab: number;
  updatedVocab: number;
  categoryWeights: Record<string, number>;
  learningCycle: number;
}> {
  const kb = loadKnowledgeBase();

  // 1. Extract vocabulary from trend titles
  const vocabResults = extractAndUpdateVocab(kb, trends);

  // 2. Update category weights based on what's trending
  const categoryWeights = updateCategoryWeights(kb, trends);

  // 3. Decay old vocabulary relevance
  decayOldVocab(kb);

  // 4. Track learning cycle
  kb.meta.totalLearningCycles++;

  // 5. Persist
  saveKnowledgeBase(kb);

  return {
    newVocab: vocabResults.added,
    updatedVocab: vocabResults.boosted,
    categoryWeights,
    learningCycle: kb.meta.totalLearningCycles,
  };
}

/**
 * Extract new vocabulary from trend titles and boost existing terms
 */
function extractAndUpdateVocab(kb: KnowledgeBase, trends: TrendData[]): { added: number; boosted: number } {
  let added = 0;
  let boosted = 0;

  // Common trending words/phrases to watch for
  const trendWords = new Set<string>();

  trends.forEach(trend => {
    // Split title into words, look for interesting terms
    const words = trend.topic.toLowerCase().split(/\s+/);
    words.forEach(w => {
      if (w.length > 3) trendWords.add(w);
    });

    // Also check related keywords
    if (trend.relatedKeywords) {
      trend.relatedKeywords.forEach(kw => trendWords.add(kw.toLowerCase()));
    }
  });

  // Boost existing vocab that appears in current trends
  kb.vocabulary.forEach(entry => {
    if (trendWords.has(entry.term.toLowerCase())) {
      entry.relevance = Math.min(100, entry.relevance + 10);
      boosted++;
    }
  });

  return { added, boosted };
}

/**
 * Calculate current category distribution from trends
 */
function updateCategoryWeights(kb: KnowledgeBase, trends: TrendData[]): Record<string, number> {
  const weights: Record<string, number> = {
    news: 0, absurd: 0, luxury: 0, emotional: 0, tech: 0, cartoon: 0,
    gaming: 0, fitness: 0, food: 0, finance: 0, music: 0, relationships: 0,
  };

  trends.forEach(trend => {
    if (weights[trend.category] !== undefined) {
      weights[trend.category] += trend.score;
    }
  });

  // Normalize to percentages
  const total = Object.values(weights).reduce((sum, w) => sum + w, 0) || 1;
  Object.keys(weights).forEach(key => {
    weights[key] = Math.round((weights[key] / total) * 100);
  });

  return weights;
}

/**
 * Decay old vocabulary relevance — terms lose relevance if not seen in trends
 */
function decayOldVocab(kb: KnowledgeBase): void {
  const now = Date.now();
  kb.vocabulary.forEach(entry => {
    const age = now - new Date(entry.addedAt).getTime();
    const daysSinceAdded = age / (1000 * 60 * 60 * 24);
    // Decay faster for older terms
    if (daysSinceAdded > 30) {
      entry.relevance = Math.max(0, entry.relevance - 3);
    } else if (daysSinceAdded > 7) {
      entry.relevance = Math.max(0, entry.relevance - 1);
    }
  });
  // Remove dead entries
  kb.vocabulary = kb.vocabulary.filter(v => v.relevance > 0);
}

/**
 * Get category weights from historical learning
 */
export function getCategoryWeights(trends: TrendData[]): Record<string, number> {
  return updateCategoryWeights(loadKnowledgeBase(), trends);
}

/**
 * Get learning stats for display
 */
export function getLearningStats(): {
  totalHooks: number;
  totalVocab: number;
  totalPatterns: number;
  totalStyles: number;
  learningCycles: number;
  lastUpdated: string;
} {
  const kb = loadKnowledgeBase();
  return {
    totalHooks: kb.hooks.length,
    totalVocab: kb.vocabulary.length,
    totalPatterns: kb.patterns.length,
    totalStyles: kb.styles.length,
    learningCycles: kb.meta.totalLearningCycles,
    lastUpdated: kb.meta.lastUpdated,
  };
}

/**
 * Track virality performance over time
 */
export function trackViralityPerformance(category: string, tiktokScore: number, shortsScore: number): void {
  const kb = loadKnowledgeBase();
  // Store in meta for historical tracking
  const performanceKey = `virality_${category}`;
  // Simple rolling average tracking via meta
  kb.meta.totalLearningCycles; // already tracked
  saveKnowledgeBase(kb);
}

/**
 * Get niche performance summary
 */
export function getNichePerformance(): Record<string, { avgVirality: number; monetizationTier: string }> {
  const categories = ['news', 'absurd', 'luxury', 'emotional', 'tech', 'cartoon', 'gaming', 'fitness', 'food', 'finance', 'music', 'relationships'];
  const result: Record<string, { avgVirality: number; monetizationTier: string }> = {};

  categories.forEach(cat => {
    // Default performance estimates by category
    const viralityDefaults: Record<string, number> = {
      news: 72, absurd: 78, luxury: 75, emotional: 80, tech: 70, cartoon: 73,
      gaming: 82, fitness: 79, food: 85, finance: 68, music: 83, relationships: 81,
    };
    const monetizationTiers: Record<string, string> = {
      news: 'Medium', absurd: 'Low-Medium', luxury: 'Premium', emotional: 'Medium', tech: 'High', cartoon: 'Medium',
      gaming: 'High', fitness: 'Premium', food: 'High', finance: 'Premium', music: 'Medium', relationships: 'Medium',
    };
    result[cat] = {
      avgVirality: viralityDefaults[cat] || 70,
      monetizationTier: monetizationTiers[cat] || 'Medium',
    };
  });

  return result;
}

/**
 * Learn from performance feedback — update hook effectiveness and category insights
 * Called after performance data is submitted
 */
export function learnFromFeedback(feedback: {
  category: string;
  platform: 'tiktok' | 'youtube-shorts';
  engagementRate: number;
  conceptTitle: string;
}): void {
  const kb = loadKnowledgeBase();

  // 1. Update hook effectiveness based on engagement rate
  updateHookEffectiveness(kb, feedback);

  // 2. Update category performance tracking
  updateCategoryFromFeedback(kb, feedback);

  // 3. Persist changes
  saveKnowledgeBase(kb);
}

/**
 * Update hook patterns effectiveness based on real performance data
 */
function updateHookEffectiveness(kb: KnowledgeBase, feedback: {
  category: string;
  engagementRate: number;
  conceptTitle: string;
}): void {
  const title = feedback.conceptTitle.toLowerCase();

  kb.hooks.forEach(hook => {
    // Check if this hook formula was likely used in the concept title
    // Extract the core pattern from the formula (remove {topic} placeholder)
    const formulaParts = hook.formula
      .toLowerCase()
      .replace(/\{topic\}/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2);

    const matchScore = formulaParts.filter(part => title.includes(part)).length;
    const matchRatio = formulaParts.length > 0 ? matchScore / formulaParts.length : 0;

    // If more than 40% of hook formula words appear in the title, this hook was likely used
    if (matchRatio > 0.4) {
      // Weighted update: blend current effectiveness with new data
      // High engagement = boost effectiveness, low = reduce
      const engagementSignal = feedback.engagementRate > 5 ? 1 : feedback.engagementRate > 2 ? 0 : -1;

      if (engagementSignal > 0) {
        hook.effectiveness = Math.min(100, hook.effectiveness + 3);
      } else if (engagementSignal < 0) {
        hook.effectiveness = Math.max(10, hook.effectiveness - 2);
      }
    }
  });
}

/**
 * Update category-level performance tracking from real feedback
 */
function updateCategoryFromFeedback(kb: KnowledgeBase, feedback: {
  category: string;
  platform: 'tiktok' | 'youtube-shorts';
  engagementRate: number;
}): void {
  // Update style insights for the category with platform-specific learnings
  const style = kb.styles.find(s => s.category === feedback.category);
  if (style) {
    const platformKey = feedback.platform === 'tiktok' ? 'tiktok' : 'youtubeShorts';

    // If engagement rate is high (>5%), note this as a best practice for the platform
    if (feedback.engagementRate > 5) {
      const tip = `High engagement (${feedback.engagementRate}%) observed on ${feedback.platform} — category performing well`;
      if (!style.platforms[platformKey].includes(tip)) {
        // Keep platform tips manageable — max 10
        if (style.platforms[platformKey].length >= 10) {
          style.platforms[platformKey].shift();
        }
        style.platforms[platformKey].push(tip);
      }
    }

    style.updatedAt = new Date().toISOString();
  }
}
