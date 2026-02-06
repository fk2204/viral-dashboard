import {
  PerformanceGap,
  SelfCritique,
  ReflexionInsight,
  ScoringAdjustment,
  ViralConcept,
  PerformanceFeedback,
  Category,
} from "@/types";
import { v4 as uuidv4 } from "uuid";
import {
  saveCritique,
  saveInsight,
  saveAdjustment,
  getCritiquesByConcept,
  getInsightsByPattern,
  updateCritique,
} from "./reflexion-storage";
import { loadKnowledgeBase, saveKnowledgeBase, KnowledgeBase } from "../knowledge";
import Anthropic from "@anthropic-ai/sdk";

// ============================================================
// REFLEXION SYSTEM — Self-Critique & Autonomous Learning
// ============================================================

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

/**
 * Main reflexion function — analyze performance gap and generate self-critique
 */
export async function reflectOnPerformance(
  concept: ViralConcept,
  feedback: PerformanceFeedback
): Promise<SelfCritique> {
  // 1. Calculate performance gap
  const gap = calculatePerformanceGap(concept, feedback);

  // 2. Check if we already critiqued this concept
  const existingCritiques = await getCritiquesByConcept(concept.id);
  if (existingCritiques.length > 0) {
    console.log(`Concept ${concept.id} already critiqued, skipping...`);
    return existingCritiques[0];
  }

  // 3. Generate self-critique using Claude API
  const critiqueText = await generateSelfCritique(concept, gap);

  // 4. Parse critique into structured data
  const critique: SelfCritique = {
    id: uuidv4(),
    conceptId: concept.id,
    performanceGap: gap,
    critique: critiqueText.critique,
    hypothesizedReasons: critiqueText.reasons,
    scoringIssues: critiqueText.scoringIssues,
    adjustmentPlan: critiqueText.adjustmentPlan,
    confidenceLevel: critiqueText.confidence,
    createdAt: new Date().toISOString(),
  };

  // 5. Save critique
  await saveCritique(critique);

  // 6. Extract insights
  await extractInsights(critique);

  // 7. Auto-apply adjustments (if confidence is high)
  if (critique.confidenceLevel === 'high' && Math.abs(gap.gap) > 20) {
    await applyAdjustments(critique);
  }

  return critique;
}

/**
 * Calculate performance gap between predicted and actual
 */
function calculatePerformanceGap(
  concept: ViralConcept,
  feedback: PerformanceFeedback
): PerformanceGap {
  const predictedVirality = concept.platformVirality
    ? feedback.platform === 'tiktok'
      ? concept.platformVirality.tiktok.score
      : concept.platformVirality.youtubeShorts.score
    : 70; // fallback

  // Convert engagement rate to virality score (0-100 scale)
  const actualViralityScore = engagementToViralityScore(feedback.engagementRate);

  const gap = predictedVirality - actualViralityScore;
  const gapPercentage = predictedVirality > 0
    ? Math.round((gap / predictedVirality) * 100)
    : 0;

  let direction: 'over-predicted' | 'under-predicted' | 'accurate' = 'accurate';
  if (Math.abs(gapPercentage) > 20) {
    direction = gap > 0 ? 'over-predicted' : 'under-predicted';
  }

  return {
    conceptId: concept.id,
    conceptTitle: concept.title,
    category: concept.category,
    platform: feedback.platform,
    predictedVirality,
    actualEngagement: feedback.engagementRate,
    actualViralityScore,
    gap,
    gapPercentage,
    direction,
  };
}

/**
 * Convert engagement rate (%) to virality score (0-100)
 */
function engagementToViralityScore(engagementRate: number): number {
  // Mapping:
  // 0% -> 10 (very poor)
  // 2% -> 40 (below average)
  // 5% -> 70 (good)
  // 10% -> 90 (viral)
  // 15%+ -> 100 (mega viral)

  if (engagementRate <= 0) return 10;
  if (engagementRate <= 2) return 10 + engagementRate * 15;
  if (engagementRate <= 5) return 40 + (engagementRate - 2) * 10;
  if (engagementRate <= 10) return 70 + (engagementRate - 5) * 4;
  return Math.min(100, 90 + (engagementRate - 10) * 2);
}

