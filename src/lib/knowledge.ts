import * as fs from 'fs';
import * as path from 'path';

// ============================================================
// KNOWLEDGE BASE TYPES
// ============================================================

export interface KnowledgeBase {
  hooks: HookPattern[];
  vocabulary: VocabEntry[];
  styles: StyleInsight[];
  patterns: ContentPattern[];
  meta: {
    lastUpdated: string;
    version: number;
    totalLearningCycles: number;
  };
}

export interface HookPattern {
  id: string;
  formula: string;           // e.g., "POV: {topic} but {twist}"
  category: string[];         // which categories it works for
  effectiveness: number;      // 0-100 score
  examples: string[];         // real examples
  source: string;             // where we learned this
  platforms: string[];        // ['tiktok', 'youtube-shorts']
  addedAt: string;
}

export interface VocabEntry {
  term: string;               // e.g., "no cap", "on god", "ate"
  usage: string;              // how to use it
  relevance: number;          // 0-100, decays over time
  platforms: string[];        // which platforms it's used on
  addedAt: string;
}

export interface StyleInsight {
  category: string;
  tips: string[];
  bestPractices: string[];
  avoidList: string[];
  platforms: {
    tiktok: string[];
    youtubeShorts: string[];
  };
  updatedAt: string;
}

export interface ContentPattern {
  id: string;
  name: string;               // e.g., "hook-tension-payoff"
  structure: string[];         // ordered steps
  bestFor: string[];           // categories
  platforms: string[];
  effectiveness: number;
  examples: string[];
  addedAt: string;
}

// ============================================================
// KNOWLEDGE BASE PATH
// ============================================================
const KB_PATH = path.join(process.cwd(), 'src', 'lib', 'knowledge-base.json');

// ============================================================
// READ / WRITE
// ============================================================
export function loadKnowledgeBase(): KnowledgeBase {
  try {
    const raw = fs.readFileSync(KB_PATH, 'utf-8');
    return JSON.parse(raw) as KnowledgeBase;
  } catch {
    // Return empty KB if file doesn't exist or is corrupt
    return {
      hooks: [],
      vocabulary: [],
      styles: [],
      patterns: [],
      meta: {
        lastUpdated: new Date().toISOString(),
        version: 1,
        totalLearningCycles: 0,
      },
    };
  }
}

export function saveKnowledgeBase(kb: KnowledgeBase): void {
  kb.meta.lastUpdated = new Date().toISOString();
  fs.writeFileSync(KB_PATH, JSON.stringify(kb, null, 2), 'utf-8');
}

// ============================================================
// QUERY FUNCTIONS
// ============================================================
export function getHooksForCategory(category: string, limit: number = 5): HookPattern[] {
  const kb = loadKnowledgeBase();
  return kb.hooks
    .filter(h => h.category.includes(category) || h.category.includes('all'))
    .sort((a, b) => b.effectiveness - a.effectiveness)
    .slice(0, limit);
}

export function getHooksForPlatform(platform: string, limit: number = 5): HookPattern[] {
  const kb = loadKnowledgeBase();
  return kb.hooks
    .filter(h => h.platforms.includes(platform))
    .sort((a, b) => b.effectiveness - a.effectiveness)
    .slice(0, limit);
}

export function getTrendingVocab(limit: number = 10): VocabEntry[] {
  const kb = loadKnowledgeBase();
  return kb.vocabulary
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, limit);
}

export function getStyleForCategory(category: string): StyleInsight | undefined {
  const kb = loadKnowledgeBase();
  return kb.styles.find(s => s.category === category);
}

export function getPatterns(category?: string): ContentPattern[] {
  const kb = loadKnowledgeBase();
  if (!category) return kb.patterns;
  return kb.patterns.filter(p => p.bestFor.includes(category) || p.bestFor.includes('all'));
}

export function addHookPattern(hook: HookPattern): void {
  const kb = loadKnowledgeBase();
  // Check for duplicate formula
  const exists = kb.hooks.some(h => h.formula === hook.formula);
  if (!exists) {
    kb.hooks.push(hook);
    saveKnowledgeBase(kb);
  }
}

export function updateVocabRelevance(term: string, newRelevance: number): void {
  const kb = loadKnowledgeBase();
  const entry = kb.vocabulary.find(v => v.term === term);
  if (entry) {
    entry.relevance = Math.min(100, Math.max(0, newRelevance));
    saveKnowledgeBase(kb);
  }
}

export function decayVocabRelevance(decayRate: number = 2): void {
  const kb = loadKnowledgeBase();
  kb.vocabulary.forEach(v => {
    v.relevance = Math.max(0, v.relevance - decayRate);
  });
  // Remove entries that hit 0
  kb.vocabulary = kb.vocabulary.filter(v => v.relevance > 0);
  saveKnowledgeBase(kb);
}
