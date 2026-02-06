import { ViralConcept, TrendData, PlatformVirality, Category } from '@/types';
import { getAdjustedWeight } from './learning/reflexion';

// ============================================================
// PLATFORM VIRALITY SCORING ENGINE
// ============================================================

// Platform-specific weight multipliers by category
const TIKTOK_CATEGORY_WEIGHTS: Record<string, number> = {
  news: 0.85, absurd: 1.2, luxury: 1.1, emotional: 1.15, tech: 0.9, cartoon: 1.1,
  gaming: 1.15, fitness: 1.2, food: 1.25, finance: 0.8, music: 1.3, relationships: 1.2,
};

const SHORTS_CATEGORY_WEIGHTS: Record<string, number> = {
  news: 1.1, absurd: 0.95, luxury: 1.0, emotional: 1.05, tech: 1.15, cartoon: 1.0,
  gaming: 1.25, fitness: 1.1, food: 1.15, finance: 1.2, music: 1.1, relationships: 1.0,
};

// Virality factors by platform
const TIKTOK_FACTORS: Record<string, string[]> = {
  news: ['FYP algorithm boost for timely content', 'Duet/stitch potential', 'Comment debate driver'],
  absurd: ['Brainrot aesthetic trending', 'Share-to-friends impulse', 'Repeat watch loop'],
  luxury: ['Aspirational save rate', 'Dream lifestyle engagement', 'Sound-on viewing'],
  emotional: ['Late night scroll resonance', 'Save-for-later behavior', 'Comment confession culture'],
  tech: ['AI curiosity factor', 'Future speculation shares', 'Niche tech community'],
  cartoon: ['Art community engagement', 'Style comparison shares', 'Animation appreciation'],
  gaming: ['Gaming community massive reach', 'Clip-sharing culture', 'Streamer reaction potential'],
  fitness: ['Transformation content saves', 'Gym community shares', 'Motivation bookmark rate'],
  food: ['Recipe save rate highest on platform', 'ASMR eating crossover', 'Food challenge virality'],
  finance: ['Money advice saves', 'Side hustle audience', 'Controversial take debates'],
  music: ['Sound trending multiplier', 'Dance challenge potential', 'Artist fan communities'],
  relationships: ['Relatable content shares', 'Tag-your-partner engagement', 'Story time addiction'],
};

const SHORTS_FACTORS: Record<string, string[]> = {
  news: ['YouTube search discovery', 'Suggested video algorithm', 'News channel crossover'],
  absurd: ['Recommendation engine boost', 'Watch time on loops', 'Subscribe prompt conversion'],
  luxury: ['High CPM audience', 'Watch time completion', 'Premium ad targeting'],
  emotional: ['Community post sharing', 'Subscription driver', 'Bell notification engagement'],
  tech: ['Tech enthusiast subscriber base', 'Tutorial crossover', 'Channel growth driver'],
  cartoon: ['Animation community shares', 'Playlist potential', 'Creator collaboration'],
  gaming: ['Massive Shorts gaming niche', 'Channel subscriber funnel', 'Gaming compilation feeds'],
  fitness: ['Workout routine subscriptions', 'Before/after thumbnails', 'Fitness playlist adds'],
  food: ['Recipe Shorts trending', 'Cooking channel funnel', 'Meal prep series potential'],
  finance: ['High CPM finance niche', 'Educational content push', 'Subscriber loyalty'],
  music: ['Music discovery algorithm', 'Song clip trending', 'Concert/event content'],
  relationships: ['Story time Shorts trending', 'Advice channel growth', 'Comment engagement high'],
};

function getViralityLabel(score: number): string {
  if (score >= 90) return 'MEGA VIRAL';
  if (score >= 75) return 'VIRAL POTENTIAL';
  if (score >= 60) return 'HIGH REACH';
  if (score >= 45) return 'GOOD REACH';
  if (score >= 30) return 'MODERATE';
  return 'NICHE';
}

/**
 * Score a concept's virality potential on each platform
 */
