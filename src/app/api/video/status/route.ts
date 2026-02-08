/**
 * API Route: Check Video Generation Status
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    const { searchParams } = new URL(req.url);
    const conceptId = searchParams.get("conceptId");

    if (!conceptId) {
      return NextResponse.json(
        { error: "conceptId is required" },
        { status: 400 }
      );
    }

    // Find video by conceptId
    const video = await db.video.findFirst({
      where: {
        tenantId: user.tenantId,
        conceptId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!video) {
      return NextResponse.json({
        status: "not_started",
        message: "Video generation not started",
      });
    }

    return NextResponse.json({
      status: video.status,
      videoId: video.id,
      videoUrl: video.cdnUrl || video.videoUrl,
      provider: video.provider,
      generatedAt: video.generatedAt,
      duration: video.metadata ? (video.metadata as any).duration : null,
      cost: Number(video.generationCost),
      error: video.errorMessage,
    });
  } catch (error) {
    console.error("Video status check error:", error);
    return NextResponse.json(
      { error: "Failed to check video status" },
      { status: 500 }
    );
  }
}
