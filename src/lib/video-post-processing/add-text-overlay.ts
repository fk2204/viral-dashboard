/**
 * Video Post-Processing: Add Text Overlays
 *
 * Adds viral hooks, captions, and effects to raw AI-generated videos
 * Uses FFmpeg for video manipulation
 *
 * Install: npm install fluent-ffmpeg @ffmpeg-installer/ffmpeg
 */

import ffmpeg from "fluent-ffmpeg";
import { path as ffmpegPath } from "@ffmpeg-installer/ffmpeg";
import * as path from "path";
import * as fs from "fs";

// Set FFmpeg path
ffmpeg.setFfmpegPath(ffmpegPath);

interface TextOverlayOptions {
  inputVideo: string;
  outputVideo: string;
  hookText: string;
  hookDuration?: number; // seconds, default 3
  fontSize?: number; // default 60
  fontColor?: string; // default white
  backgroundColor?: string; // default black with transparency
  position?: "top" | "center" | "bottom"; // default center
}

interface VideoPackageOptions {
  rawVideo: string;
  outputVideo: string;
  hookText: string;
  caption?: string;
  audioTrack?: string; // Path to audio file
  fadeIn?: boolean;
  fadeOut?: boolean;
}

/**
 * Add text overlay hook to video
 */
export async function addTextHook(options: TextOverlayOptions): Promise<string> {
  const {
    inputVideo,
    outputVideo,
    hookText,
    hookDuration = 3,
    fontSize = 60,
    fontColor = "white",
    backgroundColor = "black@0.7",
    position = "center",
  } = options;

  return new Promise((resolve, reject) => {
    // Position mapping
    const positions = {
      top: "x=(w-text_w)/2:y=100",
      center: "x=(w-text_w)/2:y=(h-text_h)/2",
      bottom: "x=(w-text_w)/2:y=h-text_h-100",
    };

    // FFmpeg drawtext filter
    const drawtext = `drawtext=text='${hookText.replace(/'/g, "\\'")}':` +
      `fontsize=${fontSize}:` +
      `fontcolor=${fontColor}:` +
      `${positions[position]}:` +
      `box=1:boxcolor=${backgroundColor}:boxborderw=10:` +
      `enable='between(t,0,${hookDuration})'`;

    ffmpeg(inputVideo)
      .videoFilters(drawtext)
      .outputOptions([
        "-c:v libx264",
        "-preset fast",
        "-crf 22",
        "-c:a copy",
      ])
      .output(outputVideo)
      .on("start", (cmd) => {
        console.log("FFmpeg command:", cmd);
      })
      .on("progress", (progress) => {
        console.log(`Processing: ${progress.percent?.toFixed(1) || 0}% done`);
      })
      .on("end", () => {
        console.log("✅ Text overlay added successfully");
        resolve(outputVideo);
      })
      .on("error", (err) => {
        console.error("❌ FFmpeg error:", err.message);
        reject(err);
      })
      .run();
  });
}

/**
 * Create complete viral video package
 * Combines: raw video + hook text + captions + audio
 */
export async function createVideoPackage(options: VideoPackageOptions): Promise<string> {
  const {
    rawVideo,
    outputVideo,
    hookText,
    caption,
    audioTrack,
    fadeIn = true,
    fadeOut = true,
  } = options;

  return new Promise((resolve, reject) => {
    let command = ffmpeg(rawVideo);

    // Build filter complex
    const filters: string[] = [];

    // Add hook text (first 3 seconds)
    const hookFilter = `drawtext=text='${hookText.replace(/'/g, "\\'")}':` +
      `fontsize=70:fontcolor=white:` +
      `x=(w-text_w)/2:y=150:` +
      `box=1:boxcolor=black@0.8:boxborderw=15:` +
      `enable='between(t,0,3)'`;
    filters.push(hookFilter);

    // Add caption text (bottom, always visible if provided)
    if (caption) {
      const captionFilter = `drawtext=text='${caption.replace(/'/g, "\\'")}':` +
        `fontsize=40:fontcolor=white:` +
        `x=(w-text_w)/2:y=h-text_h-150:` +
        `box=1:boxcolor=black@0.8:boxborderw=10`;
      filters.push(captionFilter);
    }

    // Add fade in/out
    if (fadeIn) {
      filters.push("fade=t=in:st=0:d=0.5");
    }
    if (fadeOut) {
      filters.push("fade=t=out:st=4.5:d=0.5"); // Assumes 5s video
    }

    // Apply filters
    if (filters.length > 0) {
      command = command.videoFilters(filters.join(","));
    }

    // Add audio track if provided
    if (audioTrack && fs.existsSync(audioTrack)) {
      command = command.input(audioTrack);
      command = command.complexFilter([
        "[0:a][1:a]amix=inputs=2:duration=shortest",
      ]);
    }

    // Output settings optimized for TikTok/Shorts
    command
      .outputOptions([
        "-c:v libx264",
        "-preset fast",
        "-crf 23",
        "-pix_fmt yuv420p",
        "-movflags +faststart",
        "-vf scale=1080:1920", // Force 9:16 aspect ratio
      ])
      .output(outputVideo)
      .on("start", (cmd) => {
        console.log("Creating video package...");
      })
      .on("progress", (progress) => {
        const percent = progress.percent?.toFixed(1) || 0;
        console.log(`Progress: ${percent}%`);
      })
      .on("end", () => {
        console.log("✅ Complete video package created!");
        resolve(outputVideo);
      })
      .on("error", (err) => {
        console.error("❌ Error creating video package:", err.message);
        reject(err);
      })
      .run();
  });
}

/**
 * Generate viral hook text based on category
 */
export function generateHookText(category: string, topic?: string): string {
  const hooks: Record<string, string[]> = {
    finance: [
      "This is how billionaires avoid taxes",
      "Why the rich get richer",
      "The secret banks don't want you to know",
      "How to make money while you sleep",
      "$1M in passive income",
    ],
    tech: [
      "This AI tool will replace your job",
      "The future is here",
      "Why everyone is switching to this",
      "This changes everything",
      "You're using this wrong",
    ],
    fitness: [
      "Lose 10 lbs in 30 days",
      "This one trick changed my body",
      "Stop doing this at the gym",
      "The secret to abs",
      "Why your workout isn't working",
    ],
    emotional: [
      "This hit different",
      "You need to see this",
      "This will make you cry",
      "The moment that changed everything",
      "Watch until the end",
    ],
    gaming: [
      "This is the best strategy",
      "You're playing this wrong",
      "Hidden secret unlocked",
      "Pro players use this",
      "Game-changing tip",
    ],
  };

  const categoryHooks = hooks[category] || hooks.finance;
  const randomHook = categoryHooks[Math.floor(Math.random() * categoryHooks.length)];

  return topic || randomHook;
}

/**
 * Batch process multiple videos
 */
export async function batchAddHooks(
  videos: { input: string; hookText: string }[]
): Promise<string[]> {
  const results: string[] = [];

  for (const video of videos) {
    const output = video.input.replace(".mp4", "_with_hook.mp4");

    try {
      await addTextHook({
        inputVideo: video.input,
        outputVideo: output,
        hookText: video.hookText,
      });
      results.push(output);
    } catch (error) {
      console.error(`Failed to process ${video.input}:`, error);
    }
  }

  return results;
}