export function scorePlatformVirality(
  concept: ViralConcept,
  trend: TrendData
): PlatformVirality {
  const category = concept.category;

  // Base score from trend data
  const baseScore = (trend.visualPotential + trend.emotionalImpact + trend.shareability) / 3;

  // Recency multiplier
  const recencyBoost = trend.recency === 'today' ? 1.3 : trend.recency === 'yesterday' ? 1.1 : 0.9;

  // Platform-specific calculations with reflexion adjustments
  const baseTiktokWeight = TIKTOK_CATEGORY_WEIGHTS[category] || 1.0;
  const baseShortsWeight = SHORTS_CATEGORY_WEIGHTS[category] || 1.0;

  // Apply reflexion learning adjustments
  const tiktokAdjustment = getAdjustedWeight(category, 'tiktok');
  const shortsAdjustment = getAdjustedWeight(category, 'youtube-shorts');

  const tiktokWeight = baseTiktokWeight * tiktokAdjustment;
  const shortsWeight = baseShortsWeight * shortsAdjustment;

  // Hook quality bonus (shorter hooks = better for TikTok)
  const hookBonus = concept.script.length >= 3 ? 1.1 : 1.0;

  // Calculate scores
  const tiktokRaw = baseScore * tiktokWeight * recencyBoost * hookBonus;
  const shortsRaw = baseScore * shortsWeight * recencyBoost;

  // Normalize to 0-100
  const tiktokScore = Math.min(100, Math.round(tiktokRaw));
  const shortsScore = Math.min(100, Math.round(shortsRaw));

  return {
    tiktok: {
      score: tiktokScore,
      label: getViralityLabel(tiktokScore),
      factors: TIKTOK_FACTORS[category] || TIKTOK_FACTORS.absurd,
    },
    youtubeShorts: {
      score: shortsScore,
      label: getViralityLabel(shortsScore),
      factors: SHORTS_FACTORS[category] || SHORTS_FACTORS.absurd,
    },
  };
}

/**
 * Get the better platform for a given category
 */
export function getBestPlatform(category: string): 'tiktok' | 'youtube-shorts' {
  const tiktokWeight = TIKTOK_CATEGORY_WEIGHTS[category] || 1.0;
  const shortsWeight = SHORTS_CATEGORY_WEIGHTS[category] || 1.0;
  return tiktokWeight >= shortsWeight ? 'tiktok' : 'youtube-shorts';
}

/**
 * Get platform-specific posting tips
 */
export function getPlatformTips(category: string): { tiktok: string; youtubeShorts: string } {
  const tips: Record<string, { tiktok: string; youtubeShorts: string }> = {
    news: { tiktok: 'Post within 2 hours of trend breaking for maximum FYP boost', youtubeShorts: 'Use keyword-rich title for YouTube search discovery' },
    absurd: { tiktok: 'Lean into brainrot aesthetic, use trending sounds', youtubeShorts: 'Keep under 30s for maximum recommendation push' },
    luxury: { tiktok: 'Use ASMR-style audio, slow-mo reveals', youtubeShorts: 'Target high-CPM audience with premium feel' },
    emotional: { tiktok: 'Post between 10PM-2AM for late night scroll', youtubeShorts: 'Use emotional thumbnail for click-through rate' },
    tech: { tiktok: 'Hook with "AI can do this now" format', youtubeShorts: 'Cross-promote to long-form tech content' },
    cartoon: { tiktok: 'Tag animation style for niche discovery', youtubeShorts: 'Create series for subscriber retention' },
    gaming: { tiktok: 'Use game clips with trending audio overlay', youtubeShorts: 'Tag specific game titles for search' },
    fitness: { tiktok: 'Before/after hooks drive massive saves', youtubeShorts: 'Workout routines get added to playlists' },
    food: { tiktok: 'Overhead cooking shots with ASMR audio', youtubeShorts: 'Recipe format gets high save and share rate' },
    finance: { tiktok: 'Controversial take hooks drive comment wars', youtubeShorts: 'Educational finance has highest CPM on platform' },
    music: { tiktok: 'Create content around trending sounds for algorithm boost', youtubeShorts: 'Music discovery shorts get recommended heavily' },
    relationships: { tiktok: 'Tag-your-partner CTAs drive shares', youtubeShorts: 'Story time format builds subscriber loyalty' },
  };
  return tips[category] || tips.absurd;
}