/**
 * Generate self-critique using Claude API
 */
async function generateSelfCritique(
  concept: ViralConcept,
  gap: PerformanceGap
): Promise<{
  critique: string;
  reasons: string[];
  scoringIssues: string[];
  adjustmentPlan: string;
  confidence: 'low' | 'medium' | 'high';
}> {
  const prompt = `You are an AI system that generates viral TikTok/YouTube Shorts concepts. You just made a prediction that was ${gap.direction}. Analyze why and how to improve.

## Concept Generated
- Title: "${gap.conceptTitle}"
- Category: ${gap.category}
- Platform: ${gap.platform}
- Predicted Virality Score: ${gap.predictedVirality}/100
- Actual Engagement Rate: ${gap.actualEngagement}%
- Actual Virality Score: ${gap.actualViralityScore}/100
- Gap: ${gap.gap} (${gap.gapPercentage}% ${gap.direction})

## Full Concept Data
${JSON.stringify(concept, null, 2)}

## Your Task
Analyze why your prediction was ${gap.direction === 'accurate' ? 'accurate' : 'wrong'} and provide:

1. **Critique** (2-3 sentences): A clear explanation of what went wrong or right
2. **Hypothesized Reasons** (3-5 bullet points): Specific reasons why the gap exists
3. **Scoring Issues** (2-4 bullet points): What aspects of your scoring algorithm failed
4. **Adjustment Plan** (2-3 sentences): Concrete changes to improve future predictions
5. **Confidence Level**: low/medium/high based on how certain you are about the analysis

Return your response in this EXACT JSON format:
{
  "critique": "Your 2-3 sentence critique here",
  "reasons": ["Reason 1", "Reason 2", "Reason 3"],
  "scoringIssues": ["Issue 1", "Issue 2"],
  "adjustmentPlan": "Your adjustment plan here",
  "confidence": "high"
}`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    // Extract JSON from response (may be wrapped in markdown)
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in Claude response');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      critique: parsed.critique || 'No critique generated',
      reasons: Array.isArray(parsed.reasons) ? parsed.reasons : [],
      scoringIssues: Array.isArray(parsed.scoringIssues) ? parsed.scoringIssues : [],
      adjustmentPlan: parsed.adjustmentPlan || 'No adjustment plan',
      confidence: ['low', 'medium', 'high'].includes(parsed.confidence)
        ? parsed.confidence
        : 'medium',
    };
  } catch (error) {
    console.error('Error generating self-critique:', error);

    // Fallback to rule-based critique
    return generateFallbackCritique(gap);
  }
}

/**
 * Fallback critique when API fails
 */
function generateFallbackCritique(gap: PerformanceGap): {
  critique: string;
  reasons: string[];
  scoringIssues: string[];
  adjustmentPlan: string;
  confidence: 'low' | 'medium' | 'high';
} {
  if (gap.direction === 'over-predicted') {
    return {
      critique: `System over-predicted virality by ${Math.abs(gap.gapPercentage)}%. The concept likely lacked hooks strong enough to capture attention or the category weight was too optimistic.`,
      reasons: [
        'Title may not have been compelling enough for actual users',
        'Category weight for this platform may be inflated',
        'Visual potential score may have been overestimated',
        'Trend recency boost may have been too aggressive',
      ],
      scoringIssues: [
        `${gap.category} category weight on ${gap.platform} needs reduction`,
        'Emotional impact scoring may be too generous',
      ],
      adjustmentPlan: `Reduce ${gap.category} category weight on ${gap.platform} by 10%. Increase threshold for emotional impact scoring.`,
      confidence: 'medium',
    };
  } else if (gap.direction === 'under-predicted') {
    return {
      critique: `System under-predicted virality by ${Math.abs(gap.gapPercentage)}%. The concept performed better than expected, suggesting we're too conservative on this category/platform combination.`,
      reasons: [
        'Category may be trending higher than our data suggests',
        'Hook formula was more effective than predicted',
        'Platform algorithm may favor this content type currently',
        'Trend timing was optimal',
      ],
      scoringIssues: [
        `${gap.category} category weight on ${gap.platform} is too conservative`,
        'Hook effectiveness scoring undervalued this style',
      ],
      adjustmentPlan: `Increase ${gap.category} category weight on ${gap.platform} by 15%. Boost confidence in high-performing hook patterns.`,
      confidence: 'medium',
    };
  } else {
    return {
      critique: 'Prediction was accurate within acceptable margin. Continue current approach.',
      reasons: ['Scoring algorithm is well-calibrated for this category/platform'],
      scoringIssues: [],
      adjustmentPlan: 'No adjustments needed. Monitor for drift over time.',
      confidence: 'high',
    };
  }
}

