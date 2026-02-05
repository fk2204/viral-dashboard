import { MonetizationData, Category } from '@/types';

// ============================================================
// MONETIZATION ESTIMATOR BY NICHE
// ============================================================

// Average RPM (Revenue Per Mille - per 1000 views) by category and platform
// Based on 2025-2026 creator economy data
const RPM_RANGES: Record<string, { tiktok: { min: number; max: number }; youtubeShorts: { min: number; max: number } }> = {
  news:          { tiktok: { min: 0.02, max: 0.06 }, youtubeShorts: { min: 0.04, max: 0.10 } },
  absurd:        { tiktok: { min: 0.01, max: 0.04 }, youtubeShorts: { min: 0.02, max: 0.06 } },
  luxury:        { tiktok: { min: 0.05, max: 0.15 }, youtubeShorts: { min: 0.08, max: 0.20 } },
  emotional:     { tiktok: { min: 0.02, max: 0.05 }, youtubeShorts: { min: 0.03, max: 0.08 } },
  tech:          { tiktok: { min: 0.04, max: 0.12 }, youtubeShorts: { min: 0.08, max: 0.25 } },
  cartoon:       { tiktok: { min: 0.02, max: 0.06 }, youtubeShorts: { min: 0.03, max: 0.08 } },
  gaming:        { tiktok: { min: 0.03, max: 0.08 }, youtubeShorts: { min: 0.05, max: 0.15 } },
  fitness:       { tiktok: { min: 0.04, max: 0.10 }, youtubeShorts: { min: 0.06, max: 0.18 } },
  food:          { tiktok: { min: 0.03, max: 0.08 }, youtubeShorts: { min: 0.05, max: 0.12 } },
  finance:       { tiktok: { min: 0.08, max: 0.25 }, youtubeShorts: { min: 0.15, max: 0.50 } },
  music:         { tiktok: { min: 0.02, max: 0.05 }, youtubeShorts: { min: 0.03, max: 0.08 } },
  relationships: { tiktok: { min: 0.02, max: 0.06 }, youtubeShorts: { min: 0.04, max: 0.10 } },
};

// Sponsor deal potential by category
const SPONSOR_POTENTIAL: Record<string, { potential: MonetizationData['sponsorPotential']; avgDealRange: string }> = {
  news:          { potential: 'medium', avgDealRange: '$200-$1,000 per post' },
  absurd:        { potential: 'medium', avgDealRange: '$150-$800 per post' },
  luxury:        { potential: 'premium', avgDealRange: '$1,000-$10,000 per post' },
  emotional:     { potential: 'medium', avgDealRange: '$200-$1,200 per post' },
  tech:          { potential: 'high', avgDealRange: '$500-$5,000 per post' },
  cartoon:       { potential: 'medium', avgDealRange: '$300-$1,500 per post' },
  gaming:        { potential: 'high', avgDealRange: '$500-$5,000 per post' },
  fitness:       { potential: 'premium', avgDealRange: '$800-$8,000 per post' },
  food:          { potential: 'high', avgDealRange: '$400-$3,000 per post' },
  finance:       { potential: 'premium', avgDealRange: '$1,000-$15,000 per post' },
  music:         { potential: 'medium', avgDealRange: '$200-$1,500 per post' },
  relationships: { potential: 'medium', avgDealRange: '$200-$1,000 per post' },
};

