/**
 * Storage Layer - PostgreSQL with Prisma
 *
 * Backward-compatible API with existing Dexie storage
 * Provides tenant-scoped data access for multi-tenant SaaS
 */

import { db } from "@/lib/db";
import type {
  Generation,
  SelfCritique,
  ReflexionInsight,
  ScoringAdjustment,
  PerformanceFeedback,
  Category,
} from "@/types";
import type { Prisma } from "@prisma/client";

/**
 * Tenant context - should be set from auth middleware
 */
let currentTenantId: string | null = null;

export function setTenantContext(tenantId: string): void {
  currentTenantId = tenantId;
}

export function getTenantContext(): string {
  if (!currentTenantId) {
    throw new Error("Tenant context not set. Call setTenantContext() first.");
  }
  return currentTenantId;
}

// ============================================================
// GENERATION STORAGE (Backward compatible with Dexie API)
// ============================================================

export async function saveGeneration(generation: Generation): Promise<void> {
  const tenantId = getTenantContext();

  await db.generation.upsert({
    where: { id: generation.id },
    update: {
      date: new Date(generation.date),
      concepts: generation.concepts as Prisma.JsonArray,
      trends: generation.trends as Prisma.JsonArray,
      isFavorite: generation.isFavorite,
    },
    create: {
      id: generation.id,
      tenantId,
      date: new Date(generation.date),
      concepts: generation.concepts as Prisma.JsonArray,
      trends: generation.trends as Prisma.JsonArray,
      isFavorite: generation.isFavorite,
    },
  });

  // Update tenant quota usage
  await db.tenant.update({
    where: { id: tenantId },
    data: {
      usedQuota: {
        increment: generation.concepts.length,
      },
    },
  });
}

export async function getGenerations(): Promise<Generation[]> {
  const tenantId = getTenantContext();

  const records = await db.generation.findMany({
    where: { tenantId },
    orderBy: { date: "desc" },
  });

  return records.map(record => ({
    id: record.id,
    date: record.date.toISOString(),
    concepts: record.concepts as any,
    trends: record.trends as any,
    isFavorite: record.isFavorite,
  }));
}

export async function getGeneration(id: string): Promise<Generation | undefined> {
  const tenantId = getTenantContext();

  const record = await db.generation.findFirst({
    where: { id, tenantId },
  });

  if (!record) {
    return undefined;
  }

  return {
    id: record.id,
    date: record.date.toISOString(),
    concepts: record.concepts as any,
    trends: record.trends as any,
    isFavorite: record.isFavorite,
  };
}

export async function deleteGeneration(id: string): Promise<void> {
  const tenantId = getTenantContext();

  await db.generation.delete({
    where: { id, tenantId },
  });
}

export async function toggleFavorite(id: string): Promise<void> {
  const tenantId = getTenantContext();

  const generation = await db.generation.findFirst({
    where: { id, tenantId },
  });

  if (generation) {
    await db.generation.update({
      where: { id },
      data: { isFavorite: !generation.isFavorite },
    });
  }
}

