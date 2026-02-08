/**
 * Inngest Function: Generate Video
 *
 * Orchestrates complete video generation pipeline:
 * 1. Select optimal provider
 * 2. Generate video
 * 3. Upload to S3
 * 4. Validate quality
 * 5. Update database
 * 6. Trigger completion event
 */

import { inngest } from "../client";
import { providerRouter } from "@/lib/video-generation/provider-router";
import { uploadVideoFromUrl } from "@/lib/storage/video-storage";
import { validateVideo } from "@/lib/quality/validators";
import { db } from "@/lib/db";

export const generateVideoFunction = inngest.createFunction(
  {
    id: "generate-video",
    name: "Generate Video from Concept",
    retries: 3, // Retry up to 3 times on failure
  },
  { event: "video/generate" },
  async ({ event, step }) => {
    const { conceptId, tenantId, category, platform, soraPrompt, veoPrompt, priority } = event.data;

    // Step 1: Select provider and generate video
    const videoResult = await step.run("generate-video", async () => {
      console.log(`[GenerateVideo] Starting for concept: ${conceptId}`);

      // Determine which prompt to use (Sora vs Veo vs generic)
      let prompt = soraPrompt;

      // Generate video using provider router
      const result = await providerRouter.generateVideo({
        conceptId,
        tenantId,
        category,
        platform,
        prompt,
        provider: "sora" as any, // Router will select optimal provider
        priority,
      });

      if (!result.success) {
        throw new Error(`Video generation failed: ${result.error}`);
      }

      return result;
    });

    // Step 2: Upload video to S3
    const uploadResult = await step.run("upload-to-s3", async () => {
      if (!videoResult.videoUrl) {
        throw new Error("No video URL from provider");
      }

      console.log(`[GenerateVideo] Uploading video to S3`);

      const result = await uploadVideoFromUrl(
        videoResult.videoUrl,
        `${conceptId}.mp4`,
        {
          conceptId,
          tenantId,
          category,
          platform,
          provider: videoResult.provider,
        }
      );

      if (!result.success) {
        throw new Error(`S3 upload failed: ${result.error}`);
      }

      return result;
    });

    // Step 3: Validate video quality
    const qualityCheck = await step.run("validate-quality", async () => {
      console.log(`[GenerateVideo] Validating video quality`);

      const check = await validateVideo(uploadResult.cdnUrl || uploadResult.s3Url, platform);

      if (!check.valid) {
        console.warn(`[GenerateVideo] Quality issues found:`, check.issues);
        // Don't fail the job, but log issues
      }

      return check;
    });

    // Step 4: Save video record to database
    const videoRecord = await step.run("save-to-database", async () => {
      console.log(`[GenerateVideo] Saving video record to database`);

      const video = await db.video.create({
        data: {
          tenantId,
          conceptId,
          category,
          platform,
          videoUrl: uploadResult.s3Url,
          cdnUrl: uploadResult.cdnUrl,
          thumbnailUrl: null, // TODO: Generate thumbnail
          provider: videoResult.provider,
          status: qualityCheck.valid ? "completed" : "completed", // Even with issues, mark as completed
          errorMessage: qualityCheck.valid ? null : qualityCheck.issues.join("; "),
          metadata: {
            duration: videoResult.duration,
            cost: videoResult.cost,
            qualityCheck: {
              valid: qualityCheck.valid,
              issues: qualityCheck.issues,
              aspectRatio: qualityCheck.aspectRatio,
              fileSize: qualityCheck.fileSize,
            },
          },
          generationCost: videoResult.cost || 0,
          generatedAt: new Date(),
        },
      });

      return video;
    });

    // Step 5: Trigger completion event
    await step.sendEvent("video-completed", {
      name: "video/completed",
      data: {
        videoId: videoRecord.id,
        conceptId,
        tenantId,
        videoUrl: uploadResult.s3Url,
        cdnUrl: uploadResult.cdnUrl || uploadResult.s3Url,
        provider: videoResult.provider,
        duration: videoResult.duration || 15,
      },
    });

    console.log(`[GenerateVideo] ✅ Complete for concept: ${conceptId}`);

    return {
      videoId: videoRecord.id,
      conceptId,
      videoUrl: uploadResult.cdnUrl || uploadResult.s3Url,
      provider: videoResult.provider,
      cost: videoResult.cost,
      qualityValid: qualityCheck.valid,
    };
  }
);
