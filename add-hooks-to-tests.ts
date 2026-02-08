/**
 * Add Text Hooks to Test Videos
 * Takes the 5 raw Luma videos and adds viral hooks
 */

import { addTextHook, createVideoPackage } from "./src/lib/video-post-processing/add-text-overlay";

const testVideos = [
  {
    input: "test_video_1.mp4",
    output: "test_video_1_final.mp4",
    hookText: "This is how the rich make money",
    caption: "💰 Watch carefully...",
  },
  {
    input: "test_video_2.mp4",
    output: "test_video_2_final.mp4",
    hookText: "The billion dollar secret",
    caption: "🔥 Most people miss this",
  },
  {
    input: "test_video_3.mp4",
    output: "test_video_3_final.mp4",
    hookText: "Your portfolio is doing this wrong",
    caption: "📈 Pro traders know this",
  },
  {
    input: "test_video_4.mp4",
    output: "test_video_4_final.mp4",
    hookText: "This view costs $10M",
    caption: "🌴 Billionaire lifestyle",
  },
  {
    input: "test_video_5.mp4",
    output: "test_video_5_final.mp4",
    hookText: "How millionaires really spend",
    caption: "💎 Inside look",
  },
];

async function processAllVideos() {
  console.log("🎬 Adding Viral Hooks to Test Videos");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  for (let i = 0; i < testVideos.length; i++) {
    const video = testVideos[i];
    console.log(`\n[${i + 1}/${testVideos.length}] Processing: ${video.input}`);
    console.log(`Hook: "${video.hookText}"`);
    console.log(`Caption: "${video.caption}"`);

    try {
      await createVideoPackage({
        rawVideo: video.input,
        outputVideo: video.output,
        hookText: video.hookText,
        caption: video.caption,
        fadeIn: true,
        fadeOut: true,
      });

      console.log(`✅ Saved: ${video.output}\n`);
    } catch (error) {
      console.error(`❌ Failed: ${error}\n`);
    }
  }

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("COMPLETE VIDEO PACKAGES READY");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  console.log("Final videos with hooks:");
  testVideos.forEach((v, i) => {
    console.log(`${i + 1}. ${v.output} - "${v.hookText}"`);
  });
  console.log("\nThese are now COMPLETE viral videos ready to post!");
  console.log("\nNext steps:");
  console.log("1. Watch the _final.mp4 versions");
  console.log("2. Re-score quality (should be higher with hooks)");
  console.log("3. Post best ones to YouTube/TikTok");
  console.log("");
}

processAllVideos().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