export async function getFavorites(): Promise<Generation[]> {
  const tenantId = getTenantContext();

  const records = await db.generation.findMany({
    where: { tenantId, isFavorite: true },
    orderBy: { date: "desc" },
  });

  return records.map(record => ({
    id: record.id,
    date: record.date.toISOString(),
    concepts: record.concepts as any,
    trends: record.trends as any,
    isFavorite: record.isFavorite,
  }));
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
  const tenantId = getTenantContext();

  const records = await db.generation.findMany({
    where: {
      tenantId,
      date: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
    },
    orderBy: { date: "desc" },
  });

  return records.map(record => ({
    id: record.id,
    date: record.date.toISOString(),
    concepts: record.concepts as any,
    trends: record.trends as any,
    isFavorite: record.isFavorite,
  }));
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
    gaming: 0,
    fitness: 0,
    food: 0,
    finance: 0,
    music: 0,
    relationships: 0,
  };

  const trendFrequency: Record<string, number> = {};
  const dailyGenerations: Record<string, number> = {};

  let totalConcepts = 0;

  generations.forEach(gen => {
    const dateKey = gen.date.split("T")[0];
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
  const tenantId = getTenantContext();

  await db.selfCritique.create({
    data: {
      id: critique.id,
      tenantId,
      conceptId: critique.conceptId,
      performanceGap: critique.performanceGap as Prisma.JsonObject,
      critique: critique.critique,
      hypothesizedReasons: critique.hypothesizedReasons as Prisma.JsonArray,
      scoringIssues: critique.scoringIssues as Prisma.JsonArray,
      adjustmentPlan: critique.adjustmentPlan,
      confidenceLevel: critique.confidenceLevel,
      createdAt: new Date(critique.createdAt),
      appliedAt: critique.appliedAt ? new Date(critique.appliedAt) : null,
    },
  });
}

export async function getCritiques(limit: number = 50): Promise<SelfCritique[]> {
  const tenantId = getTenantContext();

  const records = await db.selfCritique.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return records.map(record => ({
    id: record.id,
    conceptId: record.conceptId,
    performanceGap: record.performanceGap as any,
    critique: record.critique,
    hypothesizedReasons: record.hypothesizedReasons as any,
    scoringIssues: record.scoringIssues as any,
    adjustmentPlan: record.adjustmentPlan,
    confidenceLevel: record.confidenceLevel as any,
    createdAt: record.createdAt.toISOString(),
    appliedAt: record.appliedAt?.toISOString(),
  }));
}

export async function getCritiquesByConcept(conceptId: string): Promise<SelfCritique[]> {
  const tenantId = getTenantContext();

  const records = await db.selfCritique.findMany({
    where: { tenantId, conceptId },
    orderBy: { createdAt: "desc" },
  });

  return records.map(record => ({
    id: record.id,
    conceptId: record.conceptId,
    performanceGap: record.performanceGap as any,
    critique: record.critique,
    hypothesizedReasons: record.hypothesizedReasons as any,
    scoringIssues: record.scoringIssues as any,
    adjustmentPlan: record.adjustmentPlan,
    confidenceLevel: record.confidenceLevel as any,
    createdAt: record.createdAt.toISOString(),
    appliedAt: record.appliedAt?.toISOString(),
  }));
}

export async function getUnappliedCritiques(): Promise<SelfCritique[]> {
  const tenantId = getTenantContext();

  const records = await db.selfCritique.findMany({
    where: { tenantId, appliedAt: null },
    orderBy: { createdAt: "desc" },
  });

  return records.map(record => ({
    id: record.id,
    conceptId: record.conceptId,
    performanceGap: record.performanceGap as any,
    critique: record.critique,
    hypothesizedReasons: record.hypothesizedReasons as any,
    scoringIssues: record.scoringIssues as any,
    adjustmentPlan: record.adjustmentPlan,
    confidenceLevel: record.confidenceLevel as any,
    createdAt: record.createdAt.toISOString(),
    appliedAt: record.appliedAt?.toISOString(),
  }));
}

export async function saveInsight(insight: ReflexionInsight): Promise<void> {
  const tenantId = getTenantContext();

  await db.reflexionInsight.upsert({
    where: {
      tenantId_category_platform_pattern: {
        tenantId,
        category: insight.category,
        platform: insight.platform,
        pattern: insight.pattern,
      },
    },
    update: {
      evidenceCount: insight.evidenceCount,
      impact: insight.impact,
      recommendation: insight.recommendation,
      appliedToScoring: insight.appliedToScoring,
      lastSeenAt: new Date(insight.lastSeenAt),
    },
    create: {
      id: insight.id,
      tenantId,
      category: insight.category,
      platform: insight.platform,
      pattern: insight.pattern,
      evidenceCount: insight.evidenceCount,
      impact: insight.impact,
      recommendation: insight.recommendation,
      appliedToScoring: insight.appliedToScoring,
      discoveredAt: new Date(insight.discoveredAt),
      lastSeenAt: new Date(insight.lastSeenAt),
    },
  });
}

export async function getInsights(category?: string): Promise<ReflexionInsight[]> {
  const tenantId = getTenantContext();

  const records = await db.reflexionInsight.findMany({
    where: {
      tenantId,
      ...(category ? { category } : {}),
    },
    orderBy: { lastSeenAt: "desc" },
  });

  return records.map(record => ({
    id: record.id,
    category: record.category as Category,
    platform: record.platform as any,
    pattern: record.pattern,
    evidenceCount: record.evidenceCount,
    impact: record.impact as any,
    recommendation: record.recommendation,
    appliedToScoring: record.appliedToScoring,
    discoveredAt: record.discoveredAt.toISOString(),
    lastSeenAt: record.lastSeenAt.toISOString(),
  }));
}

export async function getInsightsByPattern(pattern: string): Promise<ReflexionInsight | undefined> {
  const tenantId = getTenantContext();

  const record = await db.reflexionInsight.findFirst({
    where: { tenantId, pattern },
  });

  if (!record) {
    return undefined;
  }

  return {
    id: record.id,
    category: record.category as Category,
    platform: record.platform as any,
    pattern: record.pattern,
    evidenceCount: record.evidenceCount,
    impact: record.impact as any,
    recommendation: record.recommendation,
    appliedToScoring: record.appliedToScoring,
    discoveredAt: record.discoveredAt.toISOString(),
    lastSeenAt: record.lastSeenAt.toISOString(),
  };
}

export async function saveAdjustment(adjustment: ScoringAdjustment): Promise<void> {
  const tenantId = getTenantContext();

  await db.scoringAdjustment.create({
    data: {
      id: adjustment.id,
      tenantId,
      critiqueId: adjustment.critiqueId,
      category: adjustment.category,
      adjustmentType: adjustment.adjustmentType,
      oldValue: adjustment.oldValue,
      newValue: adjustment.newValue,
      reason: adjustment.reason,
      appliedAt: new Date(adjustment.appliedAt),
    },
  });
}

export async function getAdjustments(limit: number = 50): Promise<ScoringAdjustment[]> {
  const tenantId = getTenantContext();

  const records = await db.scoringAdjustment.findMany({
    where: { tenantId },
    orderBy: { appliedAt: "desc" },
    take: limit,
  });

  return records.map(record => ({
    id: record.id,
    category: record.category as Category,
    adjustmentType: record.adjustmentType as any,
    oldValue: Number(record.oldValue),
    newValue: Number(record.newValue),
    reason: record.reason,
    critiqueId: record.critiqueId,
    appliedAt: record.appliedAt.toISOString(),
  }));
}

export async function getAdjustmentsByCategory(category: string): Promise<ScoringAdjustment[]> {
  const tenantId = getTenantContext();

  const records = await db.scoringAdjustment.findMany({
    where: { tenantId, category },
    orderBy: { appliedAt: "desc" },
  });

  return records.map(record => ({
    id: record.id,
    category: record.category as Category,
    adjustmentType: record.adjustmentType as any,
    oldValue: Number(record.oldValue),
    newValue: Number(record.newValue),
    reason: record.reason,
    critiqueId: record.critiqueId,
    appliedAt: record.appliedAt.toISOString(),
  }));
}

export async function getReflexionStats(): Promise<{
  totalCritiques: number;
  totalInsights: number;
  totalAdjustments: number;
  recentCritiques: number;
}> {
  const tenantId = getTenantContext();

  const totalCritiques = await db.selfCritique.count({
    where: { tenantId },
  });

  const totalInsights = await db.reflexionInsight.count({
    where: { tenantId },
  });

  const totalAdjustments = await db.scoringAdjustment.count({
    where: { tenantId },
  });

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const recentCritiques = await db.selfCritique.count({
    where: {
      tenantId,
      createdAt: {
        gte: weekAgo,
      },
    },
  });

  return {
    totalCritiques,
    totalInsights,
    totalAdjustments,
    recentCritiques,
  };
}

// ============================================================
// PERFORMANCE FEEDBACK STORAGE
// ============================================================

export async function savePerformanceFeedback(feedback: PerformanceFeedback): Promise<void> {
  const tenantId = getTenantContext();

  await db.performanceFeedback.create({
    data: {
      id: feedback.id,
      tenantId,
      conceptId: feedback.conceptId,
      conceptTitle: feedback.conceptTitle,
      category: feedback.category,
      platform: feedback.platform,
      variantId: feedback.variantId,
      views: feedback.metrics.views,
      likes: feedback.metrics.likes,
      shares: feedback.metrics.shares,
      comments: feedback.metrics.comments,
      engagementRate: feedback.engagementRate,
      reportedAt: new Date(feedback.reportedAt),
      dataSource: "manual",
    },
  });
}

export async function getPerformanceFeedback(limit: number = 100): Promise<PerformanceFeedback[]> {
  const tenantId = getTenantContext();

  const records = await db.performanceFeedback.findMany({
    where: { tenantId },
    orderBy: { reportedAt: "desc" },
    take: limit,
  });

  return records.map(record => ({
    id: record.id,
    conceptId: record.conceptId,
    conceptTitle: record.conceptTitle,
    category: record.category as Category,
    platform: record.platform as any,
    variantId: record.variantId ?? undefined,
    metrics: {
      views: record.views,
      likes: record.likes,
      shares: record.shares,
      comments: record.comments,
    },
    engagementRate: Number(record.engagementRate),
    reportedAt: record.reportedAt.toISOString(),
  }));
}
