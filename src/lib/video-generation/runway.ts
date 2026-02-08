/**
 * Runway Gen-3 Video Generation Provider
 *
 * Economy tier video generation with fast turnaround
 * Cost: $0.05-$0.30 per second
 *
 * NOTE: This uses Runway's API (available now)
 */

import type { VideoProvider, VideoGenerationRequest, VideoGenerationResult } from "./types";

const RUNWAY_API_URL = "https://api.runwayml.com/v1";

export class RunwayProvider implements VideoProvider {
  name = "runway";
  private apiKey: string | undefined;

  constructor() {
    this.apiKey = process.env.RUNWAY_API_KEY;
  }

  /**
   * Generate video using Runway Gen-3
   */
  async generate(request: VideoGenerationRequest): Promise<VideoGenerationResult> {
    if (!this.apiKey) {
      return {
        success: false,
        provider: "runway",
        error: "RUNWAY_API_KEY not configured",
      };
    }

    try {
      // Create generation task
      const response = await fetch(`${RUNWAY_API_URL}/generations`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gen3a_turbo",
          prompt: request.prompt,
          duration: 5, // Runway generates in 5-second chunks
          aspect_ratio: "9:16", // Vertical video for TikTok/Shorts
          seed: Math.floor(Math.random() * 1000000),
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Runway API error: ${error}`);
      }

      const data = await response.json();

      // Poll for completion
      const videoUrl = await this.pollForCompletion(data.id);

      return {
        success: true,
        videoId: data.id,
        videoUrl,
        provider: "runway",
        duration: 5,
        cost: this.estimateCost(5),
      };
    } catch (error) {
      console.error("Runway generation error:", error);
      return {
        success: false,
        provider: "runway",
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
      const response = await fetch(`${RUNWAY_API_URL}/generations/${jobId}`, {
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        return "failed";
      }

      const data = await response.json();

      if (data.status === "SUCCEEDED") return "completed";
      if (data.status === "FAILED") return "failed";
      return "pending";
    } catch (error) {
      console.error("Runway status check error:", error);
      return "failed";
    }
  }

  /**
   * Get generated video URL
   */
  async getVideo(jobId: string): Promise<{ url: string; duration: number }> {
    if (!this.apiKey) {
      throw new Error("RUNWAY_API_KEY not configured");
    }

    try {
      const response = await fetch(`${RUNWAY_API_URL}/generations/${jobId}`, {
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to get Runway video");
      }

      const data = await response.json();

      if (!data.output || !data.output[0]) {
        throw new Error("Video not ready yet");
      }

      return {
        url: data.output[0],
        duration: 5,
      };
    } catch (error) {
      throw new Error(`Failed to get Runway video: ${error}`);
    }
  }

  /**
   * Estimate generation cost
   */
  estimateCost(duration: number): number {
    // Runway Gen-3 pricing:
    // ~$0.05 per second for turbo mode
    const costPerSecond = 0.05;
    return duration * costPerSecond;
  }

  /**
   * Poll for video completion (with timeout)
   */
  private async pollForCompletion(
    jobId: string,
    maxAttempts: number = 60,
    intervalMs: number = 5000
  ): Promise<string> {
    for (let i = 0; i < maxAttempts; i++) {
      const status = await this.checkStatus(jobId);

      if (status === "completed") {
        const video = await this.getVideo(jobId);
        return video.url;
      }

      if (status === "failed") {
        throw new Error("Video generation failed");
      }

      // Wait before next check
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }

    throw new Error("Video generation timeout");
  }
}

// Export singleton instance
export const runwayProvider = new RunwayProvider();