/**
 * Extract patterns from critique and store as insights
 */
async function extractInsights(critique: SelfCritique): Promise<void> {
  const gap = critique.performanceGap;

  // Pattern: category + platform + direction
  const pattern = `${gap.category}-${gap.platform}-${gap.direction}`;

  // Check if this pattern exists
  const existingInsight = await getInsightsByPattern(pattern);

  if (existingInsight) {
    // Update existing insight
    existingInsight.evidenceCount++;
    existingInsight.lastSeenAt = new Date().toISOString();

    // Update recommendation based on accumulated evidence
    if (existingInsight.evidenceCount >= 3 && !existingInsight.appliedToScoring) {
      existingInsight.recommendation = `Strong pattern detected (${existingInsight.evidenceCount}x). Apply scoring adjustment.`;
    }

    await saveInsight(existingInsight);
  } else {
    // Create new insight
    const insight: ReflexionInsight = {
      id: uuidv4(),
      category: gap.category,
      platform: gap.platform,
      pattern,
      evidenceCount: 1,
      impact: gap.direction === 'over-predicted' ? 'negative' : gap.direction === 'under-predicted' ? 'positive' : 'neutral',
      recommendation: critique.adjustmentPlan,
      appliedToScoring: false,
      discoveredAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
    };

    await saveInsight(insight);
  }
}

/**
 * Apply scoring adjustments based on critique
 */
async function applyAdjustments(critique: SelfCritique): Promise<void> {
  const gap = critique.performanceGap;
  const kb = loadKnowledgeBase();

  // Adjustment 1: Category weight
  const categoryWeight = await adjustCategoryWeight(gap, kb, critique.id);
  if (categoryWeight) {
    await saveAdjustment(categoryWeight);
  }

  // Adjustment 2: Hook effectiveness (if hook was used)
  // This is already handled by effectiveness-scorer.ts, so we skip it here

  // Mark critique as applied
  updateCritique(critique.id, { appliedAt: new Date().toISOString() });

  // Persist knowledge base changes
  saveKnowledgeBase(kb);
}

/**
 * Adjust category weight based on performance gap
 */
