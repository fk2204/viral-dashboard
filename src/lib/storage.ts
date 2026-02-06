import Dexie, { type EntityTable } from 'dexie';
import { Generation, SelfCritique, ReflexionInsight, ScoringAdjustment } from '@/types';

const db = new Dexie('ViralDashboard') as Dexie & {
  generations: EntityTable<Generation, 'id'>;
  critiques: EntityTable<SelfCritique, 'id'>;
  insights: EntityTable<ReflexionInsight, 'id'>;
  adjustments: EntityTable<ScoringAdjustment, 'id'>;
};

db.version(1).stores({
  generations: 'id, date, isFavorite',
});

db.version(2).stores({
  generations: 'id, date, isFavorite',
  critiques: 'id, conceptId, createdAt, appliedAt',
  insights: 'id, category, platform, discoveredAt, appliedToScoring',
  adjustments: 'id, category, adjustmentType, appliedAt, critiqueId',
});

export async function saveGeneration(generation: Generation): Promise<void> {
  await db.generations.put(generation);
}

export async function getGenerations(): Promise<Generation[]> {
  return db.generations.orderBy('date').reverse().toArray();
}

export async function getGeneration(id: string): Promise<Generation | undefined> {
  return db.generations.get(id);
}

export async function deleteGeneration(id: string): Promise<void> {
  await db.generations.delete(id);
}

export async function toggleFavorite(id: string): Promise<void> {
  const generation = await db.generations.get(id);
  if (generation) {
    await db.generations.update(id, { isFavorite: !generation.isFavorite });
  }
}

export async function getFavorites(): Promise<Generation[]> {
  return db.generations.where('isFavorite').equals(1).toArray();
}

export async function searchGenerations(query: string): Promise<Generation[]> {
  const allGenerations = await getGenerations();
  const lowerQuery = query.toLowerCase();

  return allGenerations.filter(gen =>
    gen.concepts.some(concept =>
      concept.title.toLowerCase().includes(lowerQuery) ||
      concept.caption.toLowerCase().includes(lowerQuery) ||
      concept.hashtags.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
      concept.trendSource.toLowerCase().includes(lowerQuery)
    ) ||
    gen.trends.some(trend =>
      trend.topic.toLowerCase().includes(lowerQuery)
    )
  );
}

export async function getGenerationsByDateRange(
  startDate: string,
  endDate: string
): Promise<Generation[]> {
  return db.generations
    .where('date')
    .between(startDate, endDate, true, true)
    .reverse()
    .toArray();
}

export async function getAnalyticsData(): Promise<{
  totalGenerations: number;
  totalConcepts: number;
  categoryBreakdown: Record<string, number>;
  trendFrequency: Record<string, number>;
  dailyGenerations: Record<string, number>;
}> {
  const generations = await getGenerations();

  const categoryBreakdown: Record<string, number> = {
    news: 0,
    absurd: 0,
    luxury: 0,
    emotional: 0,
    tech: 0,
    cartoon: 0,
  };

  const trendFrequency: Record<string, number> = {};
  const dailyGenerations: Record<string, number> = {};

  let totalConcepts = 0;

  generations.forEach(gen => {
    const dateKey = gen.date.split('T')[0];
    dailyGenerations[dateKey] = (dailyGenerations[dateKey] || 0) + 1;

    gen.concepts.forEach(concept => {
      totalConcepts++;
      categoryBreakdown[concept.category]++;
    });

    gen.trends.forEach(trend => {
      trendFrequency[trend.topic] = (trendFrequency[trend.topic] || 0) + 1;
    });
  });

  return {
    totalGenerations: generations.length,
    totalConcepts,
    categoryBreakdown,
    trendFrequency,
    dailyGenerations,
  };
}

// ============================================================
// REFLEXION SYSTEM STORAGE
// ============================================================

export async function saveCritique(critique: SelfCritique): Promise<void> {
  await db.critiques.put(critique);
}

export async function getCritiques(limit: number = 50): Promise<SelfCritique[]> {
  return db.critiques.orderBy('createdAt').reverse().limit(limit).toArray();
}

export async function getCritiquesByConcept(conceptId: string): Promise<SelfCritique[]> {
  return db.critiques.where('conceptId').equals(conceptId).toArray();
}

export async function getUnappliedCritiques(): Promise<SelfCritique[]> {
  return db.critiques.filter(c => !c.appliedAt).toArray();
}

export async function saveInsight(insight: ReflexionInsight): Promise<void> {
  await db.insights.put(insight);
}

export async function getInsights(category?: string): Promise<ReflexionInsight[]> {
  if (category) {
    return db.insights.where('category').equals(category).toArray();
  }
  return db.insights.orderBy('lastSeenAt').reverse().toArray();
}

export async function getInsightsByPattern(pattern: string): Promise<ReflexionInsight | undefined> {
  return db.insights.filter(i => i.pattern === pattern).first();
}

export async function saveAdjustment(adjustment: ScoringAdjustment): Promise<void> {
  await db.adjustments.put(adjustment);
}

export async function getAdjustments(limit: number = 50): Promise<ScoringAdjustment[]> {
  return db.adjustments.orderBy('appliedAt').reverse().limit(limit).toArray();
}

export async function getAdjustmentsByCategory(category: string): Promise<ScoringAdjustment[]> {
  return db.adjustments.where('category').equals(category).toArray();
}

export async function getReflexionStats(): Promise<{
  totalCritiques: number;
  totalInsights: number;
  totalAdjustments: number;
  recentCritiques: number;
}> {
  const totalCritiques = await db.critiques.count();
  const totalInsights = await db.insights.count();
  const totalAdjustments = await db.adjustments.count();

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const recentCritiques = await db.critiques
    .where('createdAt')
    .above(weekAgo.toISOString())
    .count();

  return {
    totalCritiques,
    totalInsights,
    totalAdjustments,
    recentCritiques,
  };
}

export { db };