// Monetization strategies by category
const BEST_STRATEGIES: Record<string, string> = {
  news: 'Build authority with timely coverage. Monetize through news brand sponsorships and affiliate links to news tools/apps.',
  absurd: 'Volume play — high views, low CPM. Monetize through merch, creator fund, and entertainment brand deals.',
  luxury: 'Premium audience = premium sponsors. Partner with luxury brands, affiliate high-ticket items, sell lifestyle courses.',
  emotional: 'Build loyal audience first. Monetize through book deals, speaking, therapy app sponsorships, wellness brands.',
  tech: 'High CPM niche. Monetize through tech product reviews, SaaS affiliate links, online course sales.',
  cartoon: 'Sell art/prints, animation services. Brand collaborations for custom animated ads. Patreon for exclusive content.',
  gaming: 'Gaming peripherals sponsorships, game key affiliates, Twitch/YouTube channel funnel, tournament coverage.',
  fitness: 'Supplement and gear sponsorships, online coaching programs, workout app partnerships, transformation challenges.',
  food: 'Restaurant partnerships, kitchen gear affiliates, cookbook deals, meal kit sponsorships, cooking class sales.',
  finance: 'Highest CPM niche. Fintech app sponsorships, investing platform affiliates, course sales, consulting.',
  music: 'Artist promotion deals, music platform sponsorships, concert ticket affiliates, production tool partnerships.',
  relationships: 'Dating app sponsorships, self-help book affiliates, coaching programs, therapy platform partnerships.',
};

function getMonetizationLabel(score: number): string {
  if (score >= 85) return 'Premium Revenue Potential';
  if (score >= 70) return 'High Revenue Potential';
  if (score >= 55) return 'Strong Revenue Potential';
  if (score >= 40) return 'Moderate Revenue Potential';
  if (score >= 25) return 'Growing Revenue Potential';
  return 'Volume-Based Revenue';
}

/**
 * Estimate monetization potential for a concept
 */
export function estimateMonetization(category: string, viralityScore?: number): MonetizationData {
  const rpm = RPM_RANGES[category] || RPM_RANGES.absurd;
  const sponsor = SPONSOR_POTENTIAL[category] || SPONSOR_POTENTIAL.absurd;
  const strategy = BEST_STRATEGIES[category] || BEST_STRATEGIES.absurd;

  // Calculate estimated RPM (midpoint of range, adjusted by virality)
  const viralMultiplier = viralityScore ? (viralityScore / 100) * 0.5 + 0.75 : 1.0;
  const tiktokRPM = Number(((rpm.tiktok.min + rpm.tiktok.max) / 2 * viralMultiplier).toFixed(2));
  const shortsRPM = Number(((rpm.youtubeShorts.min + rpm.youtubeShorts.max) / 2 * viralMultiplier).toFixed(2));

  // Calculate monetization score (0-100)
  // Factors: RPM level, sponsor potential, audience value
  const rpmScore = ((tiktokRPM + shortsRPM) / 2) * 200; // Normalize
  const sponsorScore = sponsor.potential === 'premium' ? 90 : sponsor.potential === 'high' ? 70 : sponsor.potential === 'medium' ? 50 : 30;
  const monetizationScore = Math.min(100, Math.round((rpmScore + sponsorScore) / 2));

  return {
    estimatedRPM: { tiktok: tiktokRPM, youtubeShorts: shortsRPM },
    score: monetizationScore,
    label: getMonetizationLabel(monetizationScore),
    sponsorPotential: sponsor.potential,
    bestStrategy: strategy,
  };
}

/**
 * Get the top monetizable categories sorted by revenue potential
 */
export function getTopMonetizableCategories(): { category: string; score: number; label: string }[] {
  const categories = Object.keys(RPM_RANGES);
  return categories
    .map(cat => {
      const data = estimateMonetization(cat);
      return { category: cat, score: data.score, label: data.label };
    })
    .sort((a, b) => b.score - a.score);
}

/**
 * Get sponsor potential details for a category
 */
export function getSponsorDetails(category: string): { potential: string; avgDealRange: string; strategy: string } {
  const sponsor = SPONSOR_POTENTIAL[category] || SPONSOR_POTENTIAL.absurd;
  const strategy = BEST_STRATEGIES[category] || BEST_STRATEGIES.absurd;
  return {
    potential: sponsor.potential,
    avgDealRange: sponsor.avgDealRange,
    strategy,
  };
}
