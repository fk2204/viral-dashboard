/**
 * Inngest Functions Export
 *
 * Centralized export of all Inngest job functions
 */

export { generateVideoFunction } from "./generate-video";
export { retryFailedJobsFunction } from "./retry-failed-jobs";
export { postToPlatformsFunction, retryFailedPostsFunction } from "./post-to-platforms";
export { trackPerformanceFunction, batchTrackPerformanceFunction } from "./track-performance";

// Export array for Inngest serve endpoint
export const inngestFunctions = [
  generateVideoFunction,
  retryFailedJobsFunction,
  postToPlatformsFunction,
  retryFailedPostsFunction,
  trackPerformanceFunction,
  batchTrackPerformanceFunction,
];
