/**
 * Video Generation Types
 */

export interface VideoGenerationRequest {
  conceptId: string;
  tenantId: string;
  category: string;
  platform: "tiktok" | "youtube-shorts" | "instagram-reels";
  prompt: string;
  provider: "sora" | "veo" | "runway" | "luma";
  priority: number;
}

export interface VideoGenerationResult {
  success: boolean;
  videoId?: string;
  videoUrl?: string;
  provider: string;
  duration?: number;
  cost?: number;
  error?: string;
}

export interface VideoProvider {
  name: string;
  generate(request: VideoGenerationRequest): Promise<VideoGenerationResult>;
  checkStatus(jobId: string): Promise<"pending" | "completed" | "failed">;
  getVideo(jobId: string): Promise<{ url: string; duration: number }>;
  estimateCost(duration: number): number;
}

export interface VideoQualityCheck {
  valid: boolean;
  duration: number;
  aspectRatio: number;
  fileSize: number;
  hasAudio: boolean;
  hasBlackFrames: boolean;
  issues: string[];
}

export interface ProviderConfig {
  name: string;
  enabled: boolean;
  priority: number;
  costPerSecond: number;
  maxDuration: number;
  categories: string[];
}