async function adjustCategoryWeight(
  gap: PerformanceGap,
  kb: KnowledgeBase,
  critiqueId: string
): Promise<ScoringAdjustment | null> {
  // Load current weights from virality.ts (we'll need to make them dynamic)
  // For now, we'll store adjustments in knowledge base meta

  const adjustmentKey = `${gap.category}_${gap.platform}_weight`;
  const currentWeightValue = kb.meta[adjustmentKey];
  const currentWeight =
    typeof currentWeightValue === "number" ? currentWeightValue : 1.0;

  // Calculate adjustment magnitude based on gap size
  let adjustmentFactor = 0;
  const absGap = Math.abs(gap.gapPercentage);

  if (absGap > 40) {
    adjustmentFactor = 0.20; // 20% adjustment for large gaps
  } else if (absGap > 25) {
    adjustmentFactor = 0.15; // 15% adjustment
  } else if (absGap > 15) {
    adjustmentFactor = 0.10; // 10% adjustment
  } else {
    return null; // Gap too small to adjust
  }

  // Direction: over-predicted = reduce weight, under-predicted = increase weight
  const newWeight = gap.direction === 'over-predicted'
    ? currentWeight * (1 - adjustmentFactor)
    : currentWeight * (1 + adjustmentFactor);

  // Clamp to reasonable bounds
  const finalWeight = Math.max(0.5, Math.min(2.0, newWeight));

  // Store in knowledge base
  kb.meta[adjustmentKey] = finalWeight;
  kb.meta[`${adjustmentKey}_lastUpdated`] = new Date().toISOString();

  return {
    id: uuidv4(),
    category: gap.category,
    adjustmentType: 'category-weight',
    oldValue: currentWeight,
    newValue: finalWeight,
    reason: `${gap.direction} by ${gap.gapPercentage}%: adjusted ${gap.category} on ${gap.platform}`,
    critiqueId,
    appliedAt: new Date().toISOString(),
  };
}

/**
 * Batch reflexion — analyze all recent feedback
 */
export async function runBatchReflexion(
  feedbackEntries: PerformanceFeedback[],
  concepts: ViralConcept[]
): Promise<{
  critiquesGenerated: number;
  adjustmentsApplied: number;
  insightsExtracted: number;
}> {
  let critiquesGenerated = 0;
  let adjustmentsApplied = 0;
  let insightsExtracted = 0;

  for (const feedback of feedbackEntries) {
    // Find matching concept
    const concept = concepts.find(c => c.id === feedback.conceptId);
    if (!concept) continue;

    try {
      const critique = await reflectOnPerformance(concept, feedback);
      critiquesGenerated++;

      if (critique.appliedAt) {
        adjustmentsApplied++;
      }

      insightsExtracted++;
    } catch (error) {
      console.error(`Reflexion failed for concept ${concept.id}:`, error);
    }
  }

  return {
    critiquesGenerated,
    adjustmentsApplied,
    insightsExtracted,
  };
}

/**
 * Get adjusted weight for a category/platform (used in virality scoring)
 */
export function getAdjustedWeight(category: string, platform: string): number {
  const kb = loadKnowledgeBase();
  const adjustmentKey = `${category}_${platform}_weight`;
  const value = kb.meta[adjustmentKey];
  return typeof value === "number" ? value : 1.0;
}

/**
 * Get reflexion summary stats
 */
export function getReflexionSummary(): {
  totalCritiques: number;
  totalAdjustments: number;
  avgGap: number;
  accuracyRate: number;
  topIssue: string;
} {
  const { getCritiques, getAdjustments } = require('./reflexion-storage');

  const critiques = getCritiques(100);
  const adjustments = getAdjustments(100);

  if (critiques.length === 0) {
    return {
      totalCritiques: 0,
      totalAdjustments: 0,
      avgGap: 0,
      accuracyRate: 0,
      topIssue: 'No data yet',
    };
  }

  const avgGap =
    critiques.reduce(
      (sum: number, c: SelfCritique) => sum + Math.abs(c.performanceGap.gap),
      0
    ) / critiques.length;
  const accurateCount = critiques.filter(
    (c: SelfCritique) => c.performanceGap.direction === "accurate"
  ).length;
  const accuracyRate = (accurateCount / critiques.length) * 100;

  // Find most common issue
  const issueFrequency: Record<string, number> = {};
  critiques.forEach((c: SelfCritique) => {
    c.scoringIssues.forEach((issue: string) => {
      issueFrequency[issue] = (issueFrequency[issue] || 0) + 1;
    });
  });

  const topIssue = Object.entries(issueFrequency)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || 'No patterns yet';

  return {
    totalCritiques: critiques.length,
    totalAdjustments: adjustments.length,
    avgGap: Math.round(avgGap * 10) / 10,
    accuracyRate: Math.round(accuracyRate * 10) / 10,
    topIssue,
  };
}
