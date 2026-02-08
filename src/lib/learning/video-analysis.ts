/**
 * Multi-Modal Video Analysis
 *
 * Analyzes video content using Claude Vision API
 * Extracts keyframes and provides insights on visual elements
 *
 * NOTE: Requires ffmpeg: `npm install fluent-ffmpeg @ffmpeg-installer/ffmpeg`
 */

import Anthropic from "@anthropic-ai/sdk";
import ffmpeg from "fluent-ffmpeg";
import { path as ffmpegPath } from "@ffmpeg-installer/ffmpeg";
import { promises as fs } from "fs";
import path from "path";
import os from "os";

// Set ffmpeg path
ffmpeg.setFfmpegPath(ffmpegPath);

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface KeyframeAnalysis {
  timestamp: number;
  description: string;
  hookEffectiveness?: number; // 0-100
  visualAppeal?: number; // 0-100
  textReadability?: number; // 0-100
  insights: string[];
}

interface VideoAnalysisResult {
  success: boolean;
  keyframes: KeyframeAnalysis[];
  overallScore: number;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  error?: string;
}

export class VideoAnalyzer {
  /**
   * Extract keyframes from video
   */
  async extractKeyframes(
    videoUrl: string,
    count: number = 5
  ): Promise<{ path: string; timestamp: number }[]> {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "keyframes-"));
    const keyframes: { path: string; timestamp: number }[] = [];

    return new Promise((resolve, reject) => {
      // Get video duration first
      ffmpeg.ffprobe(videoUrl, async (err, metadata) => {
        if (err) {
          reject(err);
          return;
        }

        const duration = metadata.format.duration || 15;
        const interval = duration / (count + 1);

        // Extract frames at intervals
        for (let i = 1; i <= count; i++) {
          const timestamp = interval * i;
          const framePath = path.join(tempDir, `frame_${i}.jpg`);

          await new Promise<void>((resolveFrame, rejectFrame) => {
            ffmpeg(videoUrl)
              .screenshots({
                timestamps: [timestamp],
                filename: `frame_${i}.jpg`,
                folder: tempDir,
                size: "1080x1920",
              })
              .on("end", () => {
                keyframes.push({ path: framePath, timestamp });
                resolveFrame();
              })
              .on("error", rejectFrame);
          });
        }

        resolve(keyframes);
      });
    });
  }

  /**
   * Analyze keyframe with Claude Vision API
   */
  async analyzeKeyframe(
    imagePath: string,
    timestamp: number,
    isHook: boolean = false
  ): Promise<KeyframeAnalysis> {
    try {
      // Read image as base64
      const imageBuffer = await fs.readFile(imagePath);
      const base64Image = imageBuffer.toString("base64");

      // Determine media type
      const mediaType = imagePath.endsWith(".png")
        ? "image/png"
        : "image/jpeg";

      // Prepare prompt
      const prompt = isHook
        ? `Analyze this opening frame from a viral short-form video (TikTok/YouTube Shorts/Instagram Reels).

Focus on:
1. **Hook Effectiveness** (0-100): Does it grab attention immediately?
2. **Visual Appeal** (0-100): Color scheme, composition, lighting quality
3. **Text Readability** (0-100): If text is present, is it clear and impactful?
4. **Key Insights**: What works well? What could be improved?

Format your response as JSON:
{
  "hookEffectiveness": 85,
  "visualAppeal": 90,
  "textReadability": 75,
  "description": "Brief description of what's shown",
  "insights": ["Strength 1", "Weakness 1", "Recommendation 1"]
}`
        : `Analyze this frame from a viral short-form video.

Focus on:
1. **Visual Appeal** (0-100): Color scheme, composition, lighting
2. **Text Readability** (0-100): If text present, clarity and impact
3. **Key Insights**: What stands out?

Format your response as JSON:
{
  "visualAppeal": 85,
  "textReadability": 75,
  "description": "Brief description",
  "insights": ["Key observation 1", "Key observation 2"]
}`;

      // Call Claude Vision API
      const response = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mediaType,
                  data: base64Image,
                },
              },
              {
                type: "text",
                text: prompt,
              },
            ],
          },
        ],
      });

      // Parse response
      const content = response.content[0];
      if (content.type !== "text") {
        throw new Error("Unexpected response type from Claude");
      }

      // Extract JSON from response
      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }

      const analysis = JSON.parse(jsonMatch[0]);

      return {
        timestamp,
        description: analysis.description || "",
        hookEffectiveness: analysis.hookEffectiveness,
        visualAppeal: analysis.visualAppeal || 0,
        textReadability: analysis.textReadability || 0,
        insights: analysis.insights || [],
      };
    } catch (error) {
      console.error("Keyframe analysis error:", error);
      return {
        timestamp,
        description: "Analysis failed",
        insights: ["Error analyzing frame"],
      };
    }
  }

  /**
   * Analyze complete video
   */
  async analyzeVideo(
    videoUrl: string,
    category: string,
    platform: string
  ): Promise<VideoAnalysisResult> {
    try {
      // Extract keyframes
      console.log(`Extracting keyframes from ${videoUrl}`);
      const keyframes = await this.extractKeyframes(videoUrl, 5);

      // Analyze each keyframe
      const analyses: KeyframeAnalysis[] = [];

      for (let i = 0; i < keyframes.length; i++) {
        const isHook = i === 0; // First frame is the hook
        console.log(`Analyzing keyframe ${i + 1}/${keyframes.length}`);

        const analysis = await this.analyzeKeyframe(
          keyframes[i].path,
          keyframes[i].timestamp,
          isHook
        );

        analyses.push(analysis);
      }

      // Clean up temporary files
      for (const keyframe of keyframes) {
        await fs.unlink(keyframe.path).catch(() => {});
      }

      // Calculate overall score
      const avgVisualAppeal =
        analyses.reduce((sum, a) => sum + (a.visualAppeal || 0), 0) / analyses.length;
      const avgTextReadability =
        analyses.reduce((sum, a) => sum + (a.textReadability || 0), 0) / analyses.length;
      const hookScore = analyses[0].hookEffectiveness || 0;

      const overallScore = (hookScore * 0.4 + avgVisualAppeal * 0.4 + avgTextReadability * 0.2);

      // Extract strengths and weaknesses
      const allInsights = analyses.flatMap((a) => a.insights);
      const strengths = allInsights.filter((i) =>
        i.toLowerCase().includes("good") ||
        i.toLowerCase().includes("strong") ||
        i.toLowerCase().includes("effective")
      );
      const weaknesses = allInsights.filter((i) =>
        i.toLowerCase().includes("weak") ||
        i.toLowerCase().includes("poor") ||
        i.toLowerCase().includes("improve")
      );

      // Generate recommendations
      const recommendations = this.generateRecommendations(
        analyses,
        category,
        platform
      );

      return {
        success: true,
        keyframes: analyses,
        overallScore,
        strengths: [...new Set(strengths)],
        weaknesses: [...new Set(weaknesses)],
        recommendations,
      };
    } catch (error) {
      console.error("Video analysis error:", error);
      return {
        success: false,
        keyframes: [],
        overallScore: 0,
        strengths: [],
        weaknesses: [],
        recommendations: [],
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Generate recommendations based on analysis
   */
  private generateRecommendations(
    analyses: KeyframeAnalysis[],
    category: string,
    platform: string
  ): string[] {
    const recommendations: string[] = [];

    // Hook analysis
    const hookScore = analyses[0].hookEffectiveness || 0;
    if (hookScore < 70) {
      recommendations.push(
        "Improve hook: Use more attention-grabbing visuals or text in the first frame"
      );
    }

    // Visual appeal
    const avgVisual =
      analyses.reduce((sum, a) => sum + (a.visualAppeal || 0), 0) / analyses.length;
    if (avgVisual < 70) {
      recommendations.push(
        "Enhance visual quality: Consider better lighting, color grading, or composition"
      );
    }

    // Text readability
    const avgText =
      analyses.reduce((sum, a) => sum + (a.textReadability || 0), 0) / analyses.length;
    if (avgText < 70 && avgText > 0) {
      recommendations.push(
        "Improve text readability: Use larger fonts, higher contrast, or simpler backgrounds"
      );
    }

    // Platform-specific
    if (platform === "tiktok") {
      recommendations.push(
        "TikTok optimization: Ensure captions are prominent and the first 3 seconds are captivating"
      );
    } else if (platform === "youtube") {
      recommendations.push(
        "YouTube Shorts: Focus on clear storytelling and strong call-to-action at the end"
      );
    } else if (platform === "instagram") {
      recommendations.push(
        "Instagram Reels: Emphasize aesthetic appeal and seamless transitions"
      );
    }

    return recommendations;
  }

  /**
   * Compare video performance against visual analysis
   */
  async comparePerformanceToVisuals(
    videoId: string,
    actualEngagement: number,
    predictedEngagement: number
  ): Promise<string> {
    try {
      // Get video analysis from database
      const video = await db.video.findUnique({
        where: { id: videoId },
      });

      if (!video || !video.metadata) {
        return "No visual analysis available for comparison";
      }

      const visualAnalysis = (video.metadata as any).visualAnalysis;

      if (!visualAnalysis) {
        return "Visual analysis not found in metadata";
      }

      // Use Claude to interpret the relationship
      const response = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 512,
        messages: [
          {
            role: "user",
            content: `Analyze the relationship between visual quality and performance:

Visual Analysis:
- Overall Score: ${visualAnalysis.overallScore}/100
- Hook Effectiveness: ${visualAnalysis.keyframes[0]?.hookEffectiveness || 0}/100
- Avg Visual Appeal: ${visualAnalysis.keyframes.reduce((s: number, k: any) => s + k.visualAppeal, 0) / visualAnalysis.keyframes.length}/100

Performance:
- Predicted Engagement: ${predictedEngagement}%
- Actual Engagement: ${actualEngagement}%
- Gap: ${Math.abs(actualEngagement - predictedEngagement).toFixed(2)}%

Provide 2-3 sentences explaining why the video ${actualEngagement > predictedEngagement ? "outperformed" : "underperformed"} expectations, focusing on visual elements.`,
          },
        ],
      });

      const content = response.content[0];
      if (content.type === "text") {
        return content.text;
      }

      return "Analysis completed but no text response";
    } catch (error) {
      console.error("Performance comparison error:", error);
      return "Error comparing performance to visuals";
    }
  }
}

// Export singleton instance
export const videoAnalyzer = new VideoAnalyzer();
