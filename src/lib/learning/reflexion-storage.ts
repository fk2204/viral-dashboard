import * as fs from 'fs';
import * as path from 'path';
import {
  SelfCritique,
  ReflexionInsight,
  ScoringAdjustment,
} from '@/types';

// ============================================================
// SERVER-SIDE REFLEXION STORAGE (File-based)
// ============================================================

const STORAGE_DIR = path.join(process.cwd(), 'src', 'lib', 'learning', 'reflexion-data');
const CRITIQUES_PATH = path.join(STORAGE_DIR, 'critiques.json');
const INSIGHTS_PATH = path.join(STORAGE_DIR, 'insights.json');
const ADJUSTMENTS_PATH = path.join(STORAGE_DIR, 'adjustments.json');

// Ensure storage directory exists
function ensureStorageDir(): void {
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }
}

// ============================================================
// CRITIQUES
// ============================================================

function loadCritiques(): SelfCritique[] {
  try {
    ensureStorageDir();
    const raw = fs.readFileSync(CRITIQUES_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveCritiques(critiques: SelfCritique[]): void {
  ensureStorageDir();
  fs.writeFileSync(CRITIQUES_PATH, JSON.stringify(critiques, null, 2), 'utf-8');
}

export function saveCritique(critique: SelfCritique): void {
  const critiques = loadCritiques();
  critiques.push(critique);
  saveCritiques(critiques);
}

export function getCritiques(limit: number = 50): SelfCritique[] {
  const critiques = loadCritiques();
  return critiques
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}

export function getCritiquesByConcept(conceptId: string): SelfCritique[] {
  const critiques = loadCritiques();
  return critiques.filter(c => c.conceptId === conceptId);
}

export function getUnappliedCritiques(): SelfCritique[] {
  const critiques = loadCritiques();
  return critiques.filter(c => !c.appliedAt);
}

export function updateCritique(critiqueId: string, updates: Partial<SelfCritique>): void {
  const critiques = loadCritiques();
  const index = critiques.findIndex(c => c.id === critiqueId);
  if (index !== -1) {
    critiques[index] = { ...critiques[index], ...updates };
    saveCritiques(critiques);
  }
}

// ============================================================
// INSIGHTS
// ============================================================

function loadInsights(): ReflexionInsight[] {
  try {
    ensureStorageDir();
    const raw = fs.readFileSync(INSIGHTS_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveInsights(insights: ReflexionInsight[]): void {
  ensureStorageDir();
  fs.writeFileSync(INSIGHTS_PATH, JSON.stringify(insights, null, 2), 'utf-8');
}

export function saveInsight(insight: ReflexionInsight): void {
  const insights = loadInsights();
  const existingIndex = insights.findIndex(i => i.pattern === insight.pattern);

  if (existingIndex !== -1) {
    insights[existingIndex] = insight;
  } else {
    insights.push(insight);
  }

  saveInsights(insights);
}

export function getInsights(category?: string): ReflexionInsight[] {
  const insights = loadInsights();
  if (category) {
    return insights.filter(i => i.category === category);
  }
  return insights.sort((a, b) => new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime());
}

export function getInsightsByPattern(pattern: string): ReflexionInsight | undefined {
  const insights = loadInsights();
  return insights.find(i => i.pattern === pattern);
}

// ============================================================
// ADJUSTMENTS
// ============================================================

function loadAdjustments(): ScoringAdjustment[] {
  try {
    ensureStorageDir();
    const raw = fs.readFileSync(ADJUSTMENTS_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveAdjustmentsData(adjustments: ScoringAdjustment[]): void {
  ensureStorageDir();
  fs.writeFileSync(ADJUSTMENTS_PATH, JSON.stringify(adjustments, null, 2), 'utf-8');
}

export function saveAdjustment(adjustment: ScoringAdjustment): void {
  const adjustments = loadAdjustments();
  adjustments.push(adjustment);
  saveAdjustmentsData(adjustments);
}

export function getAdjustments(limit: number = 50): ScoringAdjustment[] {
  const adjustments = loadAdjustments();
  return adjustments
    .sort((a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime())
    .slice(0, limit);
}

export function getAdjustmentsByCategory(category: string): ScoringAdjustment[] {
  const adjustments = loadAdjustments();
  return adjustments.filter(a => a.category === category);
}

// ============================================================
// STATS
// ============================================================

export function getReflexionStats(): {
  totalCritiques: number;
  totalInsights: number;
  totalAdjustments: number;
  recentCritiques: number;
} {
  const critiques = loadCritiques();
  const insights = loadInsights();
  const adjustments = loadAdjustments();

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const recentCritiques = critiques.filter(c => {
    const createdAt = new Date(c.createdAt);
    return createdAt >= weekAgo;
  }).length;

  return {
    totalCritiques: critiques.length,
    totalInsights: insights.length,
    totalAdjustments: adjustments.length,
    recentCritiques,
  };
}
