import { NextResponse } from 'next/server';
import { extractPatterns, getPatternSummary } from '@/lib/learning/pattern-extractor';
import { evolveTemplates, getEvolutionStats } from '@/lib/learning/template-evolver';
import { updateEffectivenessScores, getEffectivenessSummary } from '@/lib/learning/effectiveness-scorer';
import { learnFromTrends } from '@/lib/learner';
import { generateTrendData } from '@/lib/trends';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const startTime = Date.now();

    // Step 1: Fetch current trends for learning
    const trends = await generateTrendData();

    // Step 2: Run base learning loop (vocab extraction, category weights)
    const learningResult = await learnFromTrends(trends);

    // Step 3: Extract patterns from performance history
    const patterns = extractPatterns();
    const patternSummary = getPatternSummary();

    // Step 4: Evolve templates using genetic algorithm
    const evolutionResult = evolveTemplates({
      populationSize: 50,
      mutationRate: 0.3,
      eliteRatio: 0.2,
      newRandomRatio: 0.1,
    });
    const evolutionStats = getEvolutionStats();

    // Step 5: Update live effectiveness scores (writes back to knowledge base)
    const effectivenessScores = updateEffectivenessScores();
    const effectivenessSummary = getEffectivenessSummary();

    const duration = Date.now() - startTime;

    return NextResponse.json({
      status: 'success',
      duration: `${duration}ms`,
      learning: {
        newVocab: learningResult.newVocab,
        updatedVocab: learningResult.updatedVocab,
        learningCycle: learningResult.learningCycle,
      },
      patterns: {
        titleWordPatterns: patternSummary.topWords.length,
        topHooks: patternSummary.topHooks.length,
        bestCategoryPlatform: patternSummary.bestCategoryPlatform,
        bestStructure: patternSummary.bestStructure,
        dataPoints: patternSummary.dataPoints,
      },
      evolution: {
        generation: evolutionStats.generation,
        populationSize: evolutionStats.populationSize,
        avgFitness: evolutionStats.avgFitness,
        topFitness: evolutionStats.topFitness,
        evolved: evolutionResult.evolved.length,
        survived: evolutionResult.survived.length,
        eliminated: evolutionResult.eliminated.length,
      },
      effectiveness: {
        confidence: effectivenessSummary.confidence,
        topHook: effectivenessSummary.topHook,
        topCategory: effectivenessSummary.topCategory,
        bestPlatform: effectivenessSummary.bestPlatform,
        totalDataPoints: effectivenessSummary.totalDataPoints,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Learning cron error:', error);
    return NextResponse.json(
      {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
