/**
 * Inngest Client - Job Queue for Video Generation
 *
 * Handles async video generation, retries, and error recovery
 */

import { Inngest, EventSchemas } from "inngest";

// Define event schemas for type safety
type Events = {
  "video/generate": {
    data: {
      conceptId: string;
      tenantId: string;
      category: string;
      platform: "tiktok" | "youtube-shorts" | "instagram-reels";
      soraPrompt: string;
      veoPrompt: string;
      priority: number;
    };
  };
  "video/completed": {
    data: {
      videoId: string;
      conceptId: string;
      tenantId: string;
      videoUrl: string;
      cdnUrl: string;
      provider: string;
      duration: number;
    };
  };
  "video/failed": {
    data: {
      conceptId: string;
      tenantId: string;
      error: string;
      provider: string;
      attempt: number;
    };
  };
  "video/quality-check": {
    data: {
      videoId: string;
      videoUrl: string;
    };
  };
  "video/ready": {
    data: {
      videoId: string;
      tenantId: string;
      conceptId: string;
      category: string;
      platforms: ("tiktok" | "youtube" | "instagram")[];
      caption: string;
      hashtags: string[];
    };
  };
  "analytics/scrape": {
    data: {
      videoId: string;
      conceptId: string;
      platforms: string[];
    };
  };
};

export const inngest = new Inngest({
  id: "viral-dashboard",
  name: "Viral Dashboard",
  schemas: new EventSchemas().fromRecord<Events>(),
});
