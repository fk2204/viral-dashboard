/**
 * Provider Router - Smart Video Generation Provider Selection
 *
 * Routes video generation requests to the optimal provider based on:
 * - Category (premium categories get Sora)
 * - Platform virality score (high scores get better quality)
 * - Cost optimization (economy categories get Runway)
 * - Provider availability (automatic fallback)
 */

import { soraProvider } from "./sora";
import { veoProvider } from "./veo";
import { runwayProvider } from "./runway";
import { lumaProvider } from "./luma";
import type { VideoProvider, VideoGenerationRequest, VideoGenerationResult, ProviderConfig } from "./types";

// Provider configurations by category
const PROVIDER_CONFIGS: Record<string, ProviderConfig> = {
  finance: {
    name: "sora",
    enabled: true,
    priority: 10,
    costPerSecond: 0.30,
    maxDuration: 60,
    categories: ["finance", "tech", "luxury"],
  },
  veo: {
    name: "veo",
    enabled: true,
    priority: 5,
    costPerSecond: 0.033,
    maxDuration: 60,
    categories: ["emotional", "music", "relationships", "fitness"],
  },
  runway: {
    name: "runway",
    enabled: true,
    priority: 1,
    costPerSecond: 0.05,
    maxDuration: 30,
    categories: ["gaming", "absurd", "cartoon", "food"],
  },
  luma: {
    name: "luma",
    enabled: true,
    priority: 0, // Lowest cost, highest priority for economy
    costPerSecond: 0.025, // ~$0.20 per 8-second video
    maxDuration: 10,
    categories: ["testing", "gaming", "absurd", "cartoon", "food"],
  },
};

// Category to quality tier mapping
const CATEGORY_TIERS: Record<string, "premium" | "standard" | "economy"> = {
  finance: "premium",
  tech: "premium",
  luxury: "premium",
  emotional: "standard",
  music: "standard",
  relationships: "standard",
  fitness: "standard",
  news: "standard",
  gaming: "economy",
  absurd: "economy",
  cartoon: "economy",
  food: "economy",
};

export class ProviderRouter {
  private providers: Map<string, VideoProvider>;

  constructor() {
    this.providers = new Map([
      ["sora", soraProvider],
      ["veo", veoProvider],
      ["runway", runwayProvider],
      ["luma", lumaProvider],
    ]);
  }

  /**
   * Select optimal provider for video generation
   */
  selectProvider(request: VideoGenerationRequest): VideoProvider {
    const tier = CATEGORY_TIERS[request.category] || "standard";

    // If provider explicitly specified, use it
    if (request.provider) {
      const provider = this.providers.get(request.provider);
      if (provider) {
        return provider;
      }
    }

    // Select based on tier
    switch (tier) {
      case "premium":
        // Try Sora → Veo → Runway
        return this.getProviderWithFallback(["sora", "veo", "runway"]);

      case "standard":
        // Try Veo → Runway → Sora
        return this.getProviderWithFallback(["veo", "runway", "sora"]);

      case "economy":
        // Try Luma (cheapest) → Runway → Veo → Sora
        return this.getProviderWithFallback(["luma", "runway", "veo", "sora"]);

      default:
        // Default to Runway (most reliable)
        return runwayProvider;
    }
  }

  /**
   * Generate video with automatic provider selection and fallback
   */
  async generateVideo(request: VideoGenerationRequest): Promise<VideoGenerationResult> {
    const provider = this.selectProvider(request);

    console.log(`[ProviderRouter] Selected ${provider.name} for category: ${request.category}`);

    try {
      const result = await provider.generate(request);

      if (result.success) {
        return result;
      }

      // If failed, try fallback
      console.warn(`[ProviderRouter] ${provider.name} failed, trying fallback`);
      return this.generateWithFallback(request, provider.name);
    } catch (error) {
      console.error(`[ProviderRouter] ${provider.name} error:`, error);
      return this.generateWithFallback(request, provider.name);
    }
  }

  /**
   * Estimate cost for video generation
   */
  estimateCost(category: string, duration: number): {
    provider: string;
    cost: number;
    tier: string;
  } {
    const tier = CATEGORY_TIERS[category] || "standard";
    let providerName: string;
    let costPerSecond: number;

    switch (tier) {
      case "premium":
        providerName = "sora";
        costPerSecond = 0.30;
        break;
      case "standard":
        providerName = "veo";
        costPerSecond = 0.033;
        break;
      case "economy":
        providerName = "luma"; // Cheapest option
        costPerSecond = 0.025;
        break;
    }

    return {
      provider: providerName,
      cost: duration * costPerSecond,
      tier,
    };
  }

  /**
   * Get provider with fallback chain
   */
  private getProviderWithFallback(providerNames: string[]): VideoProvider {
    for (const name of providerNames) {
      const provider = this.providers.get(name);
      if (provider) {
        return provider;
      }
    }

    // Ultimate fallback to Runway
    return runwayProvider;
  }

  /**
   * Generate video with fallback to next provider
   */
  private async generateWithFallback(
    request: VideoGenerationRequest,
    failedProvider: string
  ): Promise<VideoGenerationResult> {
    const tier = CATEGORY_TIERS[request.category] || "standard";

    // Get fallback chain based on tier
    let fallbackChain: string[];
    switch (tier) {
      case "premium":
        fallbackChain = ["sora", "veo", "runway", "luma"];
        break;
      case "standard":
        fallbackChain = ["veo", "runway", "luma", "sora"];
        break;
      case "economy":
        fallbackChain = ["luma", "runway", "veo", "sora"];
        break;
      default:
        fallbackChain = ["luma", "runway", "veo", "sora"];
    }

    // Remove failed provider from chain
    fallbackChain = fallbackChain.filter((p) => p !== failedProvider);

    // Try each fallback
    for (const providerName of fallbackChain) {
      const provider = this.providers.get(providerName);
      if (!provider) continue;

      console.log(`[ProviderRouter] Trying fallback: ${providerName}`);

      try {
        const result = await provider.generate(request);
        if (result.success) {
          return result;
        }
      } catch (error) {
        console.error(`[ProviderRouter] Fallback ${providerName} failed:`, error);
        continue;
      }
    }

    // All providers failed
    return {
      success: false,
      provider: "none",
      error: "All video providers failed",
    };
  }

  /**
   * Get available providers
   */
  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Check if provider is available
   */
  isProviderAvailable(providerName: string): boolean {
    return this.providers.has(providerName);
  }
}

// Export singleton instance
export const providerRouter = new ProviderRouter();
