/**
 * Luma AI Dream Machine Video Generation Provider
 *
 * Most cost-effective option for testing and high-volume production
 * Cost: $0.20-$0.32 per generation (via official API or PiAPI)
 *
 * API Docs: https://lumalabs.ai/dream-machine/api/pricing
 * Pricing: $0.32 per million pixels
 * Duration: 5-10 seconds per generation
 * Aspect Ratios: 9:16, 16:9, 1:1, 4:5, 5:4, 3:2
 * Resolution: 540p, 720p, 1080p
 */

import type { VideoProvider, VideoGenerationRequest, VideoGenerationResult } from "./types";

const LUMA_API_URL = "https://api.lumalabs.ai/dream-machine/v1";

interface LumaGenerationResponse {
  id: string;
  state: "pending" | "processing" | "completed" | "failed";
  video?: {
    url: string;
    duration: number;
    width: number;
    height: number;
  };
  failure_reason?: string;
}

export class LumaProvider implements VideoProvider {
  name = "luma";
  private apiKey: string | undefined;

  constructor() {
    this.apiKey = process.env.LUMA_API_KEY;
  }

  /**
   * Generate video using Luma AI Dream Machine
   */
  async generate(request: VideoGenerationRequest): Promise<VideoGenerationResult> {
    if (!this.apiKey) {
      return {
        success: false,
        provider: "luma",
        error: "LUMA_API_KEY not configured",
      };
    }

    try {
      // Create generation task
      const response = await fetch(`${LUMA_API_URL}/generations`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: request.prompt,
          aspect_ratio: "9:16", // Vertical video for TikTok/Shorts/Reels
          loop: false,
          keyframes: {
            frame0: {
              type: "generation",
              text: request.prompt,
            },
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Luma API error (${response.status}): ${errorText}`);
      }

      const data: LumaGenerationResponse = await response.json();

      // Poll for completion
      const result = await this.pollForCompletion(data.id);

      return {
        success: true,
        videoId: data.id,
        videoUrl: result.video.url,
        provider: "luma",
        duration: result.video.duration,
        cost: this.estimateCost(result.video.duration),
      };
    } catch (error) {
      console.error("Luma generation error:", error);
      return {
        success: false,
        provider: "luma",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Check video generation status
   */
  async checkStatus(jobId: string): Promise<"pending" | "completed" | "failed"> {
    if (!this.apiKey) {
      return "failed";
    }

    try {
      const response = await fetch(`${LUMA_API_URL}/generations/${jobId}`, {
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        console.error(`Luma status check failed: ${response.status}`);
        return "failed";
      }

      const data: LumaGenerationResponse = await response.json();

      if (data.state === "completed") return "completed";
      if (data.state === "failed") return "failed";
      return "pending";
    } catch (error) {
      console.error("Luma status check error:", error);
      return "failed";
    }
  }

  /**
   * Get generated video URL
   */
  async getVideo(jobId: string): Promise<{ url: string; duration: number }> {
    if (!this.apiKey) {
      throw new Error("LUMA_API_KEY not configured");
    }

    try {
      const response = await fetch(`${LUMA_API_URL}/generations/${jobId}`, {
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get Luma video: ${response.status}`);
      }

      const data: LumaGenerationResponse = await response.json();

      if (!data.video || !data.video.url) {
        throw new Error("Video not ready yet");
      }

      return {
        url: data.video.url,
        duration: data.video.duration,
      };
    } catch (error) {
      throw new Error(`Failed to get Luma video: ${error}`);
    }
  }

  /**
   * Estimate generation cost
   *
   * Luma pricing: $0.32 per million pixels
   * For 9:16 1080p video (1080×1920):
   * - Pixels per frame: 2,073,600
   * - At 24 FPS, 10-second video: 497,664,000 pixels
   * - Cost: ~$0.16 per 10-second video
   *
   * Conservative estimate: $0.20 per video (accounts for API overhead)
   */
  estimateCost(duration: number): number {
    // Fixed cost per generation (Luma charges per generation, not per second)
    // Based on research: $0.20-$0.32 per generation
    const costPerGeneration = 0.25; // Middle estimate

    // Luma generates 5-10 second videos
    // For longer videos, multiple generations needed
    const generationsNeeded = Math.ceil(duration / 8); // Assume 8s per generation

    return generationsNeeded * costPerGeneration;
  }

  /**
   * Poll for video completion (with timeout)
   */
  private async pollForCompletion(
    jobId: string,
    maxAttempts: number = 60, // 5 minutes max
    intervalMs: number = 5000 // Check every 5 seconds
  ): Promise<LumaGenerationResponse> {
    for (let i = 0; i < maxAttempts; i++) {
      const status = await this.checkStatus(jobId);

      if (status === "completed") {
        const video = await this.getVideoDetails(jobId);
        return video;
      }

      if (status === "failed") {
        const details = await this.getVideoDetails(jobId);
        throw new Error(`Video generation failed: ${details.failure_reason || "Unknown error"}`);
      }

      // Wait before next check
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }

    throw new Error("Video generation timeout (5 minutes exceeded)");
  }

  /**
   * Get full video details
   */
  private async getVideoDetails(jobId: string): Promise<LumaGenerationResponse> {
    if (!this.apiKey) {
      throw new Error("LUMA_API_KEY not configured");
    }

    const response = await fetch(`${LUMA_API_URL}/generations/${jobId}`, {
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get video details: ${response.status}`);
    }

    return response.json();
  }
}

// Export singleton instance
export const lumaProvider = new LumaProvider();
