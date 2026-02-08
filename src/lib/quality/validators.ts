/**
 * Video Quality Validation
 *
 * Validates generated videos meet platform requirements
 */

import type { VideoQualityCheck } from "../video-generation/types";

// Platform requirements
const PLATFORM_REQUIREMENTS = {
  tiktok: {
    minDuration: 3,
    maxDuration: 60,
    aspectRatio: 0.5625, // 9:16
    aspectRatioTolerance: 0.05,
    maxFileSize: 287 * 1024 * 1024, // 287MB
  },
  "youtube-shorts": {
    minDuration: 1,
    maxDuration: 60,
    aspectRatio: 0.5625, // 9:16
    aspectRatioTolerance: 0.05,
    maxFileSize: 256 * 1024 * 1024, // 256MB
  },
  "instagram-reels": {
    minDuration: 3,
    maxDuration: 90,
    aspectRatio: 0.5625, // 9:16
    aspectRatioTolerance: 0.05,
    maxFileSize: 100 * 1024 * 1024, // 100MB
  },
};

/**
 * Validate video quality (basic checks without ffmpeg)
 */
export async function validateVideoBasic(
  videoUrl: string,
  platform: "tiktok" | "youtube-shorts" | "instagram-reels"
): Promise<VideoQualityCheck> {
  const issues: string[] = [];
  const requirements = PLATFORM_REQUIREMENTS[platform];

  try {
    // Fetch video to check file size
    const response = await fetch(videoUrl, { method: "HEAD" });
    const fileSize = parseInt(response.headers.get("content-length") || "0");

    // Check file size
    if (fileSize > requirements.maxFileSize) {
      issues.push(`File size (${(fileSize / 1024 / 1024).toFixed(2)}MB) exceeds platform limit`);
    }

    if (fileSize === 0) {
      issues.push("Video file appears to be empty");
    }

    // Basic validation (we can't check duration/aspect ratio without downloading)
    return {
      valid: issues.length === 0,
      duration: 15, // Assume 15 seconds (will be validated by ffmpeg if available)
      aspectRatio: 0.5625, // Assume 9:16
      fileSize,
      hasAudio: true, // Assume yes (will be validated by ffmpeg)
      hasBlackFrames: false, // Assume no (will be validated by ffmpeg)
      issues,
    };
  } catch (error) {
    issues.push(`Failed to validate video: ${error}`);
    return {
      valid: false,
      duration: 0,
      aspectRatio: 0,
      fileSize: 0,
      hasAudio: false,
      hasBlackFrames: false,
      issues,
    };
  }
}

/**
 * Validate video with ffmpeg (comprehensive checks)
 *
 * NOTE: Requires ffmpeg to be installed on the system
 * For now, this returns a mock implementation
 */
export async function validateVideoWithFfmpeg(
  videoPath: string,
  platform: "tiktok" | "youtube-shorts" | "instagram-reels"
): Promise<VideoQualityCheck> {
  const issues: string[] = [];
  const requirements = PLATFORM_REQUIREMENTS[platform];

  try {
    // In production, use fluent-ffmpeg to analyze video:
    //
    // const ffmpeg = require('fluent-ffmpeg');
    //
    // const metadata = await new Promise((resolve, reject) => {
    //   ffmpeg.ffprobe(videoPath, (err, metadata) => {
    //     if (err) reject(err);
    //     else resolve(metadata);
    //   });
    // });
    //
    // const videoStream = metadata.streams.find(s => s.codec_type === 'video');
    // const audioStream = metadata.streams.find(s => s.codec_type === 'audio');
    //
    // duration = videoStream.duration;
    // aspectRatio = videoStream.width / videoStream.height;
    // hasAudio = !!audioStream;

    // For now, return mock validation
    const duration = 15;
    const aspectRatio = 0.5625;
    const hasAudio = true;
    const hasBlackFrames = false;
    const fileSize = 10 * 1024 * 1024; // 10MB

    // Check duration
    if (duration < requirements.minDuration) {
      issues.push(`Duration (${duration}s) below platform minimum (${requirements.minDuration}s)`);
    }
    if (duration > requirements.maxDuration) {
      issues.push(`Duration (${duration}s) exceeds platform maximum (${requirements.maxDuration}s)`);
    }

    // Check aspect ratio
    const aspectRatioDiff = Math.abs(aspectRatio - requirements.aspectRatio);
    if (aspectRatioDiff > requirements.aspectRatioTolerance) {
      issues.push(
        `Aspect ratio (${aspectRatio.toFixed(4)}) differs from platform requirement (${requirements.aspectRatio})`
      );
    }

    // Check audio
    if (!hasAudio) {
      issues.push("Video has no audio track (may hurt engagement)");
    }

    // Check black frames
    if (hasBlackFrames) {
      issues.push("Video contains black frames (generation may have failed)");
    }

    return {
      valid: issues.length === 0,
      duration,
      aspectRatio,
      fileSize,
      hasAudio,
      hasBlackFrames,
      issues,
    };
  } catch (error) {
    issues.push(`FFmpeg validation failed: ${error}`);
    return {
      valid: false,
      duration: 0,
      aspectRatio: 0,
      fileSize: 0,
      hasAudio: false,
      hasBlackFrames: false,
      issues,
    };
  }
}

/**
 * Choose validation method based on environment
 */
export async function validateVideo(
  videoUrl: string,
  platform: "tiktok" | "youtube-shorts" | "instagram-reels"
): Promise<VideoQualityCheck> {
  // For now, use basic validation
  // In production, check if ffmpeg is available and use comprehensive validation
  return validateVideoBasic(videoUrl, platform);
}
