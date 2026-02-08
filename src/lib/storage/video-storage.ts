/**
 * Video Storage - AWS S3 + CloudFront CDN
 *
 * Handles video upload, storage, and CDN distribution
 */

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET || "viral-videos";
const CLOUDFRONT_DOMAIN = process.env.CLOUDFRONT_DOMAIN;

export interface UploadResult {
  success: boolean;
  s3Url: string;
  cdnUrl?: string;
  key: string;
  error?: string;
}

/**
 * Upload video to S3
 */
export async function uploadVideo(
  videoBuffer: Buffer,
  fileName: string,
  metadata?: Record<string, string>
): Promise<UploadResult> {
  try {
    const key = `videos/${Date.now()}_${fileName}`;

    const upload = new Upload({
      client: s3Client,
      params: {
        Bucket: BUCKET_NAME,
        Key: key,
        Body: videoBuffer,
        ContentType: "video/mp4",
        Metadata: metadata || {},
        // Public read access for CDN
        ACL: "public-read",
      },
    });

    await upload.done();

    const s3Url = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || "us-east-1"}.amazonaws.com/${key}`;
    const cdnUrl = CLOUDFRONT_DOMAIN ? `https://${CLOUDFRONT_DOMAIN}/${key}` : undefined;

    return {
      success: true,
      s3Url,
      cdnUrl,
      key,
    };
  } catch (error) {
    console.error("Video upload error:", error);
    return {
      success: false,
      s3Url: "",
      key: "",
      error: error instanceof Error ? error.message : "Upload failed",
    };
  }
}

/**
 * Upload video from URL
 */
export async function uploadVideoFromUrl(
  videoUrl: string,
  fileName: string,
  metadata?: Record<string, string>
): Promise<UploadResult> {
  try {
    // Download video from URL
    const response = await fetch(videoUrl);
    if (!response.ok) {
      throw new Error(`Failed to download video: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to S3
    return uploadVideo(buffer, fileName, metadata);
  } catch (error) {
    console.error("Video upload from URL error:", error);
    return {
      success: false,
      s3Url: "",
      key: "",
      error: error instanceof Error ? error.message : "Upload failed",
    };
  }
}

/**
 * Get signed URL for private video access
 */
export async function getSignedVideoUrl(key: string, expiresIn: number = 3600): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  return getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Delete video from S3
 */
export async function deleteVideo(key: string): Promise<boolean> {
  try {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    await s3Client.send(command);
    return true;
  } catch (error) {
    console.error("Video deletion error:", error);
    return false;
  }
}

/**
 * Generate CDN URL from S3 key
 */
export function getCdnUrl(key: string): string {
  if (CLOUDFRONT_DOMAIN) {
    return `https://${CLOUDFRONT_DOMAIN}/${key}`;
  }

  // Fallback to S3 URL
  return `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || "us-east-1"}.amazonaws.com/${key}`;
}

/**
 * Check if S3 is configured
 */
export function isS3Configured(): boolean {
  return !!(
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY &&
    process.env.AWS_S3_BUCKET
  );
}
