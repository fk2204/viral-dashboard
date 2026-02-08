/**
 * Inngest Function: Retry Failed Video Generation Jobs
 *
 * Handles error recovery and automatic retries with exponential backoff
 */

import { inngest } from "../client";
import { db } from "@/lib/db";

export const retryFailedJobsFunction = inngest.createFunction(
  {
    id: "retry-failed-jobs",
    name: "Retry Failed Video Generation Jobs",
  },
  { event: "video/failed" },
  async ({ event, step }) => {
    const { conceptId, tenantId, error, provider, attempt } = event.data;

    // Step 1: Check if we should retry
    const shouldRetry = await step.run("check-retry-limit", async () => {
      const MAX_ATTEMPTS = 3;

      if (attempt >= MAX_ATTEMPTS) {
        console.log(`[RetryFailed] Max attempts (${MAX_ATTEMPTS}) reached for concept: ${conceptId}`);
        return false;
      }

      console.log(`[RetryFailed] Attempt ${attempt}/${MAX_ATTEMPTS} for concept: ${conceptId}`);
      return true;
    });

    if (!shouldRetry) {
      // Mark video as permanently failed
      await step.run("mark-as-failed", async () => {
        const video = await db.video.findFirst({
          where: { conceptId, tenantId },
        });

        if (video) {
          await db.video.update({
            where: { id: video.id },
            data: {
              status: "failed",
              errorMessage: `Failed after ${attempt} attempts: ${error}`,
            },
          });
        }
      });

      return { retried: false, reason: "Max attempts reached" };
    }

    // Step 2: Calculate backoff delay
    const backoffMs = await step.run("calculate-backoff", async () => {
      // Exponential backoff: 5s, 10s, 20s
      const baseDelay = 5000;
      const delay = baseDelay * Math.pow(2, attempt - 1);
      return delay;
    });

    // Step 3: Wait before retry
    await step.sleep("wait-before-retry", backoffMs);

    // Step 4: Trigger retry
    await step.sendEvent("retry-video-generation", {
      name: "video/generate",
      data: {
        conceptId,
        tenantId,
        category: event.data.category || "tech",
        platform: event.data.platform || "tiktok",
        soraPrompt: event.data.soraPrompt || "",
        veoPrompt: event.data.veoPrompt || "",
        priority: event.data.priority || 5,
      },
    });

    console.log(`[RetryFailed] ♻️ Retrying concept: ${conceptId} after ${backoffMs}ms`);

    return {
      retried: true,
      attempt: attempt + 1,
      backoffMs,
    };
  }
);
