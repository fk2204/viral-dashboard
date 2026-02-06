/**
 * Server-side concept cache for reflexion analysis
 * Stores generated concepts with 48h TTL to enable autonomous learning
 */

import { ViralConcept, Generation } from "@/types";

interface CachedGeneration {
  generation: Generation;
  cachedAt: number;
  expiresAt: number;
}

const TTL_MS = 48 * 60 * 60 * 1000; // 48 hours
const cache = new Map<string, CachedGeneration>();

/**
 * Cache a generation for future reflexion analysis
 */
export function cacheGeneration(generation: Generation): void {
  const now = Date.now();
  const expiresAt = now + TTL_MS;

  // Cache each concept individually by ID
  generation.concepts.forEach((concept) => {
    cache.set(concept.id, {
      generation,
      cachedAt: now,
      expiresAt,
    });
  });

  console.log(`📦 Cached ${generation.concepts.length} concepts (expires in 48h)`);
}

/**
 * Retrieve a concept from cache for reflexion analysis
 * Returns null if not found or expired
 */
export function getConcept(conceptId: string): ViralConcept | null {
  const cached = cache.get(conceptId);

  if (!cached) {
    return null;
  }

  // Check if expired
  if (Date.now() > cached.expiresAt) {
    cache.delete(conceptId);
    return null;
  }

  // Find concept in generation
  const concept = cached.generation.concepts.find((c) => c.id === conceptId);
  return concept || null;
}

/**
 * Get full generation context for a concept
 */
export function getGeneration(conceptId: string): Generation | null {
  const cached = cache.get(conceptId);

  if (!cached) {
    return null;
  }

  // Check if expired
  if (Date.now() > cached.expiresAt) {
    cache.delete(conceptId);
    return null;
  }

  return cached.generation;
}

/**
 * Remove expired entries from cache
 */
export function cleanup(): number {
  const now = Date.now();
  let removed = 0;

  for (const [id, cached] of cache.entries()) {
    if (now > cached.expiresAt) {
      cache.delete(id);
      removed++;
    }
  }

  if (removed > 0) {
    console.log(`🧹 Cleaned up ${removed} expired concepts from cache`);
  }

  return removed;
}

/**
 * Get cache statistics for monitoring
 */
export function getStats(): {
  totalConcepts: number;
  validConcepts: number;
  expiredConcepts: number;
  oldestEntry: number | null;
  newestEntry: number | null;
  memoryUsageEstimate: string;
} {
  const now = Date.now();
  let validCount = 0;
  let expiredCount = 0;
  let oldestCachedAt: number | null = null;
  let newestCachedAt: number | null = null;

  for (const cached of cache.values()) {
    if (now > cached.expiresAt) {
      expiredCount++;
    } else {
      validCount++;
      if (!oldestCachedAt || cached.cachedAt < oldestCachedAt) {
        oldestCachedAt = cached.cachedAt;
      }
      if (!newestCachedAt || cached.cachedAt > newestCachedAt) {
        newestCachedAt = cached.cachedAt;
      }
    }
  }

  // Rough memory estimate (each concept ~5-10KB)
  const estimatedKB = cache.size * 7.5;
  const memoryUsageEstimate =
    estimatedKB > 1024
      ? `${(estimatedKB / 1024).toFixed(2)} MB`
      : `${estimatedKB.toFixed(2)} KB`;

  return {
    totalConcepts: cache.size,
    validConcepts: validCount,
    expiredConcepts: expiredCount,
    oldestEntry: oldestCachedAt,
    newestEntry: newestCachedAt,
    memoryUsageEstimate,
  };
}

/**
 * Clear entire cache (use with caution)
 */
export function clearCache(): void {
  const size = cache.size;
  cache.clear();
  console.log(`🗑️  Cleared ${size} concepts from cache`);
}

// Periodic cleanup every hour
if (typeof setInterval !== "undefined") {
  setInterval(cleanup, 60 * 60 * 1000);
}
